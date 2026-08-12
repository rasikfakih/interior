import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { listPageRevisions } from "@/lib/revisions";

/**
 * GET /api/pages/[id]/revisions - newest-first revision history for a
 * page (StudioOS Phase 1). Each entry carries id, saved_at and the
 * payload snapshot (meta + blocks).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  const { id } = await params;
  const pageId = Number(id);
  if (!Number.isFinite(pageId) || pageId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const revisions = await listPageRevisions(pageId);
  return NextResponse.json({
    revisions: revisions.map((r) => ({
      id: r.id,
      saved_at: r.saved_at,
      saved_by_id: r.saved_by_id,
      payload: r.payload,
    })),
  });
}
