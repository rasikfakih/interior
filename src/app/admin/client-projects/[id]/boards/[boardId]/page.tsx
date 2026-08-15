import BoardCanvas from "@/components/admin/BoardCanvas";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/license-gate";
import { getAdminIdentity } from "../../../../identity";

export const metadata = {
  title: "Board Canvas",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminBoardCanvasPage({
  params,
}: {
  params: Promise<{ id: string; boardId: string }>;
}) {
  const gate = await requireAdminSession();
  const { email, role } = await getAdminIdentity();
  const { id, boardId } = await params;
  if (!gate.ok) {
    return (
      <AdminPageShell email={email} role={role}>
        <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
          Sign in is required to open boards.
        </p>
      </AdminPageShell>
    );
  }
  return (
    <AdminPageShell email={email} role={gate.role}>
      <BoardCanvas projectId={id} boardId={boardId} role={gate.role} />
    </AdminPageShell>
  );
}
