import AdminTeamIndex from "@/components/admin/AdminTeamIndex";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "Team", robots: { index: false } };

export default async function AdminTeamPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <AdminTeamIndex />
    </AdminPageShell>
  );
}
