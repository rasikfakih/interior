import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { fetchProposalVisuals } from "@/lib/portal";
import { getStudioBrand } from "@/lib/studio-brand";
import { resolveThemeFull } from "@/lib/theme";
import {
  parseContentJson,
  proposalDto,
  type ProposalPublicDto,
} from "@/lib/proposals";

/**
 * PUBLIC proposal fetch by share token - no auth, by design. The link
 * is the permission. The GET doubles as the view beacon: viewed_count
 * increments, viewed_at stamps the first view, and status advances
 * sent -> viewed so the studio sees engagement. tenant_id is never
 * returned; the brand block carries the resolved studio identity.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }
  await ensureMigrated();

  const proposal = await pgOne<Record<string, unknown>>(
    `SELECT * FROM proposals WHERE token = $1 LIMIT 1`,
    [token]
  );
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  // Tracking: increment the view count, stamp first view, advance
  // sent -> viewed. Runs in a tx and RETURNING the fresh row so the
  // DTO below reflects the updated values, not the pre-view state.
  const tracked =
    (await withPgTx(async (client) => {
      const res = await client.query(
        `UPDATE proposals
         SET viewed_count = viewed_count + 1,
             viewed_at = CASE WHEN viewed_at IS NULL THEN CURRENT_TIMESTAMP ELSE viewed_at END,
             status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
         WHERE token = $1
         RETURNING *`,
        [token]
      );
      return res.rows?.[0];
    })) ?? proposal;

  const [projectRow, leadRow, tenantRow] = await Promise.all([
    pgOne<Record<string, unknown>>(
      `SELECT * FROM client_projects WHERE id = $1 LIMIT 1`,
      [tracked.project_id]
    ),
    tracked.lead_id != null
      ? pgOne<Record<string, unknown>>(
          `SELECT id, name, phone, email FROM leads WHERE id = $1 LIMIT 1`,
          [Number(tracked.lead_id)]
        )
      : Promise.resolve(null),
    pgOne<{ slug: string | null; domain: string | null; studio_name: string }>(
      `SELECT slug, domain, studio_name FROM tenants WHERE id = $1 LIMIT 1`,
      [Number(tracked.tenant_id)]
    ),
  ]);

  // Resolve the tenant brand: distro palette (theme engine), then the
  // file-based brand as fallback. The studio name prefers the distro's
  // brand_name, then the tenant row, then the shipped brand.
  let palette = { ink: "#122A20", paper: "#ECECE6", accent: "#C0964F", muted: "#56605A" };
  let distroName: string | null = null;
  try {
    const full = await resolveThemeFull(tenantRow?.domain ?? null, tenantRow?.slug ?? null);
    palette = full.palette as typeof palette;
    if (full.raw && typeof full.raw.brand_name === "string") {
      distroName = full.raw.brand_name;
    }
  } catch {
    // keep defaults
  }
  const fileBrand = getStudioBrand();
  const brandName = distroName || tenantRow?.studio_name || fileBrand.brand_name;

  const { tenantId: _omitTenant, ...publicProposal } = proposalDto(tracked);
  publicProposal.content = parseContentJson(tracked.content_json);
  const out: ProposalPublicDto = {
    proposal: publicProposal,
    project: projectRow
      ? {
          id: String(projectRow.id),
          name: String(projectRow.name ?? ""),
          clientName: projectRow.client_name == null ? null : String(projectRow.client_name),
          clientPhone: projectRow.client_phone == null ? null : String(projectRow.client_phone),
          clientEmail: projectRow.client_email == null ? null : String(projectRow.client_email),
          budget: projectRow.budget == null ? null : Number(projectRow.budget),
          areaSqft: projectRow.area_sqft == null ? null : Number(projectRow.area_sqft),
          address: projectRow.address == null ? null : String(projectRow.address),
          status: String(projectRow.status ?? "draft"),
          createdAt: projectRow.created_at == null ? null : String(projectRow.created_at),
        }
      : null,
    lead: leadRow
      ? {
          id: Number(leadRow.id),
          name: String(leadRow.name ?? ""),
          phone: leadRow.phone == null ? null : String(leadRow.phone),
          email: leadRow.email == null ? null : String(leadRow.email),
        }
      : null,
    brand: {
      name: brandName,
      address: fileBrand.studio_address,
      contactEmail: fileBrand.contact_email,
      contactPhone: fileBrand.contact_phone,
      palette,
    },
  };

  // Module 8: attach the selected boards + linked BOQ version so the
  // public proposal renders real visuals instead of placeholders.
  const content = parseContentJson(tracked.content_json);
  const boardIds = Array.isArray(content.boards)
    ? content.boards.map((b: unknown) => String(b)).filter(Boolean)
    : [];
  const visuals = await fetchProposalVisuals(
    String(tracked.project_id ?? ""),
    tracked.boq_version_id == null ? null : String(tracked.boq_version_id),
    boardIds,
    Number(tracked.tenant_id ?? 0)
  );
  out.boards = visuals.boards.map((b) => ({
    id: b.id,
    title: b.title,
    status: b.status,
    itemsCount: b.items.length,
    items: b.items.map((i) => ({
      id: i.id,
      x: i.x,
      y: i.y,
      w: i.w,
      h: i.h,
      rotation: i.rotation,
      zIndex: i.zIndex,
      note: i.note,
      material: i.material,
    })),
  }));
  out.boqVersion = visuals.boqVersion
    ? {
        id: visuals.boqVersion.id,
        versionNo: visuals.boqVersion.versionNo,
        title: visuals.boqVersion.title,
        status: visuals.boqVersion.status,
        total: visuals.boqVersion.total,
        items: visuals.boqVersion.items.map((i) => ({
          id: i.id,
          category: i.category,
          itemName: i.itemName,
          description: i.description,
          unit: i.unit,
          qty: i.qty,
          materialRate: i.materialRate,
          labourRate: i.labourRate,
          amount: i.amount,
          materialName: i.material?.name ?? null,
        })),
      }
    : null;

  return NextResponse.json(out);
}
