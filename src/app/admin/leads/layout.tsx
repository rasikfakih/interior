import type { ReactNode } from "react";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import LeadsTabs from "@/components/admin/LeadsTabs";
import { requireAdminSession } from "@/lib/license-gate";
import { getAdminIdentity } from "../identity";

export const dynamic = "force-dynamic";

/** Lead inbox area shell: gate once here, host the List | Board tabs,
 *  and let the two views render their content. Pages null-guard their
 *  own gate so the failure message below is not doubled. */
export default async function LeadsLayout({
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
          Sign in is required to view leads.
        </p>
      </AdminPageShell>
    );
  }
  return (
    <AdminPageShell email={email} role={gate.role}>
      <LeadsTabs />
      {children}
    </AdminPageShell>
  );
}
