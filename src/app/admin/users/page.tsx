import AdminUsers from "@/components/admin/AdminUsers";

export const metadata = { title: "Users", robots: { index: false } };

export default function AdminUsersPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminUsers role="admin" />
      </div>
    </section>
  );
}
