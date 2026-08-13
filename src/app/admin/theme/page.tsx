import AdminTheme from "@/components/admin/AdminTheme";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated } from "@/lib/pg";
import { resolveThemeFull } from "@/lib/theme";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { getAdminIdentity } from "../identity";

export const metadata = {
  title: "Theme",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminThemePage() {
  const gate = await requireAdminSession();
  const { email, role } = await getAdminIdentity();
  if (!gate.ok) {
    return (
      <AdminPageShell email={email} role={role}>
        <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
          Sign in is required to edit the theme.
        </p>
      </AdminPageShell>
    );
  }

  await ensureMigrated();
  const full = await resolveThemeFull();
  const p = full.palette;

  return (
    <AdminPageShell email={email} role={gate.role}>
      <AdminTheme
          initialPalette={{
            ink: p.ink,
            paper: p.paper,
            accent: p.accent,
            muted: p.muted || "",
          }}
          initialCustomizer={full.customizer}
          presets={THEME_PRESETS.map((preset) => ({
            slug: preset.slug,
            name: preset.name,
            family: preset.family,
            description: preset.description,
            palette: preset.palette,
          }))}
          role={gate.role}
        />
    </AdminPageShell>
  );
}
