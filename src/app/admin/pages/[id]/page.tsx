import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import PageBuilder from "@/components/admin/PageBuilder";

export const dynamic = "force-dynamic";

export default async function PageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pageId = Number(id);
  await ensureMigrated();
  const page = await pgOne<{
    id: number;
    slug: string;
    title: string;
    status: string;
  }>(
    `SELECT id, slug, title, status FROM pages WHERE id = $1 LIMIT 1`,
    [pageId]
  );
  if (!page) {
    return (
      <div className="container-page py-24 text-ink-mute">Page not found.</div>
    );
  }
  const rows = await pgMany<{
    type: string;
    data: unknown;
  }>(
    `SELECT type, data FROM page_blocks
     WHERE page_id = $1
     ORDER BY order_index ASC, id ASC`,
    [pageId]
  );
  const initialBlocks = rows.map((r) => ({
    type: r.type as any,
    data: typeof r.data === "string" ? safeJson(r.data) : r.data ?? {},
  }));
  return (
    <PageBuilder
      pageId={pageId}
      initialTitle={page.title}
      initialStatus={page.status}
      initialBlocks={initialBlocks}
    />
  );
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
