import AdminMaterials from "@/components/admin/AdminMaterials";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/license-gate";
import { getAdminIdentity } from "../identity";

export const metadata = {
  title: "Materials",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor_id?: string }>;
}) {
  const gate = await requireAdminSession();
  const { email, role } = await getAdminIdentity();
  const { vendor_id } = await searchParams;
  if (!gate.ok) {
    return (
      <AdminPageShell email={email} role={role}>
        <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
          Sign in is required to view materials.
        </p>
      </AdminPageShell>
    );
  }
  return (
    <AdminPageShell email={email} role={gate.role}>
      <AdminMaterials role={gate.role} initialVendorId={vendor_id} />
    </AdminPageShell>
  );
}
