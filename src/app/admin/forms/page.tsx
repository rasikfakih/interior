import AdminForms from "@/components/admin/AdminForms";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "Forms", robots: { index: false } };

export default async function AdminFormsPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <AdminForms role={role} />
    </AdminPageShell>
  );
}
