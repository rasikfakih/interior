import AdminTestimonialsIndex from "@/components/admin/AdminTestimonialsIndex";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const metadata = { title: "Testimonials", robots: { index: false } };

export default async function AdminTestimonialsPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <AdminTestimonialsIndex />
    </AdminPageShell>
  );
}
