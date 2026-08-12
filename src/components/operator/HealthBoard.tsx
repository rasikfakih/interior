"use client";

import { useEffect, useState } from "react";

type Row = {
  id: number;
  slug: string;
  studio_name: string;
  domain: string | null;
  state: string;
  health_status: string;
  last_health_at: string | null;
};

type ProbeResult = {
  tenantId: number;
  status: "ok" | "down" | "unknown";
  ms: number | null;
  base?: string;
  ts?: string;
  reason?: string;
};

const DOT: Record<string, string> = {
  ok: "bg-emerald-500",
  down: "bg-red-500",
  unknown: "bg-zinc-300",
};

const LABEL: Record<string, string> = {
  ok: "Up",
  down: "Down",
  unknown: "Unknown",
};

export function HealthBoard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [probe, setProbe] = useState<Record<number, ProbeResult>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/operator/health", { credentials: "include" });
        if (!r.ok) throw new Error(`health ${r.status}`);
        const j = await r.json();
        if (cancelled) return;
        setRows(Array.isArray(j.items) ? j.items : []);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    try {
      const r = await fetch("/api/operator/health", { credentials: "include" });
      if (!r.ok) throw new Error(`health ${r.status}`);
      const j = await r.json();
      setRows(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function probeNow() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/operator/health", {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`probe ${r.status}`);
      const j = await r.json();
      const map: Record<number, ProbeResult> = {};
      for (const p of j.results || []) map[p.tenantId] = p;
      setProbe(map);
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const merged = rows.map((r) => ({
    ...r,
    probe: probe[r.id] ?? null,
  }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Probes {rows.length} tenant
          {rows.length === 1 ? "" : "s"} against /api/health · 8s timeout
        </p>
        <button
          type="button"
          onClick={probeNow}
          disabled={busy || rows.length === 0}
          className="border border-zinc-300 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-700 hover:border-zinc-700 hover:text-zinc-900 disabled:opacity-60"
        >
          {busy ? "Probing..." : "Probe now"}
        </button>
      </div>

      {err ? (
        <div role="alert" className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      <div className="overflow-x-auto border border-zinc-200 bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              {["Tenant", "State", "Status", "Probe base", "Latency", "Last checked"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : merged.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No tenants yet.
                </td>
              </tr>
            ) : (
              merged.map((r) => {
                const status = r.probe?.status ?? r.health_status;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">{r.slug}</span>
                      <span className="ml-2 text-xs text-zinc-500">{r.studio_name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-600">
                      {r.state}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                        <span className={`h-2 w-2 rounded-full ${DOT[status] ?? DOT.unknown}`} />
                        {LABEL[status] ?? status}
                        {r.probe?.reason ? (
                          <span className="text-zinc-400 normal-case tracking-normal">
                            · {r.probe.reason}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                      {r.probe?.base ?? (r.domain ? `https://${r.domain}` : "studio origin")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                      {r.probe?.ms != null ? `${r.probe.ms}ms` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                      {(r.probe?.ts ?? r.last_health_at) ?? null
                        ? new Date((r.probe?.ts ?? r.last_health_at) as string).toLocaleString()
                        : "never"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
