/**
 * Storage abstraction for v1.1.2. Phase 2 ships with Supabase Storage
 * plus a local-disk fallback so a fresh project without Supabase
 * credentials can still upload, sign, and delete media.
 *
 * Supabase mode uses the official @supabase/supabase-js SDK. This is
 * required because Supabase now issues new-format keys
 * (sb_secret_... / sb_publishable_...) that are NOT accepted as raw
 * `Authorization: Bearer` tokens on the Storage REST API ("Invalid
 * Compact JWS"). The SDK signs requests correctly for both key
 * formats. Local mode keeps the existing /uploads/media disk path.
 *
 * Public surface (unchanged, mirrors the prior shape):
 *   getStorageConfig()      - reads env once; returns mode | supabase
 *   signedPutUrl(path, ...) - returns upload signed URL + token
 *   signedGetUrl(path, ttl) - returns signed read URL OR a relative
 *                              local path that the browser can load
 *   remove(path)            - deletes object
 *   head(path)              - returns content metadata when reachable
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
let _client: SupabaseClient | null = null;

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
  // public/uploads/media tree.
  _cached = {
    mode: "local",
    baseUrl: "",
    serviceKey: "",
    bucket: "",
    publicBase: "/uploads/media",
  };
  return _cached;
}

function getClient(): SupabaseClient {
  if (_client) return _client;
  const cfg = getStorageConfig();
  _client = createClient(cfg.baseUrl, cfg.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
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
 * Ensure the configured bucket exists (best-effort). Only the
 * service/secret key can create buckets; the publishable key cannot,
 * so a 4xx here is swallowed and the caller surfaces the real error
 * from the subsequent signed-URL call.
 */
async function ensureBucket(): Promise<void> {
  const cfg = getStorageConfig();
  if (cfg.mode !== "supabase") return;
  const { error: listErr } = await getClient().storage.getBucket(cfg.bucket);
  if (!listErr) return;
  await getClient().storage.createBucket(cfg.bucket, { public: false });
}

/**
 * Phase 2 - one-shot signed upload URL.
 *
 * In supabase mode: ask the SDK for a token-bound signed upload URL.
 * The client PUTs the file body directly to that URL.
 *
 * In local mode: the URL points at our own `/api/media/upload/local`
 * route which writes the bytes to the local scratch.
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
  await ensureBucket();
  const { data, error } = await getClient().storage
    .from(cfg.bucket)
    .createSignedUploadUrl(storagePath);
  if (error || !data?.signedUrl) {
    throw new Error(`signedPutUrl failed: ${error?.message ?? "no url"}`);
  }
  return {
    url: data.signedUrl,
    expiresIn: 600,
    token: data.token,
  };
}

function localUploadToken(
  storagePath: string,
  mime: string,
  size: number
): string {
  // Token = base64({path,mime,size}). Used only as an opaque
  // pointer for the upload receiver; not enforced.
  return Buffer.from(JSON.stringify({ storagePath, mime, size })).toString(
    "base64"
  );
}

/**
 * Phase 2 - read URL for an existing media row.
 *
 * In supabase mode: ask the SDK for a short-lived signed read URL.
 *
 * In local mode: return the public path.
 */
export async function signedGetUrl(
  storagePath: string,
  _ttlSeconds = 600
): Promise<SignedUrlResult> {
  const cfg = getStorageConfig();
  if (cfg.mode === "local") {
    return {
      url: localPublicPath(storagePath),
      expiresIn: _ttlSeconds,
    };
  }
  const { data, error } = await getClient().storage
    .from(cfg.bucket)
    .createSignedUrl(storagePath, _ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`signedGetUrl failed: ${error?.message ?? "no url"}`);
  }
  return {
    url: data.signedUrl,
    expiresIn: _ttlSeconds,
  };
}

export async function remove(storagePath: string): Promise<void> {
  const cfg = getStorageConfig();
  if (cfg.mode === "local") {
    // Try local scratch + bundled /public fallthrough
    const candidates = [
      pathFor(storagePath),
      path.join(process.cwd(), "public", "uploads", "media", storagePath),
    ];
    for (const p of candidates) {
      await fs.rm(p, { force: true });
    }
    return;
  }
  const { error } = await getClient().storage.from(cfg.bucket).remove([
    storagePath,
  ]);
  if (error && error.status && error.status !== 404 && error.status !== 400) {
    const { data: info } = await getClient().storage.from(cfg.bucket).info(
      storagePath
    );
    if (!info) {
      // object absent - treat as removed
      return;
    }
    throw new Error(`storage remove failed: ${error.message}`);
  }
}

export type HeadResult =
  | { ok: true; contentType: string; contentLength: number }
  | { ok: false };

export async function head(storagePath: string): Promise<HeadResult> {
  const cfg = getStorageConfig();
  if (cfg.mode === "local") {
    for (const p of [
      pathFor(storagePath),
      path.join(process.cwd(), "public", "uploads", "media", storagePath),
    ]) {
      try {
        const stat = await fs.stat(p);
        return {
          ok: true,
          contentType: "application/octet-stream",
          contentLength: stat.size,
        };
      } catch {
        /* try next candidate */
      }
    }
    return { ok: false };
  }
  const { data, error } = await getClient().storage.from(cfg.bucket).info(
    storagePath
  );
  if (error || !data) return { ok: false };
  return {
    ok: true,
    contentType: data.metadata?.mimetype ?? "application/octet-stream",
    contentLength: Number(data.metadata?.size ?? 0),
  };
}

/**
 * Local-mode sink for Phase 2 media uploads. Writes to a
 * writable scratch (default /tmp/etihad-uploads/media/<path>)
 * because Vercel's root filesystem is read-only.
 */
export async function localWrite(storagePath: string, body: Buffer): Promise<void> {
  const target = pathFor(storagePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
}

function localRoot(): string {
  return process.env.LOCAL_UPLOAD_ROOT || "/tmp/etihad-uploads";
}

function mediaRoot(): string {
  return path.join(localRoot(), "media");
}

function pathFor(storagePath: string): string {
  return path.join(mediaRoot(), storagePath);
}

/**
 * Path on the URL the browser can use to stream the bytes back.
 */
export function localPublicPath(storagePath: string): string {
  return `/api/uploads/local?path=${encodeURIComponent(storagePath)}`;
}

/**
 * Variant used by {@link localPublicPath}-reading consumers that
 * still expect `/uploads/media...`.
 */
export function localFsPath(storagePath: string): string {
  return pathFor(storagePath);
}
