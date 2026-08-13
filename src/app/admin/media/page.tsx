import MediaGrid from "@/components/admin/MediaGrid";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "Media library", robots: { index: false } };

export default async function AdminMediaPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <MediaGrid />
    </AdminPageShell>
  );
}
