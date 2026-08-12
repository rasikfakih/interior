import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { appendAudit } from "@/lib/license";
import { bump } from "@/lib/revalidate";
import { restorePageRevision } from "@/lib/revisions";

/**
 * POST /api/pages/[id]/revisions/[revId]/restore - apply a historical
 * snapshot's meta + blocks back onto the page, then snapshot the
 * restored state as the newest revision (StudioOS Phase 1).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; revId: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  const { id, revId } = await params;
  const pageId = Number(id);
  const revisionId = Number(revId);
  if (!Number.isFinite(pageId) || !Number.isFinite(revisionId) || pageId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const result = await restorePageRevision(pageId, revisionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await appendAudit("pages.restore", `pages#${pageId} restored from revision ${revisionId}`, {
    pageId,
    revisionId,
    role: gate.role,
  });

  const { pgOne } = await import("@/lib/pg");
  const pageRow = await pgOne<{ slug: string }>(
    `SELECT slug FROM pages WHERE id = $1`,
    [pageId]
  );
  bump({ kind: "pages", pageSlug: pageRow?.slug, slug: pageRow?.slug });

  return NextResponse.json({
    success: true,
    blocksRestored: result.restored?.blocks?.length ?? 0,
  });
}
