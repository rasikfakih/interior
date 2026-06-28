import AdminJournalIndex from "@/components/admin/AdminJournalIndex";

export const metadata = { title: "Journal", robots: { index: false } };

export default function AdminJournalPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminJournalIndex />
      </div>
    </section>
  );
}
