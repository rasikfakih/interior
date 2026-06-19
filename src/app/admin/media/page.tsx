import MediaGrid from "@/components/admin/MediaGrid";

export const metadata = { title: "Media library", robots: { index: false } };

export default function AdminMediaPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <MediaGrid />
      </div>
    </section>
  );
}
