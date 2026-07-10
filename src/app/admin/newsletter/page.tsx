import AdminNewsletterList from "@/components/admin/AdminNewsletterList";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "Newsletter",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return (
      <section className="pt-24 md:pt-28 pb-24">
        <div className="container-page">
          <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
            Sign in is required to view newsletter subscribers.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminNewsletterList role={gate.role} />
      </div>
    </section>
  );
}
