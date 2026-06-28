import AdminTestimonialsIndex from "@/components/admin/AdminTestimonialsIndex";

export const metadata = { title: "Testimonials", robots: { index: false } };

export default function AdminTestimonialsPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminTestimonialsIndex />
      </div>
    </section>
  );
}
