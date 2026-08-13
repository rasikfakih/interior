"use client";

import { useState } from "react";

export type TenantRow = {
  id: number;
  slug: string;
  studio_name: string;
};

export function RotateForm({ tenants }: { tenants: TenantRow[] }) {
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
    <form onSubmit={go} className="grid max-w-2xl gap-4 op-panel p-6">
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
      <button
        type="submit"
        disabled={busy || !id}
        className="btn-primary justify-self-start h-10 px-5 text-[10px]"
      >
        {busy ? "Rotating..." : "Rotate to a fresh random key"}
      </button>
      {out?.error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--op-bad)]">
          {out.error}
        </p>
      ) : null}
      {out?.new_key ? (
        <div className="border-t hairline pt-4">
          <p className="op-label">New HMAC key (do not share)</p>
          <pre className="op-code select-all">{out.new_key}</pre>
        </div>
      ) : null}
    </form>
  );
}
