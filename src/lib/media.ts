import "server-only";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

function getSqlite() {
  const sqlite = new Database(DB_PATH, { readonly: false });
  sqlite.pragma("journal_mode = WAL");
  return sqlite;
}

export type MediaKind = "image" | "model" | "document" | "other";
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

export async function listMedia(filters: MediaListFilters = {}): Promise<MediaItem[]> {
  return new Promise((resolve, reject) => {
    try {
      const sqlite = getSqlite();
      const limit = Math.min(filters.limit ?? 200, 500);
      const rows = sqlite
        .prepare("SELECT * FROM media ORDER BY id DESC LIMIT ?")
        .all(limit) as any[];
      sqlite.close();
      const filtered = rows.filter((r) => {
        const q = filters.q?.toLowerCase().trim();
        const kindOk =
          !filters.kind || filters.kind === "all" || r.kind === filters.kind;
        const qOk =
          !q ||
          (r.original_name || "").toLowerCase().includes(q) ||
          (r.alt || "").toLowerCase().includes(q) ||
          (r.url || "").toLowerCase().includes(q);
        return kindOk && qOk;
      });
      resolve(
        filtered.map((r: any) => ({
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
        }))
      );
    } catch (e) {
      reject(e);
    }
  });
}

export async function getMediaById(id: number): Promise<MediaItem | null> {
  return new Promise((resolve, reject) => {
    try {
      const sqlite = getSqlite();
      const r = sqlite.prepare("SELECT * FROM media WHERE id = ?").get(id) as any;
      sqlite.close();
      if (!r) return resolve(null);
      resolve({
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
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function insertMedia(item: Omit<MediaItem, "id" | "createdAt">) {
  return new Promise<number>((resolve, reject) => {
    try {
      const sqlite = getSqlite();
      const r = sqlite
        .prepare(
          `INSERT INTO media (kind, mime, size, original_name, storage_path, url, alt, width, height)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          item.kind,
          item.mime,
          item.size,
          item.originalName,
          item.storagePath,
          item.url,
          item.alt,
          item.width,
          item.height
        );
      sqlite.close();
      resolve(Number(r.lastInsertRowid));
    } catch (e) {
      reject(e);
    }
  });
}

export async function updateMediaAlt(id: number, alt: string | null) {
  return new Promise<void>((resolve, reject) => {
    try {
      const sqlite = getSqlite();
      sqlite.prepare(`UPDATE media SET alt = ? WHERE id = ?`).run(alt, id);
      sqlite.close();
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export async function deleteMedia(id: number) {
  return new Promise<{ ok: boolean; file?: string }>((resolve, reject) => {
    try {
      const sqlite = getSqlite();
      const row = sqlite.prepare("SELECT storage_path FROM media WHERE id = ?").get(id) as any;
      if (!row) {
        sqlite.close();
        return resolve({ ok: false });
      }
      sqlite.prepare("DELETE FROM media WHERE id = ?").run(id);
      sqlite.close();
      resolve({ ok: true, file: row.storage_path });
    } catch (e) {
      reject(e);
    }
  });
}

export async function countMediaByKind() {
  return new Promise<Record<string, number>>((resolve, reject) => {
    try {
      const sqlite = getSqlite();
      const rows = sqlite
        .prepare("SELECT kind, COUNT(*) AS c FROM media GROUP BY kind")
        .all() as any[];
      sqlite.close();
      const out: Record<string, number> = {};
      rows.forEach((r) => (out[r.kind] = r.c));
      resolve(out);
    } catch (e) {
      reject(e);
    }
  });
}
