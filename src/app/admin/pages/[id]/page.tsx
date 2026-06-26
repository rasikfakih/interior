import { db } from "@/lib/db";
import { pages, pageBlocks } from "@/lib/schema";
import { eq } from "drizzle-orm";
import PageBuilder from "@/components/admin/PageBuilder";

export const dynamic = "force-dynamic";

export default async function PageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pageId = Number(id);
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page) {
    return <div className="container-page py-24 text-ink-mute">Page not found.</div>;
  }
  const rows = await db
    .select()
    .from(pageBlocks)
    .where(eq(pageBlocks.pageId, pageId));
  const initialBlocks = rows.map((r: any) => ({
    type: r.type as any,
    data: safeJson(r.data),
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
