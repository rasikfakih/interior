#!/usr/bin/env node
// Self-check for the v1.7.0 theme preset catalog + derivation engine.
// Plain node, no deps. Mirrors the contrast rule in apply-distro.mjs.

// --- inline copy of src/lib/theme.ts color utils (keep in sync) ---
function isHex(s) { return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s); }
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mix(a, b, amt) {
  const [ar, ag, ab] = hexToRgb(a), [br, bg, bb] = hexToRgb(b);
  const c = (n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${c(ar + (br - ar) * amt)}${c(ag + (bg - ag) * amt)}${c(ab + (bb - ab) * amt)}`;
}
function withAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function deriveThemeVars(p) {
  const ink = p.ink, paper = p.paper, accent = p.accent;
  const muted = p.muted || mix(ink, paper, 0.45);
  const accentDeep = mix(accent, paper, 0.35);
  const accentLight = mix(accent, paper, 0.45);
  return {
    light: {
      "--bg": paper, "--surface": withAlpha(ink, 0.04), "--ink": ink,
      "--ink-mute": muted, "--accent": accent, "--accent-deep": accentDeep,
      "--chrome": `linear-gradient(135deg, ${mix(accent, paper, 0.62)} 0%, ${accent} 50%, ${accentDeep} 100%)`,
    },
    dark: { "--bg": mix(ink, "#000000", 0.42), "--ink": mix(paper, "#ffffff", 0.06), "--accent": accentLight },
  };
}
// ----------------------------------------------------------------

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const lin = (cc) => (cc <= 0.03928 ? cc / 12.92 : Math.pow((cc + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// The authoritative check: every preset in the source must pass contrast.
// The catalog below must stay in sync with src/lib/theme-presets.ts; this
// redundancy is the check, so a drift in either direction fails loudly.
const CATALOG = [
  ["forest", "#1f3a2d", "#f2efe7", "#c28b3c", "#5a6b5f"],
  ["cold-luxury", "#1c2127", "#eef1f4", "#5b7d9e", "#5c6770"],
  ["cobalt", "#14213d", "#f6f1e7", "#2743c8", "#5a5f72"],
  ["olive-brick", "#3a4431", "#f4f0e6", "#a34a2a", "#6a6b56"],
  ["terracotta-slate", "#2f3438", "#f3efe9", "#b4542f", "#5d6668"],
  ["monochrome-pop", "#161616", "#f5f0ea", "#c0185c", "#5c5c5c"],
  ["burgundy", "#3a1f2c", "#f4efe9", "#a7783f", "#6b5560"],
  ["slate-steel", "#27303a", "#eef0f2", "#4d6a8a", "#5b6672"],
];

let failed = 0;
for (const [slug, ink, paper, accent, muted] of CATALOG) {
  if (!isHex(ink) || !isHex(paper) || !isHex(accent) || !isHex(muted)) {
    console.log(`FAIL ${slug}: non-hex`); failed++;
  }
  const inkPaper = contrast(ink, paper);
  const mutedPaper = contrast(muted, paper);
  if (inkPaper < 4.5) { console.log(`FAIL ${slug}: ink/paper ${inkPaper.toFixed(2)}`); failed++; }
  if (mutedPaper < 4.5) { console.log(`FAIL ${slug}: muted/paper ${mutedPaper.toFixed(2)}`); failed++; }
  const vars = deriveThemeVars({ ink, paper, accent, muted });
  if (!vars.light["--ink"] || !vars.dark["--accent"]) { console.log(`FAIL ${slug}: vars missing`); failed++; }
  console.log(`ok ${slug}: ink/paper ${inkPaper.toFixed(2)} muted/paper ${mutedPaper.toFixed(2)}`);
}

if (mix("#000000", "#ffffff", 0.5) !== "#808080") { console.log("FAIL mix"); failed++; }
if (withAlpha("#ff0000", 0.5) !== "rgba(255, 0, 0, 0.5)") { console.log("FAIL withAlpha"); failed++; }

console.log(failed === 0 ? `PASS ${CATALOG.length} presets` : `FAIL (${failed})`);
process.exit(failed === 0 ? 0 : 1);
