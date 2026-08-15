import AdminBoards from "@/components/admin/AdminBoards";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/license-gate";
import { getAdminIdentity } from "../../../identity";

export const metadata = {
  title: "Boards",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminBoardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireAdminSession();
  const { email, role } = await getAdminIdentity();
  const { id } = await params;
  if (!gate.ok) {
    return (
      <AdminPageShell email={email} role={role}>
        <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
          Sign in is required to view boards.
        </p>
      </AdminPageShell>
    );
  }
  return (
    <AdminPageShell email={email} role={gate.role}>
      <AdminBoards projectId={id} role={gate.role} />
    </AdminPageShell>
  );
}
