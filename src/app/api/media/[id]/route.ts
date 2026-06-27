import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ensureMigrated, pgOne } from '@/lib/pg';
import { remove as storageRemove } from '@/lib/storage';

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
      // 404 or transient - do not block row delete forever. Log.
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
