/**
 * src/lib/proposals.ts
 *
 * Shared constants + normalization for Module 3: client engagements
 * (client_projects) and proposal documents with public share tokens.
 * The tables are named client_projects because the portfolio CMS
 * already owns `projects` (id SERIAL, slug, title...).
 *
 * Status funnels:
 *   client_projects: draft -> design -> execution -> handover ->
 *                    delivered
 *   proposals:       draft -> sent -> viewed -> approved
 */

export const CLIENT_PROJECT_STATUSES = [
  "draft",
  "design",
  "execution",
  "handover",
  "delivered",
] as const;
export type ClientProjectStatus = (typeof CLIENT_PROJECT_STATUSES)[number];

export const PROPOSAL_STATUSES = ["draft", "sent", "viewed", "approved"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

const PROJECT_STATUS_LABELS: Record<ClientProjectStatus, string> = {
  draft: "Draft",
  design: "Design",
  execution: "Execution",
  handover: "Handover",
  delivered: "Delivered",
};

const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  approved: "Approved",
};

/** Default proposal content shape (stored as content_json). */
export type ProposalContent = {
  clientName?: string;
  projectName?: string;
  scope?: string[];
  terms?: string;
  notes?: string;
  /** Module 5 - board ids selected for the public proposal visuals. */
  boards?: string[];
  /** Module 6 - boq_version_id mirrored from proposals.boq_version_id. */
  boq_version_id?: string;
};

export type ClientProjectDto = {
  id: string;
  tenantId: number;
  leadId: number | null;
  name: string;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  status: string;
  budget: number | null;
  areaSqft: number | null;
  address: string | null;
  portalToken: string | null;
  createdAt: string | null;
  /** Joined from leads for list rows (admin only). */
  leadName?: string | null;
};

export type ProposalDto = {
  id: string;
  tenantId: number;
  projectId: string;
  leadId: number | null;
  token: string;
  title: string;
  budget: number | null;
  timelineText: string | null;
  content: ProposalContent;
  boqVersionId: string | null;
  status: string;
  viewedAt: string | null;
  viewedCount: number;
  acceptedAt: string | null;
  acceptedByName: string | null;
  createdAt: string | null;
};

export type ProposalPublicDto = {
  proposal: Omit<ProposalDto, "tenantId">;
  project: {
    id: string;
    name: string;
    clientName: string | null;
    clientPhone: string | null;
    clientEmail: string | null;
    budget: number | null;
    areaSqft: number | null;
    address: string | null;
    status: string;
    createdAt: string | null;
  } | null;
  lead: { id: number; name: string; phone: string | null; email: string | null } | null;
  brand: {
    name: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
    palette: { ink: string; paper: string; accent: string; muted: string };
  };
  /** Module 8: selected moodboards with items + material join. */
  boards?: {
    id: string;
    title: string;
    status: string;
    itemsCount: number;
    items: {
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      rotation: number;
      zIndex: number;
      note: string;
      material: {
        id: string;
        name: string;
        imageUrl: string | null;
        costPerUnit: number;
        unit: string;
        category: string;
      } | null;
    }[];
  }[];
  /** Module 8: the linked BOQ version with items. */
  boqVersion?: {
    id: string;
    versionNo: number;
    title: string;
    status: string;
    total: number;
    items: {
      id: string;
      category: string;
      itemName: string;
      description: string | null;
      unit: string;
      qty: number;
      materialRate: number;
      labourRate: number;
      amount: number;
      materialName: string | null;
    }[];
  } | null;
};

export function clientProjectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status as ClientProjectStatus] ?? status;
}

export function proposalStatusLabel(status: string): string {
  return PROPOSAL_STATUS_LABELS[status as ProposalStatus] ?? status;
}

export function normalizeClientProjectStatus(raw: unknown): ClientProjectStatus | null {
  const s = String(raw ?? "").trim();
  return (CLIENT_PROJECT_STATUSES as readonly string[]).includes(s)
    ? (s as ClientProjectStatus)
    : null;
}

export function normalizeProposalStatus(raw: unknown): ProposalStatus | null {
  const s = String(raw ?? "").trim();
  return (PROPOSAL_STATUSES as readonly string[]).includes(s)
    ? (s as ProposalStatus)
    : null;
}

/** Parse content_json: Postgres returns an object, SQLite a JSON string. */
export function parseContentJson(raw: unknown): ProposalContent {
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return p && typeof p === "object" ? (p as ProposalContent) : {};
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") return raw as ProposalContent;
  return {};
}

/** Map a client_projects row to its camelCase DTO (CURRENT_TIMESTAMP dates stay raw). */
export function clientProjectDto(row: Record<string, unknown>): ClientProjectDto {
  return {
    id: String(row.id ?? ""),
    tenantId: Number(row.tenant_id ?? 0),
    leadId: row.lead_id == null ? null : Number(row.lead_id),
    name: String(row.name ?? ""),
    clientName: row.client_name == null ? null : String(row.client_name),
    clientPhone: row.client_phone == null ? null : String(row.client_phone),
    clientEmail: row.client_email == null ? null : String(row.client_email),
    status: String(row.status ?? "draft"),
    budget: row.budget == null ? null : Number(row.budget),
    areaSqft: row.area_sqft == null ? null : Number(row.area_sqft),
    address: row.address == null ? null : String(row.address),
    portalToken: row.portal_token == null ? null : String(row.portal_token),
    createdAt: row.created_at == null ? null : String(row.created_at),
    leadName:
      row.lead_name == null ? undefined : row.lead_name === "" ? null : String(row.lead_name),
  };
}

/** Map a proposals row to its camelCase DTO. */
export function proposalDto(row: Record<string, unknown>): ProposalDto {
  return {
    id: String(row.id ?? ""),
    tenantId: Number(row.tenant_id ?? 0),
    projectId: String(row.project_id ?? ""),
    leadId: row.lead_id == null ? null : Number(row.lead_id),
    token: String(row.token ?? ""),
    title: String(row.title ?? "Project Proposal"),
    budget: row.budget == null ? null : Number(row.budget),
    timelineText: row.timeline_text == null ? null : String(row.timeline_text),
    content: parseContentJson(row.content_json),
    boqVersionId: row.boq_version_id == null ? null : String(row.boq_version_id),
    status: String(row.status ?? "draft"),
    viewedAt: row.viewed_at == null ? null : String(row.viewed_at),
    viewedCount: Number(row.viewed_count ?? 0),
    acceptedAt: row.accepted_at == null ? null : String(row.accepted_at),
    acceptedByName: row.accepted_by_name == null ? null : String(row.accepted_by_name),
    createdAt: row.created_at == null ? null : String(row.created_at),
  };
}

const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 10-char share token (8 hex from a uuid + 2 random base chars). */
export function generateProposalToken(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  let tail = "";
  for (let i = 0; i < 2; i++) {
    tail += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)];
  }
  return hex + tail;
}

/**
 * Indian-style rupee display with lakh grouping: 1240000 -> "Rs 12,40,000".
 * Handles lakh/crore prose from the free-text budget too.
 */
export function formatRupees(raw: number | string | null | undefined): string {
  if (raw == null || raw === "") return "-";
  const n = typeof raw === "string" ? Number(raw.replace(/[^0-9.]/g, "")) : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "-";
  const s = Math.round(n).toString();
  // Last 3 digits, then 2-digit groups.
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3
    : last3;
  return `Rs ${grouped}`;
}

/** Short relative time: "just now", "12m ago", "3h ago", "2d ago", else date. */
export function relativeTime(s: string | null | undefined): string {
  if (!s) return "-";
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return s;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(s).toISOString().slice(0, 10);
}

/** Short date: "14 Aug 2026". */
export function shortDate(s: string | null | undefined): string {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
