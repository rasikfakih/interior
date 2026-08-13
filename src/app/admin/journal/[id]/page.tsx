import { ensureMigrated, pgOne } from "@/lib/pg";
import AdminJournalForm from "@/components/admin/AdminJournalForm";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../../identity";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal entry - Edit", robots: { index: false } };

export default async function AdminJournalEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";
  const { email, role } = await getAdminIdentity();
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
          <AdminPageShell email={email} role={role}>
            <p className="text-ink-mute">Journal entry not found.</p>
          </AdminPageShell>
        );
      }
      initial = row;
    }
  }

  return (
    <AdminPageShell email={email} role={role}>
      <AdminJournalForm initial={initial} />
    </AdminPageShell>
  );
}
