import "server-only";
import { ensureMigrated, pgOne, pgMany } from "@/lib/pg";

export type PageRow = {
  id: number;
  slug: string;
  title: string;
  status: string;
  is_front: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
};

export type BlockRow = {
  id: number;
  page_id: number;
  type: string;
  data: unknown;
  order_index: number;
};

const PAGE_COLUMNS = `id, slug, title, status, is_front, seo_title, seo_description, published_at, created_at`;

export async function listPages(): Promise<PageRow[]> {
  try {
    await ensureMigrated();
    return await pgMany<PageRow>(
      `SELECT ${PAGE_COLUMNS} FROM pages ORDER BY created_at ASC`
    );
  } catch (e) {
    console.error("[lib/pages] listPages failed:", (e as Error)?.message);
    return [];
  }
}

export async function getPageBySlug(slug: string) {
  try {
    await ensureMigrated();
    const page = await pgOne<PageRow>(
      `SELECT ${PAGE_COLUMNS} FROM pages WHERE slug = $1`,
      [slug]
    );
    if (!page) return { page: null, blocks: [] as BlockRow[] };
    const blocks = await pgMany<BlockRow>(
      `SELECT id, page_id, type, data, order_index
       FROM page_blocks WHERE page_id = $1
       ORDER BY order_index ASC, id ASC`,
      [page.id]
    );
    return { page, blocks };
  } catch (e) {
    console.error("[lib/pages] getPageBySlug failed:", (e as Error)?.message);
    return { page: null, blocks: [] as BlockRow[] };
  }
}

export async function getPageById(id: number) {
  try {
    await ensureMigrated();
    const page = await pgOne<PageRow>(
      `SELECT ${PAGE_COLUMNS} FROM pages WHERE id = $1`,
      [id]
    );
    if (!page) return { page: null, blocks: [] as BlockRow[] };
    const blocks = await pgMany<BlockRow>(
      `SELECT id, page_id, type, data, order_index
       FROM page_blocks WHERE page_id = $1
       ORDER BY order_index ASC, id ASC`,
      [page.id]
    );
    return { page, blocks };
  } catch (e) {
    console.error("[lib/pages] getPageById failed:", (e as Error)?.message);
    return { page: null, blocks: [] as BlockRow[] };
  }
}

export async function getFrontPage() {
  return getPageBySlug("home");
}
