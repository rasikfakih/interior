import { ensureMigrated, pgOne } from "@/lib/pg";
import AdminTeamForm from "@/components/admin/AdminTeamForm";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../../identity";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Team member - Edit",
  robots: { index: false },
};

export default async function AdminTeamEditor({
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
        `SELECT id, name, role, bio, photo, "order", is_published
         FROM team_members WHERE id = $1 LIMIT 1`,
        [numericId]
      );
      if (!row) {
        return (
          <AdminPageShell email={email} role={role}>
            <p className="text-ink-mute">Team member not found.</p>
          </AdminPageShell>
        );
      }
      initial = row;
    }
  }

  return (
    <AdminPageShell email={email} role={role}>
      <AdminTeamForm initial={initial} />
    </AdminPageShell>
  );
}
