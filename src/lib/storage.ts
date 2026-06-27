/**
 * Supabase Storage abstraction for v1.1.2.
 *
 * Service-role-keyed. Never expose this surface to client.
 * Caller responsibilities:
 *   - Authentication of the NextAuth session at the route layer.
 *   - Per-kind caps validated before signedPutUrl().
 *   - MIME sniffing on the client OR backend before upload.
 *
 * Backend: HTTP against the Supabase Storage REST API using a
 * service-role Bearer token. Bucket name defaults to "media"
 * (operator can override via env).
 *
 * Surface:
 *   getStorageConfig()      - reads env once
 *   signedPutUrl(path, ...) - returns upload signed URL + token
 *   signedGetUrl(path, ttl) - returns signed read URL
 *   remove(path)            - deletes object
 *   head(path)              - returns ContentLength/ContentType when present
 *
 * Paths are operator-specific. Convention: '{kind}/{random}-{filename}'.
 *
 * The signed PUT returned by Supabase is one-shot: the same URL
 * accepts the file body once and goes away. The client must
 * read it back from /api/media/[id]/sign when it wants to render.
 */

let _cached: StorageConfig | null = null;

export type StorageConfig = {
  baseUrl: string;
  serviceKey: string;
  bucket: string;
};

export function getStorageConfig(): StorageConfig {
  if (_cached) return _cached;
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'media';
  if (!baseUrl) {
    throw new Error(
      'SUPABASE_URL is not set. Phase 2 storage requires it.'
    );
  }
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to use anon key for uploads.'
    );
  }
  _cached = { baseUrl: baseUrl.replace(/\/$/, ''), serviceKey, bucket };
  return _cached;
}

export type StorageKind = 'image' | 'glb' | 'video' | 'pdf' | 'raw';

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
  if (mime.startsWith('image/')) return 'image';
  if (
    mime === 'model/gltf-binary' ||
    mime === 'model/gltf+json' ||
    mime.startsWith('model/')
  ) return 'glb';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  return 'raw';
}

type SignedUrlResult = {
  url: string;
  expiresIn: number;
  token?: string;
};

/**
 * Asks Supabase for a one-shot signed upload URL.
 *
 * Supabase as of 2026 emits a token + a path; clients PUT/POST
 * the body to that path with Authorization: Bearer {token}.
 * We return both so the Next.js route can hand them forward.
 */
export async function signedPutUrl(
  storagePath: string,
  contentType: string,
  contentLength: number
): Promise<SignedUrlResult> {
  const { baseUrl, serviceKey, bucket } = getStorageConfig();
  const expSeconds = 600; // 10 min to upload
  const body = JSON.stringify({ expiresIn: expSeconds });
  const url = `${baseUrl}/storage/v1/object/sign/upload/${bucket}/${encodeURIComponent(storagePath).replace(/'/g, '%27')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(
      `signedPutUrl failed (${res.status}): ${txt.slice(0, 200)}`
    );
  }
  const out = (await res.json()) as { url?: string; signedURL?: string; expiresIn?: number; token?: string };
  // Supabase as of 2026 returns { signedURL, token, expiresIn }
  const signedURL = out.url ?? out.signedURL;
  if (!signedURL) {
    throw new Error('signedPutUrl response missing url');
  }
  return {
    url: signedURL,
    expiresIn: out.expiresIn ?? expSeconds,
    token: out.token,
  };
}

/** Supabase path -> absolute URL the client can POST/PUT to. */
export async function signedGetUrl(
  storagePath: string,
  ttlSeconds = 600
): Promise<SignedUrlResult> {
  const { baseUrl, serviceKey, bucket } = getStorageConfig();
  const url = `${baseUrl}/storage/v1/object/sign/${bucket}/${encodeURIComponent(storagePath).replace(/'/g, '%27')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: ttlSeconds }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(
      `signedGetUrl failed (${res.status}): ${txt.slice(0, 200)}`
    );
  }
  const out = (await res.json()) as { signedURL?: string; expiresIn?: number };
  if (!out.signedURL) throw new Error('signedGetUrl response missing signedURL');
  return {
    url: out.signedURL,
    expiresIn: out.expiresIn ?? ttlSeconds,
  };
}

export async function remove(storagePath: string): Promise<void> {
  const { baseUrl, serviceKey, bucket } = getStorageConfig();
  const url = `${baseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(storagePath).replace(/'/g, '%27')}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok && res.status !== 404) {
    const txt = await res.text().catch(() => '');
    throw new Error(
      `storage remove failed (${res.status}): ${txt.slice(0, 200)}`
    );
  }
}

export type HeadResult =
  | { ok: true; contentType: string; contentLength: number }
  | { ok: false };

export async function head(
  storagePath: string
): Promise<HeadResult> {
  const { baseUrl, serviceKey, bucket } = getStorageConfig();
  const url = `${baseUrl}/storage/v1/object/info/${bucket}/${encodeURIComponent(storagePath).replace(/'/g, '%27')}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return { ok: false };
  const meta = (await res.json()) as { contentType?: string; contentLength?: number; size?: number };
  return {
    ok: true,
    contentType: meta.contentType ?? 'application/octet-stream',
    contentLength: Number(meta.contentLength ?? meta.size ?? 0),
  };
}
