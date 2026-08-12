/**
 * src/lib/rooms.ts
 *
 * Shared types + validation for project rooms (Phase 3). A room is a
 * walkthrough scene inside a project: name, optional per-room GLB
 * (uploaded by the tenant through the media library), description,
 * optional hotspots JSON, ordering and publish state. Rooms power the
 * room-by-room story on project detail pages.
 */

export type ProjectRoom = {
  id: number;
  project_id: number;
  name: string;
  slug: string;
  description: string | null;
  model_3d: string | null;
  cover_media_id: number | null;
  hotspots: Record<string, unknown> | null;
  order_index: number;
  is_published: boolean;
};

export function normalizeRoomSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Validate a room payload on write. */
export function validateRoom(d: {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  model_3d?: unknown;
  cover_media_id?: unknown;
  hotspots?: unknown;
  order_index?: unknown;
  is_published?: unknown;
}): { ok: boolean; error?: string; room?: Record<string, unknown> } {
  const name = String(d.name ?? "").trim().slice(0, 255);
  if (!name) {
    return { ok: false, error: "Room name is required." };
  }
  const slug = normalizeRoomSlug(String(d.slug ?? name));
  if (!slug) {
    return { ok: false, error: "A slug (or name to derive one) is required." };
  }
  let hotspots: Record<string, unknown> | null = null;
  if (d.hotspots) {
    if (typeof d.hotspots === "string") {
      try {
        hotspots = JSON.parse(d.hotspots);
      } catch {
        return { ok: false, error: "hotspots must be valid JSON." };
      }
    } else if (typeof d.hotspots === "object") {
      hotspots = d.hotspots as Record<string, unknown>;
    }
  }
  const room: Record<string, unknown> = {
    name,
    slug,
    description: d.description ? String(d.description).slice(0, 2000) : null,
    model_3d: d.model_3d ? String(d.model_3d).slice(0, 500) : null,
    cover_media_id:
      d.cover_media_id !== undefined && d.cover_media_id !== null
        ? Number(d.cover_media_id) || null
        : null,
    hotspots,
    order_index:
      d.order_index !== undefined ? Number(d.order_index) || 0 : 0,
    is_published: d.is_published !== false,
  };
  return { ok: true, room };
}

export function parseHotspots(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}
