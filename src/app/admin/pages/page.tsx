import PagesAdmin from "@/components/admin/PagesAdmin";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "Pages", robots: { index: false } };

export default async function AdminPagesPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <PagesAdmin />
    </AdminPageShell>
  );
}
