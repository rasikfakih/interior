import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ensureMigrated, pgOne } from '@/lib/pg';
import { remove as storageRemove } from '@/lib/storage';

/**
 * Phase 2 - PATCH /api/media/[id]
 *
 * Auth: signed-in NextAuth session required.
 *
 * Body: { alt?: string, original_name?: string, mime?: string }
 *
 * Updates mutable metadata fields only. The signed-upload URL
 * itself is immutable - use upload intent for new versions.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  try {
    const body = await req.json();
    await ensureMigrated();
    const updates: string[] = [];
    const args: unknown[] = [];
    let i = 1;
    if (typeof body.alt === 'string') {
      updates.push(`alt = $${i++}`);
      args.push(body.alt.slice(0, 500));
    }
    if (typeof body.original_name === 'string') {
      updates.push(`original_name = $${i++}`);
      args.push(body.original_name.slice(0, 255));
    }
    if (typeof body.mime === 'string') {
      updates.push(`mime = $${i++}`);
      args.push(body.mime.slice(0, 128));
    }
    if (updates.length === 0) {
      return NextResponse.json({ success: true, noop: true });
    }
    args.push(numericId);
    const q = await pgOne(
      `UPDATE media SET ${updates.join(', ')} WHERE id = $${i}
       RETURNING id, kind, mime, size, original_name, storage_path, url,
                 alt, width, height, created_at`,
      args
    );
    if (!q) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, row: q });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? 'update failed' },
      { status: 500 }
    );
  }
}

/**
 * Phase 2 - DELETE /api/media/[id]
 *
 * Auth: signed-in NextAuth session required.
 *
 * Removes the storage object first, then the media row. If
 * storage remove fails for non-404 reasons, the row stays:
 * the consumer can retry.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  try {
    await ensureMigrated();
    const row = await pgOne<{ storage_path: string }>(
      `SELECT storage_path FROM media WHERE id = $1 LIMIT 1`,
      [numericId]
    );
    if (!row) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    try {
      await storageRemove(row.storage_path);
    } catch (e: any) {
      console.error('[media/delete] storage remove:', e?.message);
    }
    await pgOne(
      `DELETE FROM media WHERE id = $1`,
      [numericId]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? 'delete failed' },
      { status: 500 }
    );
  }
}
