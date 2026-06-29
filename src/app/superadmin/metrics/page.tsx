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
};
type AuditEvent = {
  id: number;
  kind: string;
  message: string;
  meta?: any;
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
        });
        setAudit(Array.isArray(j.audit) ? j.audit : []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "metrics unavailable");
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
      <div className="flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl tracking-tight text-zinc-900">Metrics</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Operator dashboard
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="border border-zinc-300 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-700 hover:border-zinc-700 hover:text-zinc-900"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Couldn't load metrics: {error}
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

      <div className="border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Audit (last 20)
        </div>
        <ul className="divide-y divide-zinc-100">
          {audit.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">
              {loading ? "Loading" : "No events."}
            </li>
          ) : (
            audit.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-700">
                    {e.kind}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                    {e.created_at}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-800">{e.message}</p>
                {e.meta ? (
                  <pre className="mt-1 overflow-x-auto bg-zinc-50 px-3 py-2 font-mono text-[10px] text-zinc-700">
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
    <div className="border border-zinc-200 bg-white p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl tabular-nums text-zinc-900">
        {value}
      </div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-busy>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="border border-zinc-200 bg-white p-5 animate-pulse"
        >
          <div className="h-3 w-1/2 bg-zinc-100" />
          <div className="mt-3 h-7 w-1/3 bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

