import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { mapBoqVersion } from "@/lib/boq";

export const dynamic = "force-dynamic";

/** GET /api/boq?client_project_id= - versions with item count + total. */
export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }

  const clientProjectId = req.nextUrl.searchParams.get("client_project_id");
  if (!clientProjectId) {
    return NextResponse.json({ error: "client_project_id is required" }, { status: 400 });
  }

  await ensureMigrated();
  const rows = await pgMany<Record<string, unknown>>(
    `SELECT v.*, COUNT(i.id) AS items_count
     FROM boq_versions v
     LEFT JOIN boq_items i ON i.boq_version_id = v.id
     WHERE v.tenant_id = $1 AND v.client_project_id = $2
     GROUP BY v.id
     ORDER BY v.version_no DESC`,
    [tenantId, clientProjectId]
  );
  return NextResponse.json({ versions: rows.map((r) => mapBoqVersion(r)) });
}
