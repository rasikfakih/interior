"use client";

import { useState } from "react";

export function RotateForm({ tenants }: { tenants: any[] }) {
  const [id, setId] = useState(tenants[0]?.id?.toString() || "");
  const [out, setOut] = useState<{ new_key?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOut(null);
    try {
      const r = await fetch("/api/operator/rotate-hmac", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_id: Number(id) }),
      });
      const j = await r.json();
      if (!r.ok) {
        setOut({ error: j.error || "rotation failed" });
        return;
      }
      setOut({ new_key: j.new_key });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={go} className="grid max-w-2xl gap-4 border border-zinc-200 bg-white p-6">
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
      <button
        type="submit"
        disabled={busy || !id}
        className="justify-self-start bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {busy ? "Rotating..." : "Rotate to a fresh random key"}
      </button>
      {out?.error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red-700">{out.error}</p>
      ) : null}
      {out?.new_key ? (
        <div className="border-t border-zinc-200 pt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">New HMAC key (do not share)</p>
          <pre className="mt-2 select-all overflow-x-auto bg-zinc-50 p-4 font-mono text-xs text-zinc-800">{out.new_key}</pre>
        </div>
      ) : null}
    </form>
  );
}
