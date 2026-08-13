"use client";

import { useState } from "react";

export function IssueForm({ tenants }: { tenants: any[] }) {
  const [id, setId] = useState(tenants[0]?.id?.toString() || "");
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOut(null);
    try {
      const r = await fetch("/api/operator/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_id: Number(id) }),
      });
      const j = await r.json();
      if (!r.ok) {
        setOut({ error: j.error || "issue failed" });
        return;
      }
      setOut(j.license);
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
          className="input-line"
          required
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.id} · {t.slug} · {t.studio_name} ({t.tier})
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={busy || !id}
        className="btn-primary justify-self-start h-10 px-5 text-[10px]"
      >
        {busy ? "Issuing..." : "Issue license"}
      </button>

      {out ? (
        <div className="border-t hairline pt-4">
          {out.error ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--op-bad)]">
              {out.error}
            </p>
          ) : (
            <>
              <p className="op-label">License payload</p>
              <pre className="op-code">{JSON.stringify(out, null, 2)}</pre>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}
