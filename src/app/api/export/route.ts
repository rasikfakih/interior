import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { exportTenantContent } from "@/lib/content-export";
import { appendAudit } from "@/lib/license";

/**
 * GET /api/export - full tenant content export as a JSON attachment.
 * Admin-gated (editors are content-only and cannot download the whole
 * site). The envelope matches CONTENT_FORMAT so /api/import can restore
 * it on the same or another install.
 */
export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  if (gate.role === "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await exportTenantContent();
    const body = JSON.stringify(data, null, 2);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    await appendAudit("content.export", "full content export downloaded", {
      bytes: Buffer.byteLength(body),
      tables: Object.keys(data.tables).length,
    });
    return new NextResponse(body, {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="etihad-content-${stamp}.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
