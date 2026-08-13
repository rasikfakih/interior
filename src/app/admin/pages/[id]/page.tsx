import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import PageBuilder from "@/components/admin/PageBuilder";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../../identity";

export const dynamic = "force-dynamic";

export default async function PageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pageId = Number(id);
  const { email, role } = await getAdminIdentity();
  await ensureMigrated();
  const page = await pgOne<{
    id: number;
    slug: string;
    title: string;
    status: string;
    seo_title: string | null;
    seo_description: string | null;
    robots: string | null;
  }>(
    `SELECT id, slug, title, status, seo_title, seo_description, robots
     FROM pages WHERE id = $1 LIMIT 1`,
    [pageId]
  );
  if (!page) {
    return (
      <AdminPageShell email={email} role={role}>
        <p className="text-ink-mute">Page not found.</p>
      </AdminPageShell>
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
    <AdminPageShell email={email} role={role}>
      <PageBuilder
        pageId={pageId}
        initialTitle={page.title}
        initialStatus={page.status}
        initialBlocks={initialBlocks}
        initialSeoTitle={page.seo_title ?? ""}
        initialSeoDescription={page.seo_description ?? ""}
        initialRobots={page.robots ?? "index,follow"}
      />
    </AdminPageShell>
  );
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
