import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ensureMigrated, pgOne } from '@/lib/pg';
import {
  getStorageConfig,
  kindFromMime,
  MAX_BYTES,
  signedPutUrl,
  type StorageKind,
} from '@/lib/storage';

/**
 * Phase 2 - POST /api/media/upload
 *
 * Body: { filename: string, mime: string, size: number,
 *         kind?: StorageKind (server classifies if absent) }
 *
 * Response: { id, storagePath, uploadUrl, uploadToken,
 *             expiresIn }
 *
 * Cap based on declared kind. If `size` exceeds the cap,
 * reject 400 - saves the client a 60 MB POST that we know
 * will fail.
 *
 * Auth: requires a NextAuth session.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const filename = String(body?.filename || '').trim();
    const mime = String(body?.mime || '').trim().toLowerCase();
    const declaredKind: StorageKind | undefined =
      body?.kind && typeof body.kind === 'string'
        ? (body.kind as StorageKind)
        : undefined;
    const size = Number(body?.size);
    if (!filename) {
      return NextResponse.json({ error: 'filename required' }, { status: 400 });
    }
    if (!mime) {
      return NextResponse.json({ error: 'mime required' }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: 'size (bytes) required' }, { status: 400 });
    }
    const kind: StorageKind = declaredKind || kindFromMime(mime);
    const cap = MAX_BYTES[kind];
    if (size > cap) {
      return NextResponse.json(
        { error: `kind "${kind}" cap is ${cap} bytes; got ${size}` },
        { status: 400 }
      );
    }

    // Compose a storage path that buckets by kind and prevents
    // overwrites.
    const safe = filename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);
    const rand = Math.random().toString(36).slice(2, 10);
    const stamp = Date.now().toString(36);
    const storagePath = `${kind}/${stamp}-${rand}-${safe}`;

    // Sanity: storage config reachable
    getStorageConfig();

    const signed = await signedPutUrl(storagePath, mime, size);

    await ensureMigrated();
    const row = await pgOne<{
      id: number;
      storage_path: string;
      kind: string;
      mime: string;
      size: number;
      original_name: string;
      created_at: string;
    }>(
      `INSERT INTO media
         (kind, mime, size, original_name, storage_path, url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, storage_path, kind, mime, size,
                 original_name, created_at`,
      [
        kind,
        mime,
        size,
        filename.slice(0, 255),
        storagePath,
        signed.url,
      ]
    );
    if (!row) {
      return NextResponse.json(
        { error: 'media row insert failed' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      id: row.id,
      storagePath: row.storage_path,
      uploadUrl: signed.url,
      uploadToken: signed.token ?? null,
      expiresIn: signed.expiresIn,
      mime: row.mime,
      size: row.size,
      kind: row.kind,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? 'upload init failed' },
      { status: 500 }
    );
  }
}
