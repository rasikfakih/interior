import AdminForms from "@/components/admin/AdminForms";

export const metadata = { title: "Forms", robots: { index: false } };

export default function AdminFormsPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminForms role="admin" />
      </div>
    </section>
  );
}
