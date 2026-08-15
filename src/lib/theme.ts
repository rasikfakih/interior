import "server-only";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { getStudioBrand } from "@/lib/studio-brand";

/**
 * theme.ts - per-tenant custom theme engine (v1.7.0, extended v2.0).
 *
 * Resolves the effective palette AND customizer tokens (fonts, spacing
 * density, motion intensity, radius) for the served tenant and derives
 * the full set of CSS custom properties the site consumes (the
 * var(--ink) / var(--accent) / var(--font-display) / ... surface
 * defined in src/app/globals.css). The palette validation already
 * lives in scripts/apply-distro.mjs; this module is the missing half
 * that actually APPLIES the stored distro to the rendered site.
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

export type ThemeFontToken =
  | "instrument"
  | "newsreader"
  | "geist"
  | "inter-tight"
  | "space-grotesk";
export type RadiusScale = "sharp" | "soft" | "pill";

/**
 * Customizer tokens, the tenant-controlled surface (Phase 1 admin
 * "Theme" tab writes these into the distro row). All optional; the
 * engine only overrides what the distro declares.
 */
export type ThemeCustomizer = {
  fonts?: { display?: ThemeFontToken; body?: ThemeFontToken };
  spacing_density?: 1 | 2 | 3;
  motion_intensity?: number; // 1..10
  radius_scale?: RadiusScale;
};

export type ResolvedTheme = {
  vars: ThemeVars;
  palette: ThemePalette;
  customizer: ThemeCustomizer;
  raw: Record<string, unknown> | null;
};

export type ThemeVars = { light: Record<string, string>; dark: Record<string, string> };

export const DEFAULT_PALETTE: ThemePalette = {
  ink: "#122a20",
  paper: "#ecece6",
  accent: "#c0964f",
  muted: "#56605a",
};

export const FONT_TOKENS: ThemeFontToken[] = [
  "instrument",
  "newsreader",
  "geist",
  "inter-tight",
  "space-grotesk",
];

// Font stacks reference the next/font CSS variables declared in
// src/app/layout.tsx. A token whose font is not loaded falls back to
// the system stack, so an old bundle serving a new distro degrades
// gracefully instead of breaking.
//
// M0 (2026-08-15): Instrument Serif is the one display voice. Tenants
// without an explicit font choice fall back to instrument (see
// customizerVars), and the admin theme picker now offers it.
const DISPLAY_FONT_STACKS: Record<ThemeFontToken, string> = {
  instrument: 'var(--font-instrument), var(--font-newsreader), Georgia, serif',
  newsreader: 'var(--font-newsreader), Georgia, "Iowan Old Style", serif',
  geist: 'var(--font-geist-sans), "Inter", system-ui, sans-serif',
  "inter-tight": "var(--font-inter-tight), var(--font-geist-sans), system-ui, sans-serif",
  "space-grotesk": "var(--font-space-grotesk), var(--font-geist-sans), system-ui, sans-serif",
};

const BODY_FONT_STACKS: Record<ThemeFontToken, string> = {
  instrument: 'var(--font-instrument), var(--font-newsreader), Georgia, serif',
  newsreader: 'var(--font-newsreader), Georgia, "Iowan Old Style", serif',
  geist: 'var(--font-geist-sans), "Inter", system-ui, sans-serif',
  "inter-tight": "var(--font-inter-tight), var(--font-geist-sans), system-ui, sans-serif",
  "space-grotesk": "var(--font-space-grotesk), var(--font-geist-sans), system-ui, sans-serif",
};

function isFontToken(v: unknown): v is ThemeFontToken {
  return typeof v === "string" && (FONT_TOKENS as string[]).includes(v);
}

/**
 * Normalize a distro row payload. Postgres stores JSONB (object);
 * SQLite stores TEXT (JSON string). Accept both so the engine reads
 * the distro row on every runtime path, not just Postgres.
 */
function normalizeData(data: unknown): Record<string, unknown> | null {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return typeof parsed === "object" && parsed != null ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof data === "object" && data != null) return data as Record<string, unknown>;
  return null;
}

/** Parse the customizer surface from a distro data object. */
export function parseCustomizer(data: unknown): ThemeCustomizer {
  const d = normalizeData(data);
  if (!d) return {};
  const out: ThemeCustomizer = {};
  if (d.fonts && typeof d.fonts === "object" && !Array.isArray(d.fonts)) {
    const f = d.fonts as Record<string, unknown>;
    const fonts: ThemeCustomizer["fonts"] = {};
    if (isFontToken(f.display)) fonts.display = f.display;
    if (isFontToken(f.body)) fonts.body = f.body;
    if (fonts.display || fonts.body) out.fonts = fonts;
  }
  if (d.spacing_density === 1 || d.spacing_density === 2 || d.spacing_density === 3) {
    out.spacing_density = d.spacing_density;
  }
  if (
    typeof d.motion_intensity === "number" &&
    Number.isFinite(d.motion_intensity) &&
    d.motion_intensity >= 1 &&
    d.motion_intensity <= 10
  ) {
    out.motion_intensity = Math.round(d.motion_intensity);
  }
  if (d.radius_scale === "sharp" || d.radius_scale === "soft" || d.radius_scale === "pill") {
    out.radius_scale = d.radius_scale;
  }
  return out;
}

/**
 * CSS custom properties derived from the customizer tokens. These
 * ride in the same themeVarsStyle() <style> block as the palette so a
 * tenant's fonts / density / motion / radius land in one injection.
 */
export function customizerVars(c: ThemeCustomizer): Record<string, string> {
  const out: Record<string, string> = {};
  const f = c.fonts ?? {};
  // One display voice: Instrument Serif unless the tenant explicitly
  // chose another stack in the theme customizer. Always emitted so the
  // public pages and admin console agree regardless of distro state.
  out["--font-display"] =
    f.display && DISPLAY_FONT_STACKS[f.display]
      ? DISPLAY_FONT_STACKS[f.display]
      : DISPLAY_FONT_STACKS.instrument;
  out["--font-sans"] =
    f.body && BODY_FONT_STACKS[f.body]
      ? BODY_FONT_STACKS[f.body]
      : 'var(--font-geist-sans), "Inter", system-ui, sans-serif';
  if (c.radius_scale === "soft") {
    out["--radius-control"] = "12px";
    out["--radius-card"] = "14px";
  } else if (c.radius_scale === "pill") {
    out["--radius-control"] = "9999px";
    out["--radius-card"] = "9999px";
  }
  if (c.spacing_density === 1) out["--section-gap"] = "8rem";
  else if (c.spacing_density === 2) out["--section-gap"] = "6rem";
  else if (c.spacing_density === 3) out["--section-gap"] = "4rem";
  if (typeof c.motion_intensity === "number") {
    out["--motion-level"] = String(c.motion_intensity);
  }
  return out;
}

export async function resolveTheme(
  domain?: string | null,
  slug?: string | null
): Promise<ThemeVars> {
  const resolved = await readEffectiveTheme(domain, slug);
  return deriveThemeVars(resolved.palette, resolved.customizer);
}

/**
 * Resolve the tenant the admin console edits: domain -> slug -> the
 * first (default) tenant, mirroring readEffectiveTheme's tenant match.
 * Returns null when no tenant exists (fresh install before seed).
 */
export async function resolveAdminTenantId(): Promise<number | null> {
  try {
    await ensureMigrated();
    const row = await pgOne<{ id: number }>(
      `SELECT id FROM tenants ORDER BY id ASC LIMIT 1`
    );
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/** Full resolution (vars + customizer tokens + raw distro) for the admin API. */
export async function resolveThemeFull(
  domain?: string | null,
  slug?: string | null
): Promise<ResolvedTheme> {
  const resolved = await readEffectiveTheme(domain, slug);
  return {
    vars: deriveThemeVars(resolved.palette, resolved.customizer),
    palette: resolved.palette,
    customizer: resolved.customizer,
    raw: resolved.raw,
  };
}

async function readEffectiveTheme(
  domain?: string | null,
  slug?: string | null
): Promise<{
  palette: ThemePalette;
  customizer: ThemeCustomizer;
  raw: Record<string, unknown> | null;
}> {
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
      const data = distroRow?.data ?? null;
      const palette = parseDistroPalette(data);
      if (palette) {
        return { palette, customizer: parseCustomizer(data), raw: normalizeData(data) };
      }
    }
  } catch {
    // Fall through to file-based brand.
  }

  // 2. data/studio-brand.json
  const brand = getStudioBrand();
  const bp = brand.palette;
  if (bp?.ink && bp?.paper && bp?.accent) {
    return {
      palette: { ink: bp.ink, paper: bp.paper, accent: bp.accent, muted: bp.muted },
      customizer: {},
      raw: null,
    };
  }

  // 3. Built-in defaults.
  return { palette: DEFAULT_PALETTE, customizer: {}, raw: null };
}

function parseDistroPalette(data: unknown): ThemePalette | null {
  const d = normalizeData(data);
  if (!d) return null;
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
 * Optional customizer tokens add font / radius / density / motion vars.
 */
export function deriveThemeVars(p: ThemePalette, customizer?: ThemeCustomizer): ThemeVars {
  const ink = p.ink;
  const paper = p.paper;
  const accent = p.accent;
  const muted = p.muted || mix(ink, paper, 0.45);
  // Role split (light mode): the bright brand accent is decorative
  // (chrome, soft tints, hovers), while text in accent needs a darker
  // variant that clears WCAG AA on the paper background. Mixing with
  // black (not paper) keeps the hue and guarantees >= 4.5:1 for every
  // preset palette. Dark mode keeps its own light-gold accent-deep.
  const accentDeep = mix(accent, "#000000", 0.42);
  const accentLight = mix(accent, paper, 0.45);
  const custom = customizer ? customizerVars(customizer) : {};

  const light: Record<string, string> = {
    "--bg": paper,
    "--bg-elev": mix(paper, ink, 0.06),
    "--surface": withAlpha(ink, 0.04),
    "--surface-strong": withAlpha(ink, 0.08),
    "--ink": ink,
    "--ink-mute": muted,
    // Darker than muted so soft/placeholder text still clears 4.5:1
    // on paper (mix 0.5 fails at ~3:1 for the default palettes).
    "--ink-soft": mix(ink, paper, 0.32),
    "--line": withAlpha(ink, 0.16),
    "--line-strong": withAlpha(ink, 0.32),
    "--accent": accent,
    "--accent-deep": accentDeep,
    "--accent-soft": withAlpha(accent, 0.18),
    "--chrome": `linear-gradient(135deg, ${mix(accent, paper, 0.62)} 0%, ${accent} 50%, ${accentDeep} 100%)`,
    "--shadow-ambient": `0 30px 60px -30px ${withAlpha(ink, 0.28)}`,
    ...custom,
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
    ...custom,
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

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const lin = (cc: number) => (cc <= 0.03928 ? cc / 12.92 : Math.pow((cc + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
