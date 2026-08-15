/**
 * src/lib/leads.ts
 *
 * Shared constants + normalization for the lead pipeline (Modules 1-2).
 * The `leads` table status funnel is: new -> qualified -> site_visit
 * -> quote_sent -> won, with `lost` as the terminal negative outcome.
 * Sources: `website` is written automatically by /api/forms/submit;
 * manual leads come from the /admin/leads modal.
 */

export const LEAD_STATUSES = [
  "new",
  "qualified",
  "site_visit",
  "quote_sent",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "manual",
  "website",
  "referral",
  "phone",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  qualified: "Qualified",
  site_visit: "Site Visit",
  quote_sent: "Quote Sent",
  won: "Won",
  lost: "Lost",
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  manual: "Manual",
  website: "Website",
  referral: "Referral",
  phone: "Phone",
  other: "Other",
};

/** API DTO shape for a lead row (camelCase, as returned by /api/leads). */
export type LeadDto = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  budget: string | null;
  status: string;
  score: number;
  lostReason: string | null;
  lastStatusChangeAt: string | null;
  createdAt: string | null;
  /** Module 3: linked client_projects row id, when a project exists. */
  clientProjectId: string | null;
};

/** Human label for a status value, e.g. `site_visit` -> `Site Visit`. */
export function leadStatusLabel(status: string): string {
  return STATUS_LABELS[status as LeadStatus] ?? status;
}

/** Human label for a source value, e.g. `website` -> `Website`. */
export function leadSourceLabel(source: string): string {
  return SOURCE_LABELS[source as LeadSource] ?? source;
}

/** Coerce an arbitrary status to a known status or null. */
export function normalizeLeadStatus(raw: unknown): LeadStatus | null {
  const s = String(raw ?? "").trim();
  return (LEAD_STATUSES as readonly string[]).includes(s)
    ? (s as LeadStatus)
    : null;
}

/** Coerce an arbitrary source to a known source or null. */
export function normalizeLeadSource(raw: unknown): LeadSource | null {
  const s = String(raw ?? "").trim();
  return (LEAD_SOURCES as readonly string[]).includes(s)
    ? (s as LeadSource)
    : null;
}

/**
 * Parse a free-text budget into lakhs for per-status totals. Budgets
 * are entered as ranges ("15-20L"), thresholds ("under 10L", "25L+")
 * or plain numbers. The first numeric token is the amount; "k"/"K"
 * is converted from thousands to lakhs, "cr"/"crore" from crores to
 * lakhs. Returns 0 when nothing numeric is present. SQL SUM() cannot
 * do this because budget is free text, so aggregation happens in JS.
 */
export function parseBudgetLakhs(budget: string | null | undefined): number {
  if (!budget) return 0;
  const m = String(budget).trim().toLowerCase().match(/\d+(?:\.\d+)?/);
  if (!m) return 0;
  const amount = Number(m[0]);
  if (Number.isNaN(amount)) return 0;
  const rest = String(budget).slice(m.index ?? 0);
  if (/k\b|\bk/.test(rest)) return amount / 100;
  if (/cr\b|crore/.test(rest)) return amount * 100;
  return amount;
}

/** Compact lakh display: "Rs 12.4L" / "Rs 25L" / "-" when zero. */
export function formatBudgetLakhs(lakhs: number): string {
  if (!Number.isFinite(lakhs) || lakhs <= 0) return "-";
  const rounded = Math.round(lakhs * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(/\.0$/, "");
  return `Rs ${text}L`;
}
