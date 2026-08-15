import "server-only";
import { pgMany, pgOne } from "@/lib/pg";

export type MediaKind = "image" | "model" | "document" | "other";
type MediaRow = {
  id: number;
  kind: MediaKind;
  mime: string;
  size: number;
  original_name: string;
  storage_path: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  created_at: string | null;
};

export type MediaItem = {
  id: number;
  kind: MediaKind;
  mime: string;
  size: number;
  originalName: string;
  storagePath: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  createdAt: string | null;
};

export type MediaListFilters = {
  q?: string;
  kind?: MediaKind | "all";
  limit?: number;
};

function toItem(r: MediaRow): MediaItem {
  return {
    id: r.id,
    kind: r.kind,
    mime: r.mime,
    size: r.size,
    originalName: r.original_name,
    storagePath: r.storage_path,
    url: r.url,
    alt: r.alt,
    width: r.width,
    height: r.height,
    createdAt: r.created_at,
  };
}

export async function listMedia(filters: MediaListFilters = {}): Promise<MediaItem[]> {
  const limit = Math.min(filters.limit ?? 200, 500);
  const q = filters.q?.toLowerCase().trim();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.kind && filters.kind !== "all") {
    params.push(filters.kind);
    clauses.push(`kind = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    clauses.push(
      `(LOWER(COALESCE(original_name, '')) LIKE $${params.length} OR LOWER(COALESCE(alt, '')) LIKE $${params.length} OR LOWER(COALESCE(url, '')) LIKE $${params.length})`
    );
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(limit);
  const rows = await pgMany<MediaRow>(
    `SELECT * FROM media ${where} ORDER BY id DESC LIMIT $${params.length}`,
    params
  );
  return rows.map(toItem);
}

export async function getMediaById(id: number): Promise<MediaItem | null> {
  const r = await pgOne<MediaRow>(`SELECT * FROM media WHERE id = $1`, [id]);
  return r ? toItem(r) : null;
}

export async function insertMedia(item: Omit<MediaItem, "id" | "createdAt">) {
  const r = await pgOne<{ id: number }>(
    `INSERT INTO media (kind, mime, size, original_name, storage_path, url, alt, width, height)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      item.kind,
      item.mime,
      item.size,
      item.originalName,
      item.storagePath,
      item.url,
      item.alt,
      item.width,
      item.height,
    ]
  );
  return Number(r?.id ?? 0);
}

export async function updateMediaAlt(id: number, alt: string | null) {
  await pgMany(`UPDATE media SET alt = $1 WHERE id = $2`, [alt, id]);
}

export async function deleteMedia(id: number) {
  const row = await pgOne<{ storage_path: string }>(
    `SELECT storage_path FROM media WHERE id = $1`,
    [id]
  );
  if (!row) return { ok: false };
  await pgMany(`DELETE FROM media WHERE id = $1`, [id]);
  return { ok: true, file: row.storage_path };
}

export async function countMediaByKind() {
  const rows = await pgMany<{ kind: string; c: number }>(
    `SELECT kind, COUNT(*) AS c FROM media GROUP BY kind`
  );
  const out: Record<string, number> = {};
  rows.forEach((r) => (out[r.kind] = r.c));
  return out;
}
