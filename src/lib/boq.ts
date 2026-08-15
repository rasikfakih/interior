/**
 * src/lib/boq.ts
 *
 * Shared constants + normalization for Module 6: the BOQ engine.
 * A bill of quantities is versioned per client engagement
 * (boq_versions) with line items (boq_items) whose material rate can
 * be pulled live from the Module 4 material library via
 * linked_material_id. Ids are app-generated uuid TEXT, tenant_id
 * INTEGER, matching the rest of the CRM.
 *
 * Amount formula (rounded to 2 decimals):
 *   qty * (material_rate + labour_rate) * (1 + wastage_pct/100) *
 *   (1 + gst_pct/100)
 */

export const BOQ_CATEGORIES = [
  "civil",
  "carpentry",
  "electrical",
  "plumbing",
  "painting",
  "false_ceiling",
  "flooring",
  "soft_furnishing",
  "decor",
  "other",
] as const;
export type BoqCategory = (typeof BOQ_CATEGORIES)[number];

export const BOQ_UNITS = ["sqft", "rft", "nos", "set", "lot", "lump", "sqm", "rm"] as const;
export type BoqUnit = (typeof BOQ_UNITS)[number];

export const BOQ_STATUSES = ["draft", "sent", "approved", "revised"] as const;
export type BoqStatus = (typeof BOQ_STATUSES)[number];

const CATEGORY_LABELS: Record<BoqCategory, string> = {
  civil: "Civil",
  carpentry: "Carpentry",
  electrical: "Electrical",
  plumbing: "Plumbing",
  painting: "Painting",
  false_ceiling: "False Ceiling",
  flooring: "Flooring",
  soft_furnishing: "Soft Furnishing",
  decor: "Decor",
  other: "Other",
};

const STATUS_LABELS: Record<BoqStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  revised: "Revised",
};

export function boqCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as BoqCategory] ?? category;
}

export function boqStatusLabel(status: string): string {
  return STATUS_LABELS[status as BoqStatus] ?? status;
}

export function normalizeBoqCategory(raw: unknown): BoqCategory | null {
  const s = String(raw ?? "").trim();
  return (BOQ_CATEGORIES as readonly string[]).includes(s)
    ? (s as BoqCategory)
    : null;
}

export function normalizeBoqUnit(raw: unknown): BoqUnit | null {
  const s = String(raw ?? "").trim();
  return (BOQ_UNITS as readonly string[]).includes(s)
    ? (s as BoqUnit)
    : null;
}

export function normalizeBoqStatus(raw: unknown): BoqStatus | null {
  const s = String(raw ?? "").trim();
  return (BOQ_STATUSES as readonly string[]).includes(s)
    ? (s as BoqStatus)
    : null;
}

/** Indian number grouping with decimals: 1240000 -> 12,40,000. */
export function formatIndianNumber(n: number | string | null | undefined): string {
  if (n == null || n === "" || !Number.isFinite(Number(n))) return "0";
  const rounded = Math.round(Number(n) * 100) / 100;
  const [whole, frac] = rounded.toString().split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3
    : last3;
  return frac ? `${grouped}.${frac}` : grouped;
}

/** `Rs 18,45,320` for totals and amounts (no unit suffix). */
export function formatMoney(n: number | string | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n)) || Number(n) <= 0) return "-";
  return `Rs ${formatIndianNumber(n)}`;
}

/** Line amount with wastage + GST, rounded to 2 decimals. */
export function calcItemAmount(
  qty: number,
  materialRate: number,
  labourRate: number,
  wastagePct: number,
  gstPct: number
): number {
  const base = Number(qty) * (Number(materialRate) + Number(labourRate));
  const withWastage = base * (1 + Number(wastagePct) / 100);
  const withGst = withWastage * (1 + Number(gstPct) / 100);
  return Math.round(withGst * 100) / 100;
}

export type BoqItemMaterial = {
  id: string;
  name: string;
  imageUrl: string | null;
  costPerUnit: number;
  unit: string;
  category: string;
};

export type BoqItemDto = {
  id: string;
  boqVersionId: string;
  category: string;
  itemName: string;
  description: string | null;
  unit: string;
  qty: number;
  materialRate: number;
  labourRate: number;
  wastagePct: number;
  gstPct: number;
  amount: number;
  linkedMaterialId: string | null;
  linkedBoardItemId: string | null;
  createdAt: string | null;
  /** Joined from materials (aliased m_*). */
  material: BoqItemMaterial | null;
  /** Joined from boards via board_items (aliased b_title). */
  linkedBoardTitle: string | null;
};

export type BoqVersionDto = {
  id: string;
  tenantId: number;
  clientProjectId: string;
  versionNo: number;
  title: string;
  status: string;
  total: number;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  items: BoqItemDto[];
  itemsCount?: number;
};

type RawItem = Record<string, unknown>;
type RawVersion = Record<string, unknown>;

export function mapBoqItem(r: RawItem): BoqItemDto {
  return {
    id: String(r.id),
    boqVersionId: String(r.boq_version_id),
    category: String(r.category ?? "civil"),
    itemName: String(r.item_name ?? ""),
    description: r.description == null ? null : String(r.description),
    unit: String(r.unit ?? "nos"),
    qty: Number(r.qty ?? 1),
    materialRate: Number(r.material_rate ?? 0),
    labourRate: Number(r.labour_rate ?? 0),
    wastagePct: Number(r.wastage_pct ?? 5),
    gstPct: Number(r.gst_pct ?? 18),
    amount: Number(r.amount ?? 0),
    linkedMaterialId: r.linked_material_id == null ? null : String(r.linked_material_id),
    linkedBoardItemId: r.linked_board_item_id == null ? null : String(r.linked_board_item_id),
    createdAt: r.created_at == null ? null : String(r.created_at),
    material: r.m_id == null ? null : {
      id: String(r.m_id),
      name: String(r.m_name ?? ""),
      imageUrl: r.m_image_url == null ? null : String(r.m_image_url),
      costPerUnit: Number(r.m_cost_per_unit ?? 0),
      unit: String(r.m_unit ?? "nos"),
      category: String(r.m_category ?? "other"),
    },
    linkedBoardTitle: r.b_title == null ? null : String(r.b_title),
  };
}

export function mapBoqVersion(r: RawVersion, items: BoqItemDto[] = []): BoqVersionDto {
  return {
    id: String(r.id),
    tenantId: Number(r.tenant_id ?? 0),
    clientProjectId: String(r.client_project_id),
    versionNo: Number(r.version_no ?? 1),
    title: String(r.title ?? "BOQ v1"),
    status: String(r.status ?? "draft"),
    total: Number(r.total ?? 0),
    notes: r.notes == null ? null : String(r.notes),
    createdAt: r.created_at == null ? null : String(r.created_at),
    updatedAt: r.updated_at == null ? null : String(r.updated_at),
    items,
    itemsCount: r.items_count == null ? undefined : Number(r.items_count),
  };
}

/** The item SELECT fragment shared by every BOQ read (m_* + b_title). */
export const BOQ_ITEM_SELECT = `
  SELECT bi.*,
         m.id AS m_id, m.name AS m_name, m.image_url AS m_image_url,
         m.cost_per_unit AS m_cost_per_unit, m.unit AS m_unit,
         m.category AS m_category,
         b.title AS b_title
  FROM boq_items bi
  LEFT JOIN materials m ON m.id = bi.linked_material_id
  LEFT JOIN board_items bxi ON bxi.id = bi.linked_board_item_id
  LEFT JOIN boards b ON b.id = bxi.board_id
`;

export const BOQ_TEMPLATES = ["1bhk", "2bhk", "3bhk"] as const;
export type BoqTemplateName = (typeof BOQ_TEMPLATES)[number];

export function normalizeTemplateName(raw: unknown): BoqTemplateName | null {
  const s = String(raw ?? "").toLowerCase().trim();
  return (BOQ_TEMPLATES as readonly string[]).includes(s)
    ? (s as BoqTemplateName)
    : null;
}
