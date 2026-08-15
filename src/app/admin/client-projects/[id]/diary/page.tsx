import Link from "next/link";
import AdminDiaryTabs from "@/components/admin/AdminDiaryTabs";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { clientProjectStatusLabel } from "@/lib/proposals";

export const metadata = {
  title: "Site Diary",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSiteDiaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireAdminSession();
  if (!gate.ok) return null;
  const { id } = await params;

  await ensureMigrated();
  const project = await pgOne<Record<string, unknown>>(
    `SELECT id, name, client_name, status FROM client_projects WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!project) {
    return (
      <div className="container-page py-10">
        <p className="chrome-pill mb-3 inline-flex">Client engagement</p>
        <p className="text-ink-mute">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/admin/client-projects/${id}`}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-deep hover:underline"
          >
            Back to project
          </Link>
          <h1 className="mt-2 text-3xl md:text-4xl tracking-tighter">
            Site diary.
          </h1>
          <p className="font-display text-lg text-ink-mute mt-1">
            {String(project.name ?? "")}
            {project.client_name
              ? ` - prepared for ${String(project.client_name)}`
              : ""}
          </p>
        </div>
        <span className="inline-flex rounded-[var(--radius-control)] border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
          {clientProjectStatusLabel(String(project.status ?? "draft"))}
        </span>
      </header>
      <AdminDiaryTabs projectId={id} role={gate.role} />
    </div>
  );
}
