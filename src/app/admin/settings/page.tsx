import AdminSettings from "@/components/admin/AdminSettings";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { shapeRowsForEditor } from "@/lib/settings-whitelist";
import { getAdminIdentity } from "../identity";

export const metadata = {
  title: "Settings",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const gate = await requireAdminSession();
  const { email, role } = await getAdminIdentity();
  if (!gate.ok) {
    // Server-side sign-in redirect for unauthenticated browsers.
    // The admin chrome handles unbounced cases; this fetch is from
    // inside AdminShell so an unauthenticated visit would already
    // 302 at AdminShell's auth gate.
    return (
      <AdminPageShell email={email} role={role}>
        <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
          Sign in is required to edit settings.
        </p>
      </AdminPageShell>
    );
  }

  await ensureMigrated();
  const rows = await pgMany(`SELECT * FROM settings ORDER BY key ASC`);
  const initial = shapeRowsForEditor(rows ?? []);

  return (
    <AdminPageShell email={email} role={gate.role}>
      <AdminSettings initial={initial} role={gate.role} />
    </AdminPageShell>
  );
}
