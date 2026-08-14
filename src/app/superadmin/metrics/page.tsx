"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Metrics = {
  total: number;
  active: number;
  pending: number;
  revoked: number;
  business: number;
  personal: number;
  expiringSoon: number;
  auditLast7d: number;
  revenueCents: number;
  revenue30dCents: number;
  revenueByTier: { tier: string; cents: number }[];
  pageviews: number;
  pageviews7d: number;
  modelLoads: number;
  formSubmits: number;
  topPaths: { path: string; count: number }[];
};
type AuditEvent = {
  id: number;
  kind: string;
  message: string;
  meta?: unknown;
  created_at: string;
};

export default function MetricsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ck = document.cookie.includes("superadmin_session=1");
    if (!ck) {
      router.replace("/superadmin");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/operator/metrics", {
          credentials: "include",
        });
        if (!r.ok) {
          if (r.status === 401) {
            router.replace("/superadmin");
            return;
          }
          throw new Error(`metrics ${r.status}`);
        }
        const j = await r.json();
        if (cancelled) return;
        setMetrics({
          total: j.total ?? 0,
          active: j.active ?? 0,
          pending: j.pending ?? 0,
          revoked: j.revoked ?? 0,
          business: j.business ?? 0,
          personal: j.personal ?? 0,
          expiringSoon: j.expiringSoon ?? 0,
          auditLast7d: j.auditLast7d ?? 0,
          revenueCents: j.revenueCents ?? 0,
          revenue30dCents: j.revenue30dCents ?? 0,
          revenueByTier: Array.isArray(j.revenueByTier) ? j.revenueByTier : [],
          pageviews: j.pageviews ?? 0,
          pageviews7d: j.pageviews7d ?? 0,
          modelLoads: j.modelLoads ?? 0,
          formSubmits: j.formSubmits ?? 0,
          topPaths: Array.isArray(j.topPaths) ? j.topPaths : [],
        });
        setAudit(Array.isArray(j.audit) ? j.audit : []);
      } catch (e: unknown) {
        if (cancelled) return;
        setError((e as Error)?.message ?? "metrics unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const m = metrics;

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="chrome-pill mb-3 inline-flex">Operations</p>
          <h1 className="text-3xl tracking-tighter">Metrics</h1>
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-mute">
            Operator dashboard
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="op-btn-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="op-banner op-banner--bad">
          Couldn&apos;t load metrics: {error}
        </div>
      )}

      {loading && !m ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total tenants" value={m?.total ?? 0} />
          <Stat label="Active" value={m?.active ?? 0} />
          <Stat label="Pending" value={m?.pending ?? 0} />
          <Stat label="Revoked" value={m?.revoked ?? 0} />
          <Stat label="Business tier" value={m?.business ?? 0} />
          <Stat label="Personal tier" value={m?.personal ?? 0} />
          <Stat label="Expiring in 14 days" value={m?.expiringSoon ?? 0} />
          <Stat label="Audit events (7d)" value={m?.auditLast7d ?? 0} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="op-panel">
          <div className="op-panel-head">Revenue (license ledger)</div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="All time" value={`$${((m?.revenueCents ?? 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
              <Stat label="Last 30 days" value={`$${((m?.revenue30dCents ?? 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
            </div>
            <div className="mt-5">
              <p className="op-label">By tier</p>
              {(m?.revenueByTier ?? []).length === 0 ? (
                <p className="text-sm text-ink-mute">No ledger entries yet - amounts are recorded from the license wizard.</p>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {m!.revenueByTier.map((r) => (
                    <li key={r.tier} className="flex items-center justify-between py-2.5">
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">{r.tier}</span>
                      <span className="font-mono text-sm tabular-nums text-accent">${(r.cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="op-panel">
          <div className="op-panel-head">Usage (pageviews)</div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="All time" value={m?.pageviews ?? 0} />
              <Stat label="Last 7 days" value={m?.pageviews7d ?? 0} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Stat label="3D walkthrough loads" value={m?.modelLoads ?? 0} />
              <Stat label="Form submissions" value={m?.formSubmits ?? 0} />
            </div>
            <div className="mt-5">
              <p className="op-label">Top paths</p>
              {(m?.topPaths ?? []).length === 0 ? (
                <p className="text-sm text-ink-mute">No pageviews recorded yet.</p>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {m!.topPaths.map((p) => (
                    <li key={p.path} className="flex items-center justify-between gap-4 py-2.5">
                      <span className="truncate font-mono text-xs text-ink-mute">{p.path}</span>
                      <span className="font-mono text-sm tabular-nums text-ink">{p.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="op-panel">
        <div className="op-panel-head">Audit (last 20)</div>
        <ul className="divide-y divide-[var(--line)]">
          {audit.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-ink-mute">
              {loading ? "Loading" : "No events."}
            </li>
          ) : (
            audit.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    {e.kind}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                    {e.created_at}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink">{e.message}</p>
                {e.meta ? (
                  <pre className="op-code mt-2 px-3 py-2 text-[10px]">
                    {typeof e.meta === "string"
                      ? e.meta
                      : JSON.stringify(e.meta, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="op-stat">
      <div className="op-stat-value tabular-nums">{value}</div>
      <div className="op-stat-label">{label}</div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-busy>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="op-stat animate-pulse">
          <div className="h-3 w-1/2 rounded-full bg-[var(--surface-strong)]" />
          <div className="mt-3 h-7 w-1/3 rounded-full bg-[var(--surface-strong)]" />
        </div>
      ))}
    </div>
  );
}

