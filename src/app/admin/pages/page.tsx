import PagesAdmin from "@/components/admin/PagesAdmin";

export const metadata = { title: "Pages", robots: { index: false } };

export default function AdminPagesPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <PagesAdmin />
      </div>
    </section>
  );
}
