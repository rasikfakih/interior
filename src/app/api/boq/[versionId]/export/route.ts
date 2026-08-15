import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { BOQ_ITEM_SELECT, boqCategoryLabel, mapBoqItem, mapBoqVersion } from "@/lib/boq";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ versionId: string }> };

/** GET /api/boq/[versionId]/export?format=json|csv */
export async function GET(req: NextRequest, { params }: Params) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { versionId } = await params;
  const format = (req.nextUrl.searchParams.get("format") ?? "json").toLowerCase();

  await ensureMigrated();
  const version = await pgOne<Record<string, unknown>>(
    `SELECT * FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  if (!version) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (Number(version.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const itemRows = await pgMany<Record<string, unknown>>(
    `${BOQ_ITEM_SELECT} WHERE bi.boq_version_id = $1 ORDER BY bi.created_at ASC`,
    [versionId]
  );
  const dto = { ...mapBoqVersion(version), items: itemRows.map((r) => mapBoqItem(r)) };

  if (format === "csv") {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["category", "item_name", "description", "unit", "qty",
      "material_rate", "labour_rate", "wastage_pct", "gst_pct", "amount"];
    const lines = [
      header.join(","),
      ...dto.items.map((i) =>
        [
          boqCategoryLabel(i.category),
          i.itemName,
          i.description ?? "",
          i.unit,
          i.qty,
          i.materialRate,
          i.labourRate,
          i.wastagePct,
          i.gstPct,
          i.amount,
        ]
          .map(esc)
          .join(",")
      ),
      "",
      `TOTAL,${dto.total}`,
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dto.title.replace(/[^\w-]/g, "_")}.csv"`,
      },
    });
  }

  return NextResponse.json({
    version: {
      id: dto.id,
      title: dto.title,
      versionNo: dto.versionNo,
      status: dto.status,
      total: dto.total,
      notes: dto.notes,
      clientProjectId: dto.clientProjectId,
    },
    items: dto.items,
  });
}
