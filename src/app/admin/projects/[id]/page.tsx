import { ensureMigrated, pgOne } from "@/lib/pg";
import AdminProjectForm from "@/components/admin/AdminProjectForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project - Edit", robots: { index: false } };

export default async function AdminProjectEditor({
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
        `SELECT * FROM projects WHERE id = $1 LIMIT 1`,
        [numericId]
      );
      if (!row) {
        return (
          <div className="container-page py-24 text-ink-mute">
            Project not found.
          </div>
        );
      }
      initial = row;
    }
  }

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminProjectForm initial={initial} />
      </div>
    </section>
  );
}
