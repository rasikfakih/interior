import AdminProjectsIndex from "@/components/admin/AdminProjectsIndex";

export const metadata = { title: "Projects", robots: { index: false } };

export default function AdminProjectsPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminProjectsIndex />
      </div>
    </section>
  );
}
