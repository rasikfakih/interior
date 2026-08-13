import { ensureMigrated, pgOne } from "@/lib/pg";
import AdminProjectForm from "@/components/admin/AdminProjectForm";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../../identity";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project - Edit", robots: { index: false } };

export default async function AdminProjectEditor({
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
        `SELECT * FROM projects WHERE id = $1 LIMIT 1`,
        [numericId]
      );
      if (!row) {
        return (
          <AdminPageShell email={email} role={role}>
            <p className="text-ink-mute">Project not found.</p>
          </AdminPageShell>
        );
      }
      initial = row;
    }
  }

  return (
    <AdminPageShell email={email} role={role}>
      <AdminProjectForm initial={initial} />
    </AdminPageShell>
  );
}
