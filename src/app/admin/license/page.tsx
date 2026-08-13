import LicenseAdmin from "@/components/admin/LicenseAdmin";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "License", robots: { index: false } };

export default async function AdminLicensePage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <LicenseAdmin />
    </AdminPageShell>
  );
}
