import AdminInstallView from "@/components/admin/AdminInstallView";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "Install",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminInstallPage() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return (
      <section className="pt-24 md:pt-28 pb-24">
        <div className="container-page">
          <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
            Sign in is required to view install metadata.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminInstallView role={gate.role} />
      </div>
    </section>
  );
}
