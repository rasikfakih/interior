import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ensureMigrated, pgMany } from '@/lib/pg';

/**
 * Phase 2 - GET /api/media/list
 *
 * Cursor pagination by id desc. Default limit 50; max 200.
 *
 * Auth: signed-in NextAuth session required.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind');
    const limitRaw = Number(url.searchParams.get('limit') ?? 50);
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 50));
    const cursorRaw = url.searchParams.get('before');
    const cursor = cursorRaw ? Number(cursorRaw) : null;

    await ensureMigrated();
    const rows = await pgMany<{
      id: number;
      kind: string;
      mime: string;
      size: number;
      original_name: string;
      storage_path: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      created_at: string | Date;
    }>(
      kind
        ? `SELECT id, kind, mime, size, original_name, storage_path, url,
                 alt, width, height, created_at
          FROM media
          WHERE kind = $1 AND ($2::int IS NULL OR id < $2)
          ORDER BY id DESC
          LIMIT $3`
        : `SELECT id, kind, mime, size, original_name, storage_path, url,
                 alt, width, height, created_at
          FROM media
          WHERE $1::int IS NULL OR id < $1
          ORDER BY id DESC
          LIMIT $2`,
      kind
        ? [kind, cursor, limit]
        : [cursor, limit]
    );
    return NextResponse.json({
      rows,
      nextBefore: rows.length === limit ? rows[rows.length - 1].id : null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? 'list failed' },
      { status: 500 }
    );
  }
}
