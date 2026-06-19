import "server-only";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

function openDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  return sqlite;
}

export type PageRow = {
  id: number;
  slug: string;
  title: string;
  status: string;
  is_front: number;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
};

export type BlockRow = {
  id: number;
  page_id: number;
  type: string;
  data: string;
  order_index: number;
};

export async function listPages(): Promise<PageRow[]> {
  return new Promise<PageRow[]>((resolve, reject) => {
    try {
      const sqlite = openDb();
      const rows = sqlite
        .prepare(
          `SELECT id, slug, title, status, is_front, seo_title, seo_description, published_at, created_at
           FROM pages ORDER BY created_at ASC`
        )
        .all() as PageRow[];
      sqlite.close();
      resolve(rows);
    } catch (e) {
      reject(e);
    }
  });
}

export async function getPageBySlug(slug: string) {
  return new Promise<{ page: PageRow | null; blocks: BlockRow[] }>(
    (resolve, reject) => {
      try {
        const sqlite = openDb();
        const page = sqlite
          .prepare("SELECT * FROM pages WHERE slug = ?")
          .get(slug) as PageRow | undefined;
        if (!page) {
          sqlite.close();
          return resolve({ page: null, blocks: [] });
        }
        const blocks = sqlite
          .prepare(
            `SELECT * FROM page_blocks WHERE page_id = ? ORDER BY order_index ASC, id ASC`
          )
          .all(page.id) as BlockRow[];
        sqlite.close();
        resolve({ page, blocks });
      } catch (e) {
        reject(e);
      }
    }
  );
}

export async function getPageById(id: number) {
  return new Promise<{ page: PageRow | null; blocks: BlockRow[] }>(
    (resolve, reject) => {
      try {
        const sqlite = openDb();
        const page = sqlite
          .prepare(
            `SELECT id, slug, title, status, is_front, seo_title, seo_description, published_at, created_at
             FROM pages WHERE id = ?`
          )
          .get(id) as PageRow | undefined;
        if (!page) {
          sqlite.close();
          return resolve({ page: null, blocks: [] });
        }
        const blocks = sqlite
          .prepare(
            `SELECT * FROM page_blocks WHERE page_id = ? ORDER BY order_index ASC, id ASC`
          )
          .all(page.id) as BlockRow[];
        sqlite.close();
        resolve({ page, blocks });
      } catch (e) {
        reject(e);
      }
    }
  );
}

export async function getFrontPage() {
  return getPageBySlug("home");
}
