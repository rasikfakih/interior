import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { issuePreviewToken } from "@/lib/revisions";

/**
 * POST /api/pages/[id]/preview - issue a short-lived signed token for
 * the draft-preview route (/preview?token=...). The public preview
 * route renders the page regardless of status under a banner.
 */
export async function POST(
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
  const token = issuePreviewToken(pageId);
  return NextResponse.json({
    success: true,
    url: `/preview?token=${encodeURIComponent(token)}`,
  });
}
