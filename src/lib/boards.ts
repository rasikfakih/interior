/**
 * src/lib/boards.ts
 *
 * Shared constants + normalization for Module 5: the moodboard canvas.
 * A board belongs to one client engagement (boards.client_project_id)
 * and carries a freeform set of board_items, each referencing a
 * material from the Module 4 library. Ids are app-generated uuid TEXT,
 * tenant_id INTEGER, matching client_projects / materials.
 *
 * Board status: draft -> approved -> archived.
 */

import { parseJsonCell } from "@/lib/json-cell";

export const BOARD_STATUSES = ["draft", "approved", "archived"] as const;
export type BoardStatus = (typeof BOARD_STATUSES)[number];

const BOARD_STATUS_LABELS: Record<BoardStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  archived: "Archived",
};

/** Default canvas viewport/board geometry (stored as canvas_json). */
export const DEFAULT_CANVAS = {
  zoom: 1,
  pan: { x: 0, y: 0 },
  width: 2000,
  height: 1500,
} as const;

export type CanvasState = {
  zoom: number;
  pan: { x: number; y: number };
  width: number;
  height: number;
};

/** Default per-item metadata (stored as meta_json). */
export const DEFAULT_ITEM_META = { note: "", scale: 1 } as const;

export type BoardItemMeta = {
  note?: string;
  scale?: number;
};

export function boardStatusLabel(status: string): string {
  return BOARD_STATUS_LABELS[status as BoardStatus] ?? status;
}

export function normalizeBoardStatus(raw: unknown): BoardStatus | null {
  const s = String(raw ?? "").trim();
  return (BOARD_STATUSES as readonly string[]).includes(s)
    ? (s as BoardStatus)
    : null;
}

/** Material fields joined onto a board item for canvas rendering. */
export type BoardItemMaterial = {
  id: string;
  name: string;
  imageUrl: string | null;
  costPerUnit: number;
  unit: string;
  category: string;
};

export type BoardItemDto = {
  id: string;
  boardId: string;
  materialId: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  zIndex: number;
  note: string;
  scale: number;
  createdAt: string | null;
  material: BoardItemMaterial | null;
};

export type BoardDto = {
  id: string;
  tenantId: number;
  clientProjectId: string;
  title: string;
  canvas: CanvasState;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  items: BoardItemDto[];
  /** COUNT(*) of items (list rows only). */
  itemsCount?: number;
};

type RawBoard = Record<string, unknown>;
type RawItem = Record<string, unknown>;

/** Map a raw item row (+ joined material fields) to the DTO. */
export function mapBoardItem(
  r: RawItem,
  material: BoardItemMaterial | null = null
): BoardItemDto {
  const meta = parseJsonCell<Record<string, unknown>>(r.meta_json, {});
  return {
    id: String(r.id),
    boardId: String(r.board_id),
    materialId: r.material_id == null ? null : String(r.material_id),
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    w: Number(r.w ?? 200),
    h: Number(r.h ?? 200),
    rotation: Number(r.rotation ?? 0),
    zIndex: Number(r.z_index ?? 0),
    note: typeof meta.note === "string" ? meta.note : "",
    scale: Number(meta.scale ?? 1),
    createdAt: r.created_at == null ? null : String(r.created_at),
    material,
  };
}

/**
 * Build the joined material payload from a raw item row. The SELECT
 * must alias material columns as m_id, m_name, m_image_url,
 * m_cost_per_unit, m_unit, m_category.
 */
export function materialFromItemRow(r: RawItem): BoardItemMaterial | null {
  if (r.m_id == null) return null;
  return {
    id: String(r.m_id),
    name: String(r.m_name ?? ""),
    imageUrl: r.m_image_url == null ? null : String(r.m_image_url),
    costPerUnit: Number(r.m_cost_per_unit ?? 0),
    unit: String(r.m_unit ?? "nos"),
    category: String(r.m_category ?? "other"),
  };
}

/** Map a raw board row to the DTO (canvas_json parsed). */
export function mapBoard(r: RawBoard, items: BoardItemDto[] = []): BoardDto {
  const parsed = parseJsonCell<{
    zoom?: number;
    pan?: { x?: number; y?: number };
    width?: number;
    height?: number;
  }>(r.canvas_json, {});
  const canvas: CanvasState = {
    zoom: Number(parsed.zoom ?? 1) || 1,
    pan: {
      x: Number(parsed.pan?.x ?? 0) || 0,
      y: Number(parsed.pan?.y ?? 0) || 0,
    },
    width: Number(parsed.width ?? DEFAULT_CANVAS.width) || DEFAULT_CANVAS.width,
    height: Number(parsed.height ?? DEFAULT_CANVAS.height) || DEFAULT_CANVAS.height,
  };
  return {
    id: String(r.id),
    tenantId: Number(r.tenant_id ?? 0),
    clientProjectId: String(r.client_project_id),
    title: String(r.title ?? "Moodboard"),
    canvas,
    status: String(r.status ?? "draft"),
    createdAt: r.created_at == null ? null : String(r.created_at),
    updatedAt: r.updated_at == null ? null : String(r.updated_at),
    items,
    itemsCount: r.items_count == null ? undefined : Number(r.items_count),
  };
}

/** Build a fresh item DTO for optimistic local state. */
export function newItemDto(
  boardId: string,
  material: BoardItemMaterial,
  x: number,
  y: number
): BoardItemDto {
  return {
    id: crypto.randomUUID(),
    boardId,
    materialId: material.id,
    x: Math.round(x),
    y: Math.round(y),
    w: 200,
    h: 200,
    rotation: 0,
    zIndex: 1,
    note: "",
    scale: 1,
    createdAt: null,
    material,
  };
}
