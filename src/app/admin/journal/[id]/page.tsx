import { ensureMigrated, pgOne } from "@/lib/pg";
import AdminJournalForm from "@/components/admin/AdminJournalForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal entry - Edit", robots: { index: false } };

export default async function AdminJournalEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";
  let initial: any = undefined;

  if (!isNew) {
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      await ensureMigrated();
      const row = await pgOne(
        `SELECT id, slug, title, excerpt, category, author_name,
                cover_image, content, content_json, is_published
         FROM journal_posts WHERE id = $1 LIMIT 1`,
        [numericId]
      );
      if (!row) {
        return (
          <div className="container-page py-24 text-ink-mute">
            Journal entry not found.
          </div>
        );
      }
      initial = row;
    }
  }

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminJournalForm initial={initial} />
      </div>
    </section>
  );
}
