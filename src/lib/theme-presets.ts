import type { ThemePalette } from "@/lib/theme";

/**
 * theme-presets.ts - vendored custom-theme catalog (v1.7.0).
 *
 * Each preset is a taste-compliant palette per design-taste-frontend
 * Section 4.2: single accent, neutral base, WCAG AA contrast between
 * ink/paper and muted/paper, and PALETTE ROTATION (no two families
 * reach for the same warm-craft beige+brass default). The operator
 * assigns a preset to a tenant by copying its palette into the distro;
 * the theme engine applies it at request time.
 *
 * Every palette here is validated by the same contrast rule that
 * scripts/apply-distro.mjs enforces (ink/paper >= 4.5:1, muted/paper
 * >= 4.5:1). Keep it that way when adding themes.
 */

export type ThemePreset = {
  slug: string;
  name: string;
  family: string;
  description: string;
  palette: ThemePalette;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    slug: "forest",
    name: "Forest",
    family: "Deep green / bone / amber",
    description: "The studio default. Calm naturalist read.",
    palette: { ink: "#1f3a2d", paper: "#f2efe7", accent: "#c28b3c", muted: "#5a6b5f" },
  },
  {
    slug: "cold-luxury",
    name: "Cold Luxury",
    family: "Silver graphite / snow / chrome",
    description: "Quiet premium. Steel ink, one icy blue accent.",
    palette: { ink: "#1c2127", paper: "#eef1f4", accent: "#5b7d9e", muted: "#5c6770" },
  },
  {
    slug: "cobalt",
    name: "Cobalt & Cream",
    family: "Saturated blue / single neutral",
    description: "Bold, confident. One blue accent against warm paper.",
    palette: { ink: "#14213d", paper: "#f6f1e7", accent: "#2743c8", muted: "#5a5f72" },
  },
  {
    slug: "olive-brick",
    name: "Olive & Brick",
    family: "Muted olive / brick red",
    description: "Grounded earth. Olive ink, brick-red energy.",
    palette: { ink: "#3a4431", paper: "#f4f0e6", accent: "#a34a2a", muted: "#6a6b56" },
  },
  {
    slug: "terracotta-slate",
    name: "Terracotta & Slate",
    family: "Warm rust / cool grey",
    description: "Warmth against cool. Terracotta accent, slate ink.",
    palette: { ink: "#2f3438", paper: "#f3efe9", accent: "#b4542f", muted: "#5d6668" },
  },
  {
    slug: "monochrome-pop",
    name: "Monochrome + Pop",
    family: "Off-black / off-white / one bright",
    description: "Architectural. Monochrome with a single saturated pop.",
    palette: { ink: "#161616", paper: "#f5f0ea", accent: "#c0185c", muted: "#5c5c5c" },
  },
  {
    slug: "burgundy",
    name: "Burgundy Study",
    family: "Deep maroon / smoke",
    description: "Editorial luxury. Wine ink, muted gold accent.",
    palette: { ink: "#3a1f2c", paper: "#f4efe9", accent: "#a7783f", muted: "#6b5560" },
  },
  {
    slug: "slate-steel",
    name: "Slate & Steel",
    family: "Blue-grey / metal",
    description: "Studio-clean. Cool grey inks, steel accent.",
    palette: { ink: "#27303a", paper: "#eef0f2", accent: "#4d6a8a", muted: "#5b6672" },
  },
];

export function getThemePreset(slug: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.slug === slug);
}
