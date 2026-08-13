"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEME_PRESETS } from "@/lib/theme-presets";
import type { TenantRow } from "./RotateForm";

export function DistroForm({ tenants, example }: { tenants: TenantRow[]; example: string }) {
  const router = useRouter();
  const [id, setId] = useState(tenants[0]?.id?.toString() || "");
  const [json, setJson] = useState(example);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function applyPreset(slug: string) {
    const preset = THEME_PRESETS.find((p) => p.slug === slug);
    if (!preset) return;
    let distro: any;
    try {
      distro = json.trim() ? JSON.parse(json) : {};
    } catch {
      distro = {};
    }
    distro.palette = { ...preset.palette };
    setJson(JSON.stringify(distro, null, 2));
    setMsg(`preset applied: ${preset.name} (palette only)`);
  }

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      let distro: any;
      try { distro = JSON.parse(json); }
      catch { setMsg("invalid JSON"); setBusy(false); return; }
      const r = await fetch(`/api/operator/tenants/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ distro }),
      });
      if (!r.ok) { setMsg("apply failed"); setBusy(false); return; }
      setMsg("applied");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={go} className="grid gap-4 op-panel p-6">
      <label className="block">
        <span className="op-label">Tenant</span>
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
          className="input-line"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.id} · {t.slug} · {t.studio_name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="op-label">theme.distro.json</span>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="op-label mb-1 text-[9px]">Apply a preset</label>
            <select
              value=""
              onChange={(e) => e.target.value && applyPreset(e.target.value)}
              className="op-btn-sm"
            >
              <option value="">Select preset...</option>
              {THEME_PRESETS.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} - {p.family}
                </option>
              ))}
            </select>
          </div>
        </div>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          className="op-code h-96 w-full resize-y"
        />
      </label>
      {msg ? (
        <p
          className={`font-mono text-[11px] uppercase tracking-[0.18em] ${
            msg === "applied" ? "text-[var(--op-good)]" : "text-ink-mute"
          }`}
        >
          {msg}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !id}
        className="btn-primary justify-self-start h-10 px-5 text-[10px]"
      >
        {busy ? "Applying..." : "Apply distro"}
      </button>
    </form>
  );
}
