import AdminTheme from "@/components/admin/AdminTheme";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated } from "@/lib/pg";
import { resolveThemeFull } from "@/lib/theme";
import { THEME_PRESETS } from "@/lib/theme-presets";

export const metadata = {
  title: "Theme",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminThemePage() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return (
      <section className="pt-24 md:pt-28 pb-24">
        <div className="container-page">
          <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
            Sign in is required to edit the theme.
          </p>
        </div>
      </section>
    );
  }

  await ensureMigrated();
  const full = await resolveThemeFull();
  const p = full.palette;

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
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
      </div>
    </section>
  );
}
