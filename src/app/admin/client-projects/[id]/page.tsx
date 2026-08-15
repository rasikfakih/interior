import ClientProjectDetail from "@/components/admin/ClientProjectDetail";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne } from "@/lib/pg";

export const metadata = {
  title: "Client Project",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminClientProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lead_id?: string }>;
}) {
  const gate = await requireAdminSession();
  if (!gate.ok) return null;
  const { id } = await params;
  const { lead_id } = await searchParams;

  let initial: Record<string, unknown> | null = null;
  let leadName: string | null = null;
  if (id !== "new") {
    await ensureMigrated();
    const row = await pgOne<Record<string, unknown>>(
      `SELECT cp.*, l.name AS lead_name
       FROM client_projects cp
       LEFT JOIN leads l ON l.id = cp.lead_id
       WHERE cp.id = $1 LIMIT 1`,
      [id]
    );
    if (!row) {
      return (
        <div>
          <p className="chrome-pill mb-3 inline-flex">Client project</p>
          <p className="text-ink-mute">Project not found.</p>
        </div>
      );
    }
    initial = row;
  } else if (lead_id) {
    await ensureMigrated();
    const lead = await pgOne<{ name: string }>(
      `SELECT name FROM leads WHERE id = $1 LIMIT 1`,
      [Number(lead_id)]
    );
    leadName = lead?.name ?? null;
  }

  return (
    <ClientProjectDetail
      projectId={id}
      initial={initial}
      leadId={id === "new" ? lead_id ?? null : null}
      leadName={leadName}
      role={gate.role}
    />
  );
}
