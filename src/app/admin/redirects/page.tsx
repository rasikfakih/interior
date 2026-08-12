import AdminRedirects from "@/components/admin/AdminRedirects";

export const metadata = { title: "Redirects", robots: { index: false } };

export default function AdminRedirectsPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminRedirects role="admin" />
      </div>
    </section>
  );
}
