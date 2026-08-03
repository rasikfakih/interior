import "server-only";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { getStudioBrand } from "@/lib/studio-brand";

/**
 * theme.ts - per-tenant custom theme engine (v1.7.0).
 *
 * Resolves the effective palette for the served tenant and derives
 * the full set of CSS custom properties the site consumes (the
 * var(--ink) / var(--accent) / ... surface defined in
 * src/app/globals.css). The palette validation already lives in
 * scripts/apply-distro.mjs; this module is the missing half that
 * actually APPLIES the stored palette to the rendered site.
 *
 * Resolution order (first hit wins):
 *   1. Postgres tenant_data distro row for the tenant matched by
 *      domain -> slug -> single default tenant.
 *   2. data/studio-brand.json (the shipped white-label neutral).
 *   3. Built-in defaults (the globals.css forest palette).
 */

export type ThemePalette = {
  ink: string;
  paper: string;
  accent: string;
  muted?: string;
  accent_mode?: "auto" | "light" | "dark";
};

export type ThemeVars = { light: Record<string, string>; dark: Record<string, string> };

const DEFAULT_PALETTE: ThemePalette = {
  ink: "#1f3a2d",
  paper: "#f2efe7",
  accent: "#c28b3c",
  muted: "#5a6b5f",
};

export async function resolveTheme(
  domain?: string | null,
  slug?: string | null
): Promise<ThemeVars> {
  const palette = await readEffectivePalette(domain, slug);
  return deriveThemeVars(palette);
}

async function readEffectivePalette(
  domain?: string | null,
  slug?: string | null
): Promise<ThemePalette> {
  // 1. Postgres distro row.
  try {
    await ensureMigrated();
    const tenant = await pgOne<{ id: number }>(
      slug
        ? `SELECT id FROM tenants WHERE slug = $1 ORDER BY id ASC LIMIT 1`
        : domain
          ? `SELECT id FROM tenants WHERE domain = $1 ORDER BY id ASC LIMIT 1`
          : `SELECT id FROM tenants ORDER BY id ASC LIMIT 1`,
      slug ? [slug] : domain ? [domain] : []
    );
    if (tenant?.id != null) {
      const distroRow = await pgOne<{ data: unknown }>(
        `SELECT data FROM tenant_data
         WHERE tenant_id = $1 AND kind = 'distro'
         ORDER BY updated_at DESC LIMIT 1`,
        [tenant.id]
      );
      const parsed = parseDistroPalette(distroRow?.data);
      if (parsed) return parsed;
    }
  } catch {
    // Fall through to file-based brand.
  }

  // 2. data/studio-brand.json
  const brand = getStudioBrand();
  const bp = brand.palette;
  if (bp?.ink && bp?.paper && bp?.accent) {
    return { ink: bp.ink, paper: bp.paper, accent: bp.accent, muted: bp.muted };
  }

  // 3. Built-in defaults.
  return DEFAULT_PALETTE;
}

function parseDistroPalette(data: unknown): ThemePalette | null {
  if (typeof data !== "object" || data == null) return null;
  const d = data as Record<string, unknown>;
  const p = d.palette as Record<string, unknown> | undefined;
  if (!p || typeof p !== "object") return null;
  const ink = p.ink as string;
  const paper = p.paper as string;
  const accent = p.accent as string;
  if (!isHex(ink) || !isHex(paper) || !isHex(accent)) return null;
  const muted = typeof p.muted === "string" && isHex(p.muted) ? p.muted : mix(ink, paper, 0.45);
  return { ink, paper, accent, muted };
}

/**
 * Derive the full var set from a 4-color palette, mirroring the
 * ratios baked into src/app/globals.css so the derived value stays
 * taste-consistent. Dark mode inverts ink/paper and lifts accent.
 */
export function deriveThemeVars(p: ThemePalette): ThemeVars {
  const ink = p.ink;
  const paper = p.paper;
  const accent = p.accent;
  const muted = p.muted || mix(ink, paper, 0.45);
  const accentDeep = mix(accent, paper, 0.35);
  const accentLight = mix(accent, paper, 0.45);

  const light: Record<string, string> = {
    "--bg": paper,
    "--bg-elev": mix(paper, ink, 0.06),
    "--surface": withAlpha(ink, 0.04),
    "--surface-strong": withAlpha(ink, 0.08),
    "--ink": ink,
    "--ink-mute": muted,
    "--ink-soft": mix(ink, paper, 0.5),
    "--line": withAlpha(ink, 0.16),
    "--line-strong": withAlpha(ink, 0.32),
    "--accent": accent,
    "--accent-deep": accentDeep,
    "--accent-soft": withAlpha(accent, 0.18),
    "--chrome": `linear-gradient(135deg, ${mix(accent, paper, 0.62)} 0%, ${accent} 50%, ${accentDeep} 100%)`,
    "--shadow-ambient": `0 30px 60px -30px ${withAlpha(ink, 0.28)}`,
  };

  // Dark: swap ink <-> paper roles, lift accent for contrast on dark.
  const darkPaper = mix(ink, "#000000", 0.42); // near-black derived from brand ink
  const darkInk = mix(paper, "#ffffff", 0.06);
  const dark: Record<string, string> = {
    "--bg": darkPaper,
    "--bg-elev": mix(darkPaper, darkInk, 0.08),
    "--surface": withAlpha(darkInk, 0.04),
    "--surface-strong": withAlpha(darkInk, 0.08),
    "--ink": darkInk,
    "--ink-mute": mix(darkInk, darkPaper, 0.28),
    "--ink-soft": mix(darkInk, darkPaper, 0.5),
    "--line": withAlpha(darkInk, 0.16),
    "--line-strong": withAlpha(darkInk, 0.28),
    "--accent": accentLight,
    "--accent-deep": mix(accentLight, "#ffffff", 0.25),
    "--accent-soft": withAlpha(accentLight, 0.22),
    "--chrome": `linear-gradient(135deg, ${mix(accentLight, "#ffffff", 0.2)} 0%, ${accentLight} 50%, ${mix(accentLight, "#000000", 0.3)} 100%)`,
    "--shadow-ambient": `0 30px 60px -30px ${withAlpha("#000000", 0.6)}`,
  };

  return { light, dark };
}

/** Build the <style> string that overrides globals.css defaults. */
export function themeVarsStyle(theme: ThemeVars): string {
  const light = toCss(theme.light);
  const dark = toCss(theme.dark);
  return `:root{${light}}html.dark{${dark}}`;
}

function toCss(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
}

// --- color utils (stdlib, no deps) ---

export function isHex(s: unknown): s is string {
  return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix two hex colors; amount 0 = a, 1 = b. */
export function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(
    ar + (br - ar) * amount,
    ag + (bg - ag) * amount,
    ab + (bb - ab) * amount
  );
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
