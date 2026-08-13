import AdminRedirects from "@/components/admin/AdminRedirects";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "Redirects", robots: { index: false } };

export default async function AdminRedirectsPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <AdminRedirects role={role} />
    </AdminPageShell>
  );
}
