"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Palette = { ink: string; paper: string; accent: string; muted: string };
type Customizer = {
  fonts?: { display?: string; body?: string };
  spacing_density?: 1 | 2 | 3;
  motion_intensity?: number;
  radius_scale?: "sharp" | "soft" | "pill";
};
type PresetPalette = { ink: string; paper: string; accent: string; muted?: string };
type Preset = {
  slug: string;
  name: string;
  family: string;
  description: string;
  palette: PresetPalette;
};

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-accent focus:outline-none";
const LABEL_CLS = "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "newsreader", label: "Newsreader (editorial serif)" },
  { value: "geist", label: "Geist (clean sans)" },
  { value: "inter-tight", label: "Inter Tight (compact sans)" },
  { value: "space-grotesk", label: "Space Grotesk (grotesk display)" },
];

const RADIUS_OPTIONS = [
  { value: "sharp", label: "Sharp (2px, current)" },
  { value: "soft", label: "Soft (14px)" },
  { value: "pill", label: "Pill (full round)" },
];

const DENSITY_OPTIONS = [
  { value: 1, label: "Loose (8rem gaps)" },
  { value: 2, label: "Standard (6rem gaps)" },
  { value: 3, label: "Tight (4rem gaps)" },
];

function isHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  if (!isHex(a) || !isHex(b)) return 0;
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export default function AdminTheme({
  initialPalette,
  initialCustomizer,
  presets,
  role,
}: {
  initialPalette: Palette;
  initialCustomizer: Customizer;
  presets: Preset[];
  role: string;
}) {
  const [palette, setPalette] = useState<Palette>(initialPalette);
  const [customizer, setCustomizer] = useState<Customizer>(initialCustomizer);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }

  const inkPaper = useMemo(
    () => (palette.ink && palette.paper ? contrast(palette.ink, palette.paper) : 0),
    [palette.ink, palette.paper]
  );
  const mutedPaper = useMemo(
    () => (palette.muted && palette.paper ? contrast(palette.muted, palette.paper) : 0),
    [palette.muted, palette.paper]
  );

  function setPaletteKey(key: keyof Palette, value: string) {
    setPalette((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(p: Preset) {
    setPalette({
      ink: p.palette.ink,
      paper: p.palette.paper,
      accent: p.palette.accent,
      muted: p.palette.muted || "",
    });
    showToast("ok", `Applied preset: ${p.name}`);
  }

  async function save() {
    if (!isHex(palette.ink) || !isHex(palette.paper) || !isHex(palette.accent)) {
      showToast("err", "ink, paper and accent must be 6-digit hex colors.");
      return;
    }
    if (inkPaper < 4.5) {
      showToast("err", `ink vs paper contrast is ${inkPaper.toFixed(2)}:1, AA needs 4.5:1.`);
      return;
    }
    if (palette.muted && isHex(palette.muted) && mutedPaper > 0 && mutedPaper < 4.5) {
      showToast("err", `muted vs paper contrast is ${mutedPaper.toFixed(2)}:1, AA needs 4.5:1.`);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/theme", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palette, customizer }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Save failed (${r.status})`);
        return;
      }
      showToast("ok", "Theme saved. Live site reflects it on next load.");
    } finally {
      setBusy(false);
    }
  }

  const previewStyle: Record<string, string> = {
    "--preview-bg": palette.paper,
    "--preview-ink": palette.ink,
    "--preview-muted": palette.muted || palette.ink,
    "--preview-accent": palette.accent,
    "--preview-radius":
      customizer.radius_scale === "soft"
        ? "14px"
        : customizer.radius_scale === "pill"
          ? "9999px"
          : "2px",
    "--preview-display": FONT_STACK(customizer.fonts?.display || "newsreader"),
    "--preview-body": FONT_STACK(customizer.fonts?.body || "geist"),
  };
  const previewStyleCss = previewStyle as CSSProperties;

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-8">
          <p className="chrome-pill mb-3 inline-flex">Theme</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">Customize the site.</h1>
          <p className="text-ink-mute text-sm mt-2">
            Palette, type, density, motion and radius. Saves to this
            tenant&apos;s distro row; the public site re-renders on next
            request. Role: <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-4 flex md:justify-end gap-2">
          <a href="/" className="btn-ghost" target="_blank" rel="noreferrer">
            Open site
          </a>
          <button type="button" onClick={save} className="btn-primary" disabled={busy}>
            {busy ? "Saving..." : "Save theme"}
          </button>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className={`surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] ${
            toast.kind === "err" ? "text-red-700" : "text-accent"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <main className="lg:col-span-7 space-y-8">
          <section className="surface-tile p-6 rounded-[var(--radius-card)] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg tracking-tight">Palette</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                {inkPaper >= 4.5 ? "AA ink ok" : "AA ink FAIL"} ·{" "}
                {mutedPaper >= 4.5 ? "AA muted ok" : "AA muted FAIL"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(["ink", "paper", "accent", "muted"] as const).map((k) => (
                <ColorField
                  key={k}
                  label={k}
                  value={palette[k]}
                  onChange={(v) => setPaletteKey(k, v)}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ContrastRow label="ink / paper" ratio={inkPaper} />
              <ContrastRow label="muted / paper" ratio={mutedPaper} />
            </div>
          </section>

          <section className="surface-tile p-6 rounded-[var(--radius-card)] space-y-5">
            <h2 className="text-lg tracking-tight">Type</h2>
            <SelectField
              label="Display font"
              description="Headlines. Newsreader is the editorial default."
              value={customizer.fonts?.display ?? "newsreader"}
              options={FONT_OPTIONS}
              onChange={(v) =>
                setCustomizer((prev) => ({
                  ...prev,
                  fonts: { ...(prev.fonts ?? {}), display: v },
                }))
              }
            />
            <SelectField
              label="Body font"
              description="Paragraphs and UI. Geist is the default."
              value={customizer.fonts?.body ?? "geist"}
              options={FONT_OPTIONS}
              onChange={(v) =>
                setCustomizer((prev) => ({
                  ...prev,
                  fonts: { ...(prev.fonts ?? {}), body: v },
                }))
              }
            />
          </section>

          <section className="surface-tile p-6 rounded-[var(--radius-card)] space-y-5">
            <h2 className="text-lg tracking-tight">Rhythm & motion</h2>
            <SelectField
              label="Section spacing"
              description="Vertical gaps between page sections."
              value={String(customizer.spacing_density ?? 2)}
              options={DENSITY_OPTIONS.map((d) => ({
                value: String(d.value),
                label: d.label,
              }))}
              onChange={(v) =>
                setCustomizer((prev) => ({
                  ...prev,
                  spacing_density: Number(v) as 1 | 2 | 3,
                }))
              }
            />
            <SelectField
              label="Corner radius"
              description="Card and control corners."
              value={customizer.radius_scale ?? "sharp"}
              options={RADIUS_OPTIONS}
              onChange={(v) =>
                setCustomizer((prev) => ({
                  ...prev,
                  radius_scale: v as "sharp" | "soft" | "pill",
                }))
              }
            />
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>
                Motion intensity · {customizer.motion_intensity ?? 6}/10
              </label>
              <p className="text-xs text-ink-mute">
                Scroll reveals, parallax and micro-interactions. Honors
                prefers-reduced-motion either way.
              </p>
              <input
                type="range"
                min={1}
                max={10}
                value={customizer.motion_intensity ?? 6}
                onChange={(e) =>
                  setCustomizer((prev) => ({
                    ...prev,
                    motion_intensity: Number(e.target.value),
                  }))
                }
                className="w-full accent-[var(--accent)]"
                aria-label="Motion intensity"
              />
            </div>
          </section>
        </main>

        {/* Live preview */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="surface-tile p-6 rounded-[var(--radius-card)]">
            <p className={LABEL_CLS + " mb-4"}>Live preview</p>
            <div
              className="rounded-[var(--preview-radius)] border p-6 space-y-4"
              style={{
                ...previewStyleCss,
                backgroundColor: previewStyle["--preview-bg"],
                color: previewStyle["--preview-ink"],
                borderColor: "color-mix(in srgb, var(--preview-ink) 18%, transparent)",
                fontFamily: previewStyle["--preview-body"],
              }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{ color: previewStyle["--preview-accent"] }}
              >
                Studio · Est. 2017
              </p>
              <h3
                className="text-2xl leading-[1.05] pb-1"
                style={{
                  fontFamily: previewStyle["--preview-display"],
                  fontWeight: 500,
                  letterSpacing: "-0.015em",
                }}
              >
                Homes built around <em>how you live</em>.
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: previewStyle["--preview-muted"] }}>
                Twenty-four weeks. One team. Drawings, materials, and
                on-site direction from the same hands.
              </p>
              <div className="flex gap-2 pt-1">
                <span
                  className="inline-flex items-center px-4 py-2 text-[11px] uppercase tracking-[0.06em] font-medium"
                  style={{
                    backgroundColor: previewStyle["--preview-ink"],
                    color: previewStyle["--preview-bg"],
                    borderRadius: previewStyle["--preview-radius"],
                  }}
                >
                  Start a project
                </span>
                <span
                  className="inline-flex items-center px-4 py-2 text-[11px] uppercase tracking-[0.06em] font-medium border"
                  style={{
                    color: previewStyle["--preview-ink"],
                    borderRadius: previewStyle["--preview-radius"],
                    borderColor: "color-mix(in srgb, var(--preview-ink) 40%, transparent)",
                  }}
                >
                  View work
                </span>
              </div>
            </div>
          </div>

          <div className="surface-tile p-6 rounded-[var(--radius-card)]">
            <p className={LABEL_CLS + " mb-4"}>Presets</p>
            <div className="grid grid-cols-2 gap-3">
              {presets.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="text-left border hairline rounded-[var(--radius-control)] p-3 hover:bg-[var(--surface-strong)] transition-colors"
                >
                  <div className="flex gap-1.5 mb-2">
                    <span
                      className="w-5 h-5 rounded-full border border-black/10"
                      style={{ backgroundColor: p.palette.ink }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border border-black/10"
                      style={{ backgroundColor: p.palette.paper }}
                    />
                    <span
                      className="w-5 h-5 rounded-full border border-black/10"
                      style={{ backgroundColor: p.palette.accent }}
                    />
                  </div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[11px] text-ink-mute mt-0.5">{p.family}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FONT_STACK(token: string): string {
  switch (token) {
    case "inter-tight":
      return "var(--font-inter-tight), var(--font-geist-sans), system-ui, sans-serif";
    case "space-grotesk":
      return "var(--font-space-grotesk), var(--font-geist-sans), system-ui, sans-serif";
    case "geist":
      return "var(--font-geist-sans), Inter, system-ui, sans-serif";
    default:
      return "var(--font-newsreader), Georgia, serif";
  }
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = isHex(value);
  return (
    <div className="space-y-1.5">
      <label className={LABEL_CLS}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHex(value) ? value : "#122a20"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-[var(--radius-control)] border hairline bg-transparent cursor-pointer"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            INPUT_CLS +
            " font-mono text-xs " +
            (valid ? "" : " border-red-700 text-red-700")
          }
          placeholder="#000000"
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

function ContrastRow({ label, ratio }: { label: string; ratio: number }) {
  const ok = ratio >= 4.5;
  return (
    <div className="flex items-center justify-between border hairline rounded-[var(--radius-control)] px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
        {label}
      </span>
      <span className={`font-mono text-xs ${ok ? "text-accent" : "text-red-700"}`}>
        {ratio > 0 ? `${ratio.toFixed(2)}:1` : "-"} {ok ? "AA" : "FAIL"}
      </span>
    </div>
  );
}

function SelectField({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className={LABEL_CLS}>{label}</label>
      <p className="text-xs text-ink-mute">{description}</p>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
