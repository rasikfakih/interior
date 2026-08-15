import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { resolveAdminTenantId } from "@/lib/theme";
import { checkPlan, planBlockedBody } from "@/lib/billing";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import {
  BOQ_ITEM_SELECT,
  calcItemAmount,
  mapBoqItem,
  mapBoqVersion,
  normalizeTemplateName,
  type BoqVersionDto,
} from "@/lib/boq";
import { loadBoqTemplate } from "@/lib/boq-template";

export const dynamic = "force-dynamic";

/**
 * POST /api/boq/generate-draft {client_project_id, template_name?}
 *   Creates the next version_no, seeds items from the template, links
 *   materials by category (lowest cost_per_unit for the tenant) and
 *   computes every amount + the version total in one transaction.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const clientProjectId = String(body.client_project_id ?? "").trim();
  if (!clientProjectId) {
    return NextResponse.json({ error: "client_project_id is required" }, { status: 400 });
  }
  const templateName = normalizeTemplateName(body.template_name ?? "2bhk");
  if (!templateName) {
    return NextResponse.json(
      { error: "invalid template_name (use 1bhk, 2bhk or 3bhk)" },
      { status: 400 }
    );
  }

  await ensureMigrated();
  const project = await pgOne<{ tenant_id: number }>(
    `SELECT tenant_id FROM client_projects WHERE id = $1 LIMIT 1`,
    [clientProjectId]
  );
  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });
  if (project.tenant_id !== tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Module 10: plan gate on the BOQ version limit.
  const gateRes = await checkPlan(tenantId, "boq_versions");
  if (!gateRes.allowed) {
    return NextResponse.json(planBlockedBody(gateRes), { status: gateRes.status });
  }

  // Cheapest material per category for the tenant (template links by
  // category, e.g. wood for the kitchen item). BOQ vocabulary differs
  // from the material library in one place: painting -> paint.
  const MATERIAL_CATEGORY_FOR: Record<string, string> = {
    painting: "paint",
    false_ceiling: "other",
  };
  const cheapest = await pgMany<Record<string, unknown>>(
    `SELECT m.category,
            m.id, m.name, m.cost_per_unit, m.unit, m.image_url
     FROM materials m
     WHERE m.tenant_id = $1
     ORDER BY m.cost_per_unit ASC`,
    [tenantId]
  );
  const cheapestByCategory = new Map<string, Record<string, unknown>>();
  for (const m of cheapest) {
    const cat = String(m.category ?? "other");
    if (!cheapestByCategory.has(cat)) cheapestByCategory.set(cat, m);
  }

  const template = await loadBoqTemplate(templateName);
  const versionId = crypto.randomUUID();

  const out = await withPgTx(async (client) => {
    const maxRow = await client.query(
      `SELECT COALESCE(MAX(version_no), 0) AS max_no
       FROM boq_versions WHERE client_project_id = $1`,
      [clientProjectId]
    );
    const versionNo = Number(maxRow.rows[0]?.max_no ?? 0) + 1;

    await client.query(
      `INSERT INTO boq_versions (id, tenant_id, client_project_id, version_no, title)
       VALUES ($1, $2, $3, $4, $5)`,
      [versionId, tenantId, clientProjectId, versionNo, `BOQ v${versionNo}`]
    );

    let total = 0;
    let order = 0;
    for (const group of template.categories) {
      const category = normalizeCategory(group.category);
      for (const t of group.items) {
        order++;
        // Try a category-linked material (lowest cost for the tenant).
        const wantCat =
          t.linked_material_category ??
          MATERIAL_CATEGORY_FOR[category] ??
          category;
        const matched = cheapestByCategory.get(wantCat) ?? null;
        const linkedMaterialId = matched ? String(matched.id) : null;
        const materialRate = matched
          ? Number(matched.cost_per_unit ?? 0)
          : Number(t.material_rate ?? 0);
        const amount = calcItemAmount(
          Number(t.qty ?? 1),
          materialRate,
          Number(t.labour_rate ?? 0),
          5,
          18
        );
        total += amount;
        await client.query(
          `INSERT INTO boq_items
             (id, boq_version_id, tenant_id, category, item_name, unit,
              qty, material_rate, labour_rate, wastage_pct, gst_pct,
              amount, linked_material_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            crypto.randomUUID(),
            versionId,
            tenantId,
            category,
            t.item_name,
            t.unit,
            Number(t.qty ?? 1),
            materialRate,
            Number(t.labour_rate ?? 0),
            5,
            18,
            amount,
            linkedMaterialId,
          ]
        );
      }
    }
    void order;

    total = Math.round(total * 100) / 100;
    await client.query(
      `UPDATE boq_versions SET total = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [total, versionId]
    );
  });

  const row = await pgOne<Record<string, unknown>>(
    `SELECT * FROM boq_versions WHERE id = $1 LIMIT 1`,
    [versionId]
  );
  const itemRows = await pgMany<Record<string, unknown>>(
    `${BOQ_ITEM_SELECT} WHERE bi.boq_version_id = $1 ORDER BY bi.created_at ASC`,
    [versionId]
  );
  const dto: BoqVersionDto | null = row
    ? { ...mapBoqVersion(row), items: itemRows.map((r) => mapBoqItem(r)) }
    : null;
  return NextResponse.json({ version: dto }, { status: 201 });
}

function normalizeCategory(raw: string): string {
  const allowed = [
    "civil", "carpentry", "electrical", "plumbing", "painting",
    "false_ceiling", "flooring", "soft_furnishing", "decor", "other",
  ];
  return allowed.includes(raw) ? raw : "other";
}
