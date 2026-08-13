import AdminJournalIndex from "@/components/admin/AdminJournalIndex";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "Journal", robots: { index: false } };

export default async function AdminJournalPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <AdminJournalIndex />
    </AdminPageShell>
  );
}
