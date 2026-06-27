import { NextRequest, NextResponse } from 'next/server';
import { ensureMigrated, pgOne } from '@/lib/pg';
import { signedGetUrl } from '@/lib/storage';

/**
 * Phase 2 - GET /api/media/[id]/sign
 *
 * Returns a short-lived signed URL for one media row. The
 * MediaGrid and MediaPicker call this when they want to render
 * a single thumbnail in their UI without burning their cache.
 *
 * NOTE: this route is intentionally not gated by NextAuth
 * because public marketing surface (home, projects, journal)
 * also wants to render images. The storage layer decides who
 * actually sees what; signed URLs are already scoped at the
 * bucket level. If the operator wants admin-only files, they
 * would put them in a separate bucket - that is a Phase 7+
 * decision.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }
    await ensureMigrated();
    const row = await pgOne<{ storage_path: string; kind: string }>(
      `SELECT storage_path, kind FROM media WHERE id = $1 LIMIT 1`,
      [numericId]
    );
    if (!row) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    const signed = await signedGetUrl(row.storage_path, 600);
    return NextResponse.json({
      url: signed.url,
      expiresIn: signed.expiresIn,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? 'sign failed' },
      { status: 500 }
    );
  }
}
