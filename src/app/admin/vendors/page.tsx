import AdminVendors from "@/components/admin/AdminVendors";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/license-gate";
import { getAdminIdentity } from "../identity";

export const metadata = {
  title: "Vendors",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage() {
  const gate = await requireAdminSession();
  const { email, role } = await getAdminIdentity();
  if (!gate.ok) {
    return (
      <AdminPageShell email={email} role={role}>
        <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
          Sign in is required to view vendors.
        </p>
      </AdminPageShell>
    );
  }
  return (
    <AdminPageShell email={email} role={gate.role}>
      <AdminVendors role={gate.role} />
    </AdminPageShell>
  );
}
