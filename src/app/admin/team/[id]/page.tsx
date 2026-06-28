import { ensureMigrated, pgOne } from "@/lib/pg";
import AdminTeamForm from "@/components/admin/AdminTeamForm";

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
          <div className="container-page py-24 text-ink-mute">
            Team member not found.
          </div>
        );
      }
      initial = row;
    }
  }

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminTeamForm initial={initial} />
      </div>
    </section>
  );
}
