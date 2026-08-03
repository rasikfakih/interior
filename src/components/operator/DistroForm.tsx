"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEME_PRESETS } from "@/lib/theme-presets";

export function DistroForm({ tenants, example }: { tenants: any[]; example: string }) {
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
    <form onSubmit={go} className="grid gap-4 border border-zinc-200 bg-white p-6">
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">Tenant</span>
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
          className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.id} · {t.slug} · {t.studio_name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">theme.distro.json</span>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">Apply a preset</label>
            <select
              value=""
              onChange={(e) => e.target.value && applyPreset(e.target.value)}
              className="ml-2 border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none"
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
          className="h-96 w-full resize-y border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs focus:border-zinc-700 focus:outline-none"
        />
      </label>
      {msg ? <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">{msg}</p> : null}
      <button
        type="submit"
        disabled={busy || !id}
        className="justify-self-start bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {busy ? "Applying..." : "Apply distro"}
      </button>
    </form>
  );
}
