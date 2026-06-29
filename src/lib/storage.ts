/**
 * Storage abstraction for v1.1.2. Phase 2 ships with Supabase Storage
 * plus a local-disk fallback so a fresh project without Supabase
 * credentials can still upload, sign, and delete media; the
 * developer sets SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY when
 * they wire up Supabase Storage and the abstraction transparently
 * switches surfaces. This keeps the admin usable in environments
 * where the env wiring is not done yet (carried forward from
 * v1.1.0 cont/per README).
 *
 * Public surface (mirrors the prior shape):
 *   getStorageConfig()      - reads env once; returns mode | supabase
 *   signedPutUrl(path, ...) - returns upload signed URL + token
 *   signedGetUrl(path, ttl) - returns signed read URL OR a relative
 *                              local path that the browser can load
 *   remove(path)            - deletes object
 *   head(path)              - returns content metadata when reachable
 *
 * The local mode keeps the existing `/uploads/media/<path>` shape
 * that ship-as-public-asset consumers already expect.
 */
import fs from "fs/promises";
import path from "path";

export type StorageKind = "image" | "glb" | "video" | "pdf" | "raw";

export type StorageConfig = {
  mode: "local" | "supabase";
  baseUrl: string;
  serviceKey: string;
  bucket: string;
  publicBase: string;
};

let _cached: StorageConfig | null = null;

export function getStorageConfig(): StorageConfig {
  if (_cached) return _cached;
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "media";
  if (baseUrl && serviceKey) {
    _cached = {
      mode: "supabase",
      baseUrl: baseUrl.replace(/\/$/, ""),
      serviceKey,
      bucket,
      publicBase: `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}`,
    };
    return _cached;
  }
  // Local-disk fallback. When we don't have Supabase Storage, we
  // serve uploads from /uploads/media/<path> via the existing
  // public/uploads/media tree. The public-side assets folder is
  // shared between operator uploads (admin/media) and the bundled
  // demo JPGs (public/demo). Local mode is for environments where
  // the operator has not finished the Supabase wiring.
  _cached = {
    mode: "local",
    baseUrl: "",
    serviceKey: "",
    bucket: "",
    publicBase: "/uploads/media",
  };
  return _cached;
}

/**
 * Hard caps in bytes. Mirrored in scripts/smoke.mjs runtime
 * validity. If you change one, the use server UI surface must
 * agree.
 */
export const MAX_BYTES: Record<StorageKind, number> = {
  image: 8 * 1024 * 1024,
  glb: 25 * 1024 * 1024,
  video: 80 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
  raw: 50 * 1024 * 1024,
};

export function kindFromMime(mime: string): StorageKind {
  if (mime.startsWith("image/")) return "image";
  if (
    mime === "model/gltf-binary" ||
    mime === "model/gltf+json" ||
    mime.startsWith("model/")
  )
    return "glb";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "raw";
}

export type SignedUrlResult = {
  url: string;
  expiresIn: number;
  token?: string;
};

/**
 * Phase 2 - one-shot signed upload URL.
 *
 * In supabase mode: ask Supabase Storage REST for a token-bound
 * PUT URL. The client PUTs the file body directly to that URL
 * with the matching Authorization header.
 *
 * In local mode: the URL points at our own `/api/media/upload/local`
 * route which writes the bytes to `public/uploads/media/<path>`.
 */
export async function signedPutUrl(
  storagePath: string,
  contentType: string,
  contentLength: number
): Promise<SignedUrlResult> {
  const cfg = getStorageConfig();
  if (cfg.mode === "local") {
    const kind = kindFromMime(contentType);
    return {
      url: `/api/media/upload/local?path=${encodeURIComponent(storagePath)}&kind=${encodeURIComponent(kind)}`,
      expiresIn: 600,
      token: localUploadToken(storagePath, contentType, contentLength),
    };
  }
  const expSeconds = 600;
  const url = `${cfg.baseUrl}/storage/v1/object/sign/upload/${cfg.bucket}/${encodeURIComponent(storagePath).replace(/'/g, "%27")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: expSeconds }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `signedPutUrl failed (${res.status}): ${txt.slice(0, 200)}`
    );
  }
  const out = (await res.json()) as {
    url?: string;
    signedURL?: string;
    expiresIn?: number;
    token?: string;
  };
  const signedURL = out.url ?? out.signedURL;
  if (!signedURL) throw new Error("signedPutUrl response missing url");
  return {
    url: signedURL,
    expiresIn: out.expiresIn ?? expSeconds,
    token: out.token,
  };
}

function localUploadToken(
  storagePath: string,
  mime: string,
  size: number
): string {
  // Token = base64({path,mime,size}). Used only as an opaque
  // pointer for the upload receiver; the route does not currently
  // enforce it (sent for parity with supabase-mode shape).
  return Buffer.from(JSON.stringify({ storagePath, mime, size })).toString(
    "base64"
  );
}

/**
 * Phase 2 - read URL for an existing media row.
 *
 * In supabase mode: ask Supabase Storage REST for a short-lived
 * signed read URL.
 *
 * In local mode: return the public path. The browser can fetch
 * it directly because the file lives under /public/uploads/.
 */
export async function signedGetUrl(
  storagePath: string,
  _ttlSeconds = 600
): Promise<SignedUrlResult> {
  const cfg = getStorageConfig();
  if (cfg.mode === "local") {
    return {
      url: `${cfg.publicBase}/${storagePath}`.replace(/\/+/g, "/").replace(
        /^\//,
        "/"
      ),
      expiresIn: _ttlSeconds,
    };
  }
  const url = `${cfg.baseUrl}/storage/v1/object/sign/${cfg.bucket}/${encodeURIComponent(storagePath).replace(/'/g, "%27")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: _ttlSeconds }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `signedGetUrl failed (${res.status}): ${txt.slice(0, 200)}`
    );
  }
  const out = (await res.json()) as { signedURL?: string; expiresIn?: number };
  if (!out.signedURL) throw new Error("signedGetUrl response missing signedURL");
  return {
    url: out.signedURL,
    expiresIn: out.expiresIn ?? _ttlSeconds,
  };
}

export async function remove(storagePath: string): Promise<void> {
  const cfg = getStorageConfig();
  if (cfg.mode === "local") {
    const target = path.join(process.cwd(), "public", "uploads", "media", storagePath);
    await fs.rm(target, { force: true });
    return;
  }
  const url = `${cfg.baseUrl}/storage/v1/object/${cfg.bucket}/${encodeURIComponent(storagePath).replace(/'/g, "%27")}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${cfg.serviceKey}` },
  });
  if (!res.ok && res.status !== 404) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `storage remove failed (${res.status}): ${txt.slice(0, 200)}`
    );
  }
}

export type HeadResult =
  | { ok: true; contentType: string; contentLength: number }
  | { ok: false };

export async function head(storagePath: string): Promise<HeadResult> {
  const cfg = getStorageConfig();
  if (cfg.mode === "local") {
    try {
      const target = path.join(process.cwd(), "public", "uploads", "media", storagePath);
      const stat = await fs.stat(target);
      return {
        ok: true,
        contentType: "application/octet-stream",
        contentLength: stat.size,
      };
    } catch {
      return { ok: false };
    }
  }
  const url = `${cfg.baseUrl}/storage/v1/object/info/${cfg.bucket}/${encodeURIComponent(storagePath).replace(/'/g, "%27")}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${cfg.serviceKey}` },
  });
  if (!res.ok) return { ok: false };
  const meta = (await res.json()) as {
    contentType?: string;
    contentLength?: number;
    size?: number;
  };
  return {
    ok: true,
    contentType: meta.contentType ?? "application/octet-stream",
    contentLength: Number(meta.contentLength ?? meta.size ?? 0),
  };
}

/**
 * Local-mode upload sink. The route writes the bytes to disk and
 * returns a path mirror so the row in `media` carries the public
 * URL.
 */
export async function localWrite(storagePath: string, body: Buffer): Promise<void> {
  const target = path.join(process.cwd(), "public", "uploads", "media", storagePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
}
