/**
 * src/lib/portal.ts - Module 8 client portal shared surface.
 *
 * SERVER-ONLY (imports theme.ts / pg.ts). Resolves a client project
 * by its portal_token and returns every surface the portal renders:
 * project + brand, boards with items + material join, BOQ versions
 * with items, site logs with photos, snags, proposals, comments and
 * approvals. tenant_id is never returned - the brand block carries
 * the resolved studio identity (mirrors the public proposal API).
 *
 * The portal is token-authed: the share link is the permission, so it
 * works on the default host, a client- subdomain, and a tenant custom
 * domain alike. The proxy (src/proxy.ts) only tags portal hosts with
 * x-portal-host; resolution is always token-based here.
 */
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";
import { getStudioBrand } from "@/lib/studio-brand";
import { resolveThemeFull } from "@/lib/theme";
import { getTenantPlan } from "@/lib/billing";
import {
  mapBoard,
  mapBoardItem,
  materialFromItemRow,
  type BoardDto,
} from "@/lib/boards";
import {
  BOQ_ITEM_SELECT,
  formatMoney,
  mapBoqItem,
  mapBoqVersion,
  type BoqVersionDto,
} from "@/lib/boq";
import { parsePhotos, type SiteLogDto, type SnagDto } from "@/lib/site-diary";
import { clientProjectStatusLabel, proposalStatusLabel } from "@/lib/proposals";

const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 10-char portal token: 8 hex from a uuid + 2 random base chars. */
export function generatePortalToken(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  let tail = "";
  for (let i = 0; i < 2; i++) {
    tail += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)];
  }
  return hex + tail;
}

export type PortalBrand = {
  name: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  palette: { ink: string; paper: string; accent: string; muted: string };
  /** True when the request host matches tenants.custom_domain. */
  whiteLabel: boolean;
  customDomain: string | null;
  clientSubdomain: string | null;
};

export type PortalCommentDto = {
  id: string;
  author: "client" | "studio";
  message: string;
  createdAt: string | null;
};

export type PortalApprovalDto = {
  id: string;
  type: string;
  targetId: string;
  status: string;
  comment: string | null;
  createdAt: string | null;
};

export type PortalPayload = {
  project: {
    id: string;
    name: string;
    clientName: string | null;
    clientPhone: string | null;
    clientEmail: string | null;
    status: string;
    statusLabel: string;
    budget: number | null;
    areaSqft: number | null;
    address: string | null;
    portalToken: string;
    portalAccessCount: number;
    portalTokenCreatedAt: string | null;
    createdAt: string | null;
  };
  brand: PortalBrand;
  boards: BoardDto[];
  boqVersions: BoqVersionDto[];
  siteLogs: SiteLogDto[];
  snags: SnagDto[];
  proposals: {
    id: string;
    title: string;
    status: string;
    statusLabel: string;
    budget: number | null;
    createdAt: string | null;
  }[];
  comments: PortalCommentDto[];
  approvals: PortalApprovalDto[];
  stats: {
    boards: number;
    boqTotal: number;
    photos: number;
    openSnags: number;
    logs: number;
  };
};

function mapApproval(r: Record<string, unknown>): PortalApprovalDto {
  return {
    id: String(r.id),
    type: String(r.type ?? "board"),
    targetId: String(r.target_id ?? ""),
    status: String(r.status ?? "pending"),
    comment: r.comment == null ? null : String(r.comment),
    createdAt: r.created_at == null ? null : String(r.created_at),
  };
}

/**
 * Resolve everything the portal renders for a project by share token.
 * `track` increments portal_access_count (page renders track once;
 * the API also tracks). `host` is the request Host header used for
 * the white-label decision (custom_domain match).
 */
export async function fetchPortalData(
  token: string,
  opts: { track?: boolean; host?: string | null } = {}
): Promise<PortalPayload | null> {
  await ensureMigrated();
  const project = await pgOne<Record<string, unknown>>(
    `SELECT * FROM client_projects WHERE portal_token = $1 LIMIT 1`,
    [token]
  );
  if (!project) return null;
  const projectId = String(project.id);
  const tenantId = Number(project.tenant_id ?? 0);

  if (opts.track) {
    await withPgTx(async (client) => {
      await client.query(
        `UPDATE client_projects SET portal_access_count = portal_access_count + 1 WHERE id = $1`,
        [projectId]
      );
    });
  }

  const [tenantRow, boardRows, boqRows, logRows, snagRows, proposalRows, commentRows, approvalRows] =
    await Promise.all([
      pgOne<{
        id: number;
        slug: string | null;
        domain: string | null;
        studio_name: string | null;
        client_subdomain: string | null;
        custom_domain: string | null;
      }>(
        `SELECT id, slug, domain, studio_name, client_subdomain, custom_domain
         FROM tenants WHERE id = $1 LIMIT 1`,
        [tenantId]
      ),
      pgMany<Record<string, unknown>>(
        `SELECT b.id, b.title, b.status, b.created_at, b.updated_at,
                (SELECT COUNT(*) FROM board_items bi WHERE bi.board_id = b.id) AS items_count
         FROM boards b
         WHERE b.client_project_id = $1 AND b.tenant_id = $2
         ORDER BY b.updated_at DESC, b.created_at DESC`,
        [projectId, tenantId]
      ),
      pgMany<Record<string, unknown>>(
        `SELECT * FROM boq_versions
         WHERE client_project_id = $1 AND tenant_id = $2
         ORDER BY version_no DESC`,
        [projectId, tenantId]
      ),
      pgMany<Record<string, unknown>>(
        `SELECT id, tenant_id, client_project_id, log_date, photos,
                labour_count, work_done, voice_transcript, weather,
                created_by, created_at
         FROM site_logs
         WHERE client_project_id = $1 AND tenant_id = $2
         ORDER BY log_date DESC, created_at DESC`,
        [projectId, tenantId]
      ),
      pgMany<Record<string, unknown>>(
        `SELECT id, description, status, priority, photo_url, assigned_to,
                created_at
         FROM snags
         WHERE client_project_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC`,
        [projectId, tenantId]
      ),
      pgMany<Record<string, unknown>>(
        `SELECT id, title, status, budget, created_at
         FROM proposals
         WHERE project_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC`,
        [projectId, tenantId]
      ),
      pgMany<Record<string, unknown>>(
        `SELECT * FROM client_comments
         WHERE client_project_id = $1 AND tenant_id = $2
         ORDER BY created_at ASC`,
        [projectId, tenantId]
      ),
      pgMany<Record<string, unknown>>(
        `SELECT * FROM client_portal_approvals
         WHERE client_project_id = $1 AND portal_token = $2
         ORDER BY created_at DESC`,
        [projectId, token]
      ),
    ]);

  // Boards with items (material joined, same aliasing as the admin API).
  const boards: BoardDto[] = [];
  for (const br of boardRows) {
    const itemRows = await pgMany<Record<string, unknown>>(
      `SELECT bi.*,
              m.id AS m_id, m.name AS m_name, m.image_url AS m_image_url,
              m.cost_per_unit AS m_cost_per_unit, m.unit AS m_unit,
              m.category AS m_category
       FROM board_items bi
       LEFT JOIN materials m ON m.id = bi.material_id
       WHERE bi.board_id = $1
       ORDER BY bi.z_index ASC, bi.created_at ASC`,
      [String(br.id)]
    );
    boards.push(
      mapBoard(br, itemRows.map((r) => mapBoardItem(r, materialFromItemRow(r))))
    );
  }

  // BOQ versions with items (approved preferred by the UI).
  const boqVersions: BoqVersionDto[] = [];
  for (const vr of boqRows) {
    const itemRows = await pgMany<Record<string, unknown>>(
      `${BOQ_ITEM_SELECT} WHERE bi.boq_version_id = $1 ORDER BY bi.created_at ASC`,
      [String(vr.id)]
    );
    boqVersions.push(mapBoqVersion(vr, itemRows.map(mapBoqItem)));
  }

  // Brand resolution: distro palette, then file brand fallback.
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
  const host = opts.host ? opts.host.replace(/^https?:\/\//, "").split(":")[0] : null;
  const customDomain = tenantRow?.custom_domain ?? null;
  // Module 10: the footer hides only when the plan pays for white-label
  // AND the portal is served on the tenant's own custom domain.
  let planAllowsWhiteLabel = false;
  try {
    const plan = await getTenantPlan(Number(tenantRow?.id ?? 0));
    planAllowsWhiteLabel = plan.features.white_label;
  } catch {
    planAllowsWhiteLabel = false;
  }
  const whiteLabel =
    planAllowsWhiteLabel &&
    customDomain != null &&
    host != null &&
    host.toLowerCase() === customDomain.toLowerCase();

  const siteLogs: SiteLogDto[] = logRows.map((r) => ({
    id: String(r.id),
    tenantId: Number(r.tenant_id ?? 0),
    clientProjectId: String(r.client_project_id ?? ""),
    logDate: r.log_date == null ? null : String(r.log_date),
    photos: parsePhotos(r.photos),
    labourCount: Number(r.labour_count ?? 0),
    workDone: r.work_done == null ? null : String(r.work_done),
    voiceTranscript: r.voice_transcript == null ? null : String(r.voice_transcript),
    weather: r.weather == null ? null : String(r.weather),
    createdBy: r.created_by == null ? null : String(r.created_by),
    createdAt: r.created_at == null ? null : String(r.created_at),
  }));
  const snags: SnagDto[] = snagRows.map((r) => ({
    id: String(r.id),
    tenantId: Number(r.tenant_id ?? 0),
    clientProjectId: String(r.client_project_id ?? ""),
    siteLogId: null,
    logDate: null,
    photoUrl: r.photo_url == null ? null : String(r.photo_url),
    description: String(r.description ?? ""),
    status: String(r.status ?? "open"),
    assignedTo: r.assigned_to == null ? null : String(r.assigned_to),
    priority: String(r.priority ?? "medium"),
    fixedAt: null,
    verifiedAt: null,
    createdAt: r.created_at == null ? null : String(r.created_at),
  }));

  const approvedBoq = boqVersions.find((v) => v.status === "approved") ?? boqVersions[0];
  const photoCount = siteLogs.reduce((sum, l) => sum + l.photos.length, 0);

  return {
    project: {
      id: projectId,
      name: String(project.name ?? ""),
      clientName: project.client_name == null ? null : String(project.client_name),
      clientPhone: project.client_phone == null ? null : String(project.client_phone),
      clientEmail: project.client_email == null ? null : String(project.client_email),
      status: String(project.status ?? "draft"),
      statusLabel: clientProjectStatusLabel(String(project.status ?? "draft")),
      budget: project.budget == null ? null : Number(project.budget),
      areaSqft: project.area_sqft == null ? null : Number(project.area_sqft),
      address: project.address == null ? null : String(project.address),
      portalToken: token,
      portalAccessCount: Number(project.portal_access_count ?? 0) + (opts.track ? 1 : 0),
      portalTokenCreatedAt:
        project.portal_token_created_at == null ? null : String(project.portal_token_created_at),
      createdAt: project.created_at == null ? null : String(project.created_at),
    },
    brand: {
      name: distroName || tenantRow?.studio_name || fileBrand.brand_name,
      address: fileBrand.studio_address,
      contactEmail: fileBrand.contact_email,
      contactPhone: fileBrand.contact_phone,
      palette,
      whiteLabel,
      customDomain,
      clientSubdomain: tenantRow?.client_subdomain ?? null,
    },
    boards,
    boqVersions,
    siteLogs,
    snags,
    proposals: proposalRows.map((r) => ({
      id: String(r.id),
      title: String(r.title ?? "Project Proposal"),
      status: String(r.status ?? "draft"),
      statusLabel: proposalStatusLabel(String(r.status ?? "draft")),
      budget: r.budget == null ? null : Number(r.budget),
      createdAt: r.created_at == null ? null : String(r.created_at),
    })),
    comments: commentRows.map((r) => ({
      id: String(r.id),
      author: (String(r.author ?? "client") === "studio" ? "studio" : "client") as "client" | "studio",
      message: String(r.message ?? ""),
      createdAt: r.created_at == null ? null : String(r.created_at),
    })),
    approvals: approvalRows.map(mapApproval),
    stats: {
      boards: boards.length,
      boqTotal: approvedBoq?.total ?? 0,
      photos: photoCount,
      openSnags: snags.filter((s) => s.status === "open").length,
      logs: siteLogs.length,
    },
  };
}

/** Compact display helper shared by the portal + admin pages. */
export function formatPortalBudget(raw: number | null | undefined): string {
  if (raw == null || !Number.isFinite(Number(raw)) || Number(raw) <= 0) return "-";
  return formatMoney(raw);
}

/**
 * Visual payload for the public proposal: the boards selected in
 * proposals.content_json.boards (with items + material join) and the
 * BOQ version referenced by proposals.boq_version_id (with items).
 * All targets are verified against project + tenant so a tampered id
 * simply yields an empty result instead of leaking other tenants.
 */
export async function fetchProposalVisuals(
  projectId: string,
  boqVersionId: string | null,
  boardIds: string[],
  tenantId: number
): Promise<{ boards: BoardDto[]; boqVersion: BoqVersionDto | null }> {
  await ensureMigrated();
  const boards: BoardDto[] = [];
  const uniqueBoardIds = [...new Set(boardIds)].slice(0, 12);
  for (const boardId of uniqueBoardIds) {
    const br = await pgOne<Record<string, unknown>>(
      `SELECT b.*,
              (SELECT COUNT(*) FROM board_items bi WHERE bi.board_id = b.id) AS items_count
       FROM boards b
       WHERE b.id = $1 AND b.client_project_id = $2 AND b.tenant_id = $3 LIMIT 1`,
      [boardId, projectId, tenantId]
    );
    if (!br) continue;
    const itemRows = await pgMany<Record<string, unknown>>(
      `SELECT bi.*,
              m.id AS m_id, m.name AS m_name, m.image_url AS m_image_url,
              m.cost_per_unit AS m_cost_per_unit, m.unit AS m_unit,
              m.category AS m_category
       FROM board_items bi
       LEFT JOIN materials m ON m.id = bi.material_id
       WHERE bi.board_id = $1
       ORDER BY bi.z_index ASC, bi.created_at ASC`,
      [boardId]
    );
    boards.push(
      mapBoard(br, itemRows.map((r) => mapBoardItem(r, materialFromItemRow(r))))
    );
  }

  let boqVersion: BoqVersionDto | null = null;
  if (boqVersionId) {
    const vr = await pgOne<Record<string, unknown>>(
      `SELECT * FROM boq_versions
       WHERE id = $1 AND client_project_id = $2 AND tenant_id = $3 LIMIT 1`,
      [boqVersionId, projectId, tenantId]
    );
    if (vr) {
      const itemRows = await pgMany<Record<string, unknown>>(
        `${BOQ_ITEM_SELECT} WHERE bi.boq_version_id = $1 ORDER BY bi.created_at ASC`,
        [boqVersionId]
      );
      boqVersion = mapBoqVersion(vr, itemRows.map(mapBoqItem));
    }
  }
  return { boards, boqVersion };
}
