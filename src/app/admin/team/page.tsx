import AdminTeamIndex from "@/components/admin/AdminTeamIndex";

export const metadata = { title: "Team", robots: { index: false } };

export default function AdminTeamPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminTeamIndex />
      </div>
    </section>
  );
}
