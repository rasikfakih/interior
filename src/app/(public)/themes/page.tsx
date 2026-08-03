import Link from "next/link";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { deriveThemeVars } from "@/lib/theme";

export const metadata = {
  title: "Theme palette showcase",
  robots: { index: false },
};

export default function ThemesPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
        The theme system
      </p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-ink md:text-5xl">
        One site, your studio&apos;s palette
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-mute">
        Every install is white-labelled to the buyer. The palettes below are
        the taste-compliant catalog the operator can assign to a tenant; each
        passes the same WCAG AA contrast rule that distro validation enforces.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_PRESETS.map((p) => {
          const { light } = deriveThemeVars(p.palette);
          return (
            <div
              key={p.slug}
              className="flex flex-col overflow-hidden border border-line"
              style={{ background: light["--bg"], color: light["--ink"] }}
            >
              <div
                className="flex h-28 items-center justify-center border-b border-line"
                style={{ background: light["--chrome"] }}
              >
                <span
                  className="px-3 py-1.5 text-sm font-semibold"
                  style={{ background: light["--accent"], color: light["--ink"] }}
                >
                  {p.name}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                  {p.family}
                </p>
                <p className="text-sm leading-relaxed text-ink-mute">{p.description}</p>
                <div className="mt-auto flex items-center gap-2 border-t border-line pt-4">
                  {[p.palette.ink, p.palette.paper, p.palette.accent, p.palette.muted].map(
                    (hex) => (
                      <span
                        key={hex}
                        title={hex}
                        className="h-6 w-6 rounded-full border border-line"
                        style={{ background: hex }}
                      />
                    )
                  )}
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                    {p.slug}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-12 text-sm text-ink-mute">
        See the live studio in its default palette at{" "}
        <Link href="/" className="text-accent underline underline-offset-2">
          the home page
        </Link>
        .
      </p>
    </div>
  );
}
