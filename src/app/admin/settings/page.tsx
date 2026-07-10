import AdminSettings from "@/components/admin/AdminSettings";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { shapeRowsForEditor } from "@/lib/settings-whitelist";

export const metadata = {
  title: "Settings",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    // Server-side sign-in redirect for unauthenticated browsers.
    // The admin chrome handles unbounced cases; this fetch is from
    // inside AdminShell so an unauthenticated visit would already
    // 302 at AdminShell's auth gate.
    return (
      <section className="pt-24 md:pt-28 pb-24">
        <div className="container-page">
          <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
            Sign in is required to edit settings.
          </p>
        </div>
      </section>
    );
  }

  await ensureMigrated();
  const rows = await pgMany(`SELECT * FROM settings ORDER BY key ASC`);
  const initial = shapeRowsForEditor(rows ?? []);

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminSettings initial={initial} role={gate.role} />
      </div>
    </section>
  );
}
