"use client";

import { useState } from "react";

type SiteIdentityShape = {
  id: number;
  brand_name: string;
  tagline: string | null;
  logo_media_id: number | null;
  favicon_media_id: number | null;
  logo_url: string | null;
  favicon_url: string | null;
  accent_mode: string;
  footer_credit: string | null;
};

type Toast = { kind: "ok" | "err"; msg: string };

const INPUT_CLS =
  "w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-accent focus:outline-none";

const LABEL_CLS =
  "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";

const MAX_LEN = 2000;

function Field({
  label,
  description,
  kind,
  value,
  onChange,
  placeholder,
  options,
  rows,
}: {
  label: string;
  description: string;
  kind: "text" | "longtext" | "url" | "select";
  value: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  options?: string[];
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className={LABEL_CLS}>{label}</label>
      <p className="text-xs text-ink-mute">{description}</p>
      {kind === "longtext" && (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 3}
          placeholder={placeholder}
          className={INPUT_CLS + " resize-y"}
        />
      )}
      {kind === "text" && (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={INPUT_CLS}
        />
      )}
      {kind === "url" && (
        <input
          type="url"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={INPUT_CLS}
        />
      )}
      {kind === "select" && options && (
        <select
          value={value ?? options[0]}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLS}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function AdminSiteIdentity({
  initial,
  role,
}: {
  initial: SiteIdentityShape;
  role: string;
}) {
  const [draft, setDraft] = useState<SiteIdentityShape>(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  function set<K extends keyof SiteIdentityShape>(
    key: K,
    value: SiteIdentityShape[K] | string
  ) {
    setDraft((prev) => ({ ...prev, [key]: value as SiteIdentityShape[K] }));
  }

  async function save() {
    setBusy(true);
    try {
      const body = {
        brand_name: draft.brand_name,
        tagline: draft.tagline,
        accent_mode: draft.accent_mode,
        footer_credit: draft.footer_credit,
        logo_url: draft.logo_url,
        favicon_url: draft.favicon_url,
      };
      const r = await fetch("/api/site-identity", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Save failed (${r.status})`);
        return;
      }
      if (j.item) {
        setDraft({
          ...draft,
          ...j.item,
        });
      }
      showToast("ok", "Saved site identity.");
    } finally {
      setBusy(false);
    }
  }

  function resetField(field: keyof SiteIdentityShape, fallback: string | null) {
    setDraft((prev) => ({ ...prev, [field]: fallback }));
    showToast("ok", `Reset ${String(field)} to default.`);
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-8">
          <p className="chrome-pill mb-3 inline-flex">Site identity</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">
            Brand & accent.
          </h1>
          <p className="text-ink-mute text-sm mt-2">
            Single-row table: brand_name / tagline / accent_mode /
            footer_credit, plus logo_url and favicon_url for tenants
            serving from a CDN-thrashed install. Role:{" "}
            <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-4 flex md:justify-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            id <span className="text-ink">{initial.id}</span>
          </span>
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <main className="md:col-span-12 surface-tile p-6 rounded-[var(--radius-card)] space-y-6">
          <Field
            label="Brand name"
            description="Primary display name. Used in <title>, footer credit, /about hero."
            kind="text"
            value={draft.brand_name}
            onChange={(v) => set("brand_name", v)}
            placeholder="Etihad Interiors"
          />
          <Field
            label="Tagline"
            description="One-line value statement."
            kind="text"
            value={draft.tagline}
            onChange={(v) => set("tagline", v)}
            placeholder="A residential studio shaping considered spaces."
          />
          <Field
            label="Accent mode"
            description="Light, dark, or auto (follows user preference)."
            kind="select"
            value={draft.accent_mode}
            onChange={(v) => set("accent_mode", v)}
            options={["auto", "light", "dark"]}
          />
          <Field
            label="Footer credit"
            description="Footer-side attribution. Rendered in the marketing chrome."
            kind="longtext"
            value={draft.footer_credit}
            onChange={(v) => set("footer_credit", v)}
            placeholder="Powered by Etihad Interiors Theme v1.4.0"
            rows={2}
          />

          <hr className="hairline" />

          <Field
            label="Logo URL"
            description="Direct image URL. Optional. Falls back to /logo.svg when blank. Accepts http(s) only."
            kind="url"
            value={draft.logo_url}
            onChange={(v) => set("logo_url", v)}
            placeholder="https://your-cdn.example.com/logo.svg"
          />
          <Field
            label="Favicon URL"
            description="Direct image URL. Optional. Falls back to /favicon.ico when blank."
            kind="url"
            value={draft.favicon_url}
            onChange={(v) => set("favicon_url", v)}
            placeholder="https://your-cdn.example.com/favicon.svg"
          />

          <div className="flex items-center justify-between pt-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              {Math.max(
                (draft.brand_name ?? "").length,
                (draft.tagline ?? "").length,
                (draft.footer_credit ?? "").length,
                (draft.logo_url ?? "").length,
                (draft.favicon_url ?? "").length
              )}
              /{MAX_LEN} max field length
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(initial);
                  showToast("ok", "Reverted to last server state.");
                }}
                className="btn-ghost"
                disabled={busy}
              >
                Revert
              </button>
              <button
                type="button"
                onClick={() => {
                  resetField("logo_url", null);
                  resetField("favicon_url", null);
                }}
                className="btn-ghost"
                disabled={busy}
              >
                Clear urls
              </button>
              <button
                type="button"
                onClick={save}
                className="btn-primary"
                disabled={busy}
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </main>
      </div>

      <p className="text-xs text-ink-mute">
        Toggle logo_url / favicon_url with{" "}
        <span className="font-mono">Clear urls</span> above; the
        unset state falls back to the studio defaults
        (<span className="font-mono">/logo.svg</span>,{" "}
        <span className="font-mono">/favicon.ico</span>).
      </p>
    </div>
  );
}
