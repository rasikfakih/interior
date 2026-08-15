/**
 * src/lib/materials.ts
 *
 * Shared constants + normalization for Module 4: the material and
 * vendor libraries. These are the structured replacement for the
 * spreadsheets studios keep - the foundation for the board canvas
 * (Module 5 board_items.material_id) and the BOQ (Module 6
 * boq_items.linked_material_id). Ids are app-generated uuid TEXT,
 * tenant_id INTEGER, matching client_projects.
 */

export const MATERIAL_CATEGORIES = [
  "stone",
  "wood",
  "textile",
  "hardware",
  "lighting",
  "furniture",
  "paint",
  "civil",
  "electrical",
  "plumbing",
  "other",
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_UNITS = ["sqft", "rft", "nos", "set", "lot", "lump"] as const;
export type MaterialUnit = (typeof MATERIAL_UNITS)[number];

export const STOCK_STATUSES = [
  "in_stock",
  "low",
  "out_of_stock",
  "discontinued",
] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  stone: "Stone",
  wood: "Wood",
  textile: "Textile",
  hardware: "Hardware",
  lighting: "Lighting",
  furniture: "Furniture",
  paint: "Paint",
  civil: "Civil",
  electrical: "Electrical",
  plumbing: "Plumbing",
  other: "Other",
};

const UNIT_LABELS: Record<MaterialUnit, string> = {
  sqft: "sqft",
  rft: "rft",
  nos: "nos",
  set: "set",
  lot: "lot",
  lump: "lump",
};

const STOCK_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  low: "Low",
  out_of_stock: "Out of stock",
  discontinued: "Discontinued",
};

export function materialCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as MaterialCategory] ?? category;
}

export function materialUnitLabel(unit: string): string {
  return UNIT_LABELS[unit as MaterialUnit] ?? unit;
}

export function stockStatusLabel(status: string): string {
  return STOCK_LABELS[status as StockStatus] ?? status;
}

export function normalizeMaterialCategory(raw: unknown): MaterialCategory | null {
  const s = String(raw ?? "").trim();
  return (MATERIAL_CATEGORIES as readonly string[]).includes(s)
    ? (s as MaterialCategory)
    : null;
}

export function normalizeMaterialUnit(raw: unknown): MaterialUnit | null {
  const s = String(raw ?? "").trim();
  return (MATERIAL_UNITS as readonly string[]).includes(s)
    ? (s as MaterialUnit)
    : null;
}

export function normalizeStockStatus(raw: unknown): StockStatus | null {
  const s = String(raw ?? "").trim();
  return (STOCK_STATUSES as readonly string[]).includes(s)
    ? (s as StockStatus)
    : null;
}

export type VendorDto = {
  id: string;
  tenantId: number;
  name: string;
  category: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  leadTimeDays: number;
  rating: number;
  notes: string | null;
  createdAt: string | null;
  /** COUNT(*) of materials linked to this vendor (list rows). */
  materialsCount?: number;
};

export type MaterialDto = {
  id: string;
  tenantId: number;
  vendorId: string | null;
  vendorName: string | null;
  name: string;
  category: string;
  sku: string | null;
  costPerUnit: number;
  unit: string;
  imageUrl: string | null;
  galleryUrls: string[];
  specs: Record<string, string>;
  stockStatus: string;
  createdAt: string | null;
};

/** Parse a JSON column (Postgres object/array or SQLite JSON string). */
export function parseJsonField<T>(raw: unknown, fallback: T): T {
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return p === null || p === undefined ? fallback : (p as T);
    } catch {
      return fallback;
    }
  }
  if (raw && typeof raw === "object") return raw as T;
  return fallback;
}

/** Map a vendors row to its camelCase DTO. */
export function vendorDto(row: Record<string, unknown>): VendorDto {
  return {
    id: String(row.id ?? ""),
    tenantId: Number(row.tenant_id ?? 0),
    name: String(row.name ?? ""),
    category: String(row.category ?? "other"),
    phone: row.phone == null ? null : String(row.phone),
    email: row.email == null ? null : String(row.email),
    address: row.address == null ? null : String(row.address),
    leadTimeDays: Number(row.lead_time_days ?? 7),
    rating: Number(row.rating ?? 0),
    notes: row.notes == null ? null : String(row.notes),
    createdAt: row.created_at == null ? null : String(row.created_at),
    materialsCount:
      row.materials_count == null ? undefined : Number(row.materials_count),
  };
}

/** Map a materials row (with vendor_name joined) to its camelCase DTO. */
export function materialDto(row: Record<string, unknown>): MaterialDto {
  return {
    id: String(row.id ?? ""),
    tenantId: Number(row.tenant_id ?? 0),
    vendorId: row.vendor_id == null ? null : String(row.vendor_id),
    vendorName:
      row.vendor_name == null || row.vendor_name === ""
        ? null
        : String(row.vendor_name),
    name: String(row.name ?? ""),
    category: String(row.category ?? "other"),
    sku: row.sku == null ? null : String(row.sku),
    costPerUnit: Number(row.cost_per_unit ?? 0),
    unit: String(row.unit ?? "nos"),
    imageUrl: row.image_url == null ? null : String(row.image_url),
    galleryUrls: parseJsonField<string[]>(row.gallery_urls, []),
    specs: parseJsonField<Record<string, string>>(row.specs_json, {}),
    stockStatus: String(row.stock_status ?? "in_stock"),
    createdAt: row.created_at == null ? null : String(row.created_at),
  };
}

/** INR-style cost display with unit: "Rs 1,250 / sqft". */
export function formatCost(cost: number | null | undefined, unit: string): string {
  const n = Number(cost ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  const rounded = Math.round(n * 100) / 100;
  const [whole, frac] = rounded.toString().split(".");
  // Indian grouping: last 3 digits, then 2-digit groups from the right
  // (1850 -> "1,850", 1240000 -> "12,40,000").
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3
    : last3;
  const amount = frac ? `${grouped}.${frac}` : grouped;
  return `Rs ${amount} / ${unit}`;
}
