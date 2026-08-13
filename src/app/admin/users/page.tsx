import AdminUsers from "@/components/admin/AdminUsers";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "Users", robots: { index: false } };

export default async function AdminUsersPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <AdminUsers role={role} />
    </AdminPageShell>
  );
}
