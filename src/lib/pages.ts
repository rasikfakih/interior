import "server-only";
import { openDb } from "@/lib/db";

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
  try {
    const sqlite = openDb();
    return sqlite
      .prepare(
        `SELECT id, slug, title, status, is_front, seo_title, seo_description, published_at, created_at
         FROM pages ORDER BY created_at ASC`
      )
      .all() as PageRow[];
  } catch (e) {
    console.error("[lib/pages] listPages failed:", (e as Error)?.message);
    return [];
  }
}

export async function getPageBySlug(slug: string) {
  try {
    const sqlite = openDb();
    const page = sqlite
      .prepare("SELECT * FROM pages WHERE slug = ?")
      .get(slug) as PageRow | undefined;
    if (!page) return { page: null, blocks: [] };
    const blocks = sqlite
      .prepare(
        `SELECT * FROM page_blocks WHERE page_id = ? ORDER BY order_index ASC, id ASC`
      )
      .all(page.id) as BlockRow[];
    return { page, blocks };
  } catch (e) {
    console.error("[lib/pages] getPageBySlug failed:", (e as Error)?.message);
    return { page: null, blocks: [] };
  }
}

export async function getPageById(id: number) {
  try {
    const sqlite = openDb();
    const page = sqlite
      .prepare(
        `SELECT id, slug, title, status, is_front, seo_title, seo_description, published_at, created_at
         FROM pages WHERE id = ?`
      )
      .get(id) as PageRow | undefined;
    if (!page) return { page: null, blocks: [] };
    const blocks = sqlite
      .prepare(
        `SELECT * FROM page_blocks WHERE page_id = ? ORDER BY order_index ASC, id ASC`
      )
      .all(page.id) as BlockRow[];
    return { page, blocks };
  } catch (e) {
    console.error("[lib/pages] getPageById failed:", (e as Error)?.message);
    return { page: null, blocks: [] };
  }
}

export async function getFrontPage() {
  return getPageBySlug("home");
}
