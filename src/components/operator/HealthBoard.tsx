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
  ok: "op-dot--good",
  down: "op-dot--bad",
  unknown: "op-dot--off",
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
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Probes {rows.length} tenant
          {rows.length === 1 ? "" : "s"} against /api/health · 8s timeout
        </p>
        <button
          type="button"
          onClick={probeNow}
          disabled={busy || rows.length === 0}
          className="op-btn-sm"
        >
          {busy ? "Probing..." : "Probe now"}
        </button>
      </div>

      {err ? (
        <div role="alert" className="op-banner op-banner--bad">
          {err}
        </div>
      ) : null}

      <div className="op-panel overflow-x-auto">
        <table className="op-table">
          <thead>
            <tr>
              {["Tenant", "State", "Status", "Probe base", "Latency", "Last checked"].map((h) => (
                <th key={h} className="op-th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="op-td px-4 py-8 text-center text-ink-mute">
                  Loading…
                </td>
              </tr>
            ) : merged.length === 0 ? (
              <tr>
                <td colSpan={6} className="op-td px-4 py-8 text-center text-ink-mute">
                  No tenants yet.
                </td>
              </tr>
            ) : (
              merged.map((r) => {
                const status = r.probe?.status ?? r.health_status;
                return (
                  <tr key={r.id}>
                    <td className="op-td">
                      <span className="font-medium">{r.slug}</span>
                      <span className="ml-2 text-xs text-ink-mute">{r.studio_name}</span>
                    </td>
                    <td className="op-td font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
                      {r.state}
                    </td>
                    <td className="op-td">
                      <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                        <span className={`op-dot ${DOT[status] ?? DOT.unknown}`} />
                        {LABEL[status] ?? status}
                        {r.probe?.reason ? (
                          <span className="text-ink-soft normal-case tracking-normal">
                            · {r.probe.reason}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="op-td font-mono text-xs text-ink-mute">
                      {r.probe?.base ?? (r.domain ? `https://${r.domain}` : "studio origin")}
                    </td>
                    <td className="op-td font-mono text-xs text-ink-mute">
                      {r.probe?.ms != null ? `${r.probe.ms}ms` : "-"}
                    </td>
                    <td className="op-td font-mono text-[11px] text-ink-soft">
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
