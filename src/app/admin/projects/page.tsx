import AdminProjectsIndex from "@/components/admin/AdminProjectsIndex";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "Projects", robots: { index: false } };

export default async function AdminProjectsPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <AdminProjectsIndex />
    </AdminPageShell>
  );
}
