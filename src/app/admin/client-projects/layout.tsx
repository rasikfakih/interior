import type { ReactNode } from "react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/license-gate";
import { getAdminIdentity } from "../identity";

export const dynamic = "force-dynamic";

/** Client engagements area shell: gate once here, host the pages below.
 *  Pages null-guard their own gate so the failure message is not doubled. */
export default async function ClientProjectsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const gate = await requireAdminSession();
  const { email, role } = await getAdminIdentity();
  if (!gate.ok) {
    return (
      <AdminPageShell email={email} role={role}>
        <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
          Sign in is required to view client projects.
        </p>
      </AdminPageShell>
    );
  }
  return (
    <AdminPageShell email={email} role={gate.role}>
      {children}
    </AdminPageShell>
  );
}
