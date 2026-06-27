import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMetrics, getAuditLog } from "@/lib/operator-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Metrics", robots: { index: false } };

export default async function MetricsPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  const m = await getMetrics();
  const audit = await getAuditLog(20);

  return (
    <section className="grid gap-8">
      <div>
        <h1 className="text-3xl tracking-tight text-zinc-900">Metrics</h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Operator dashboard
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total tenants" value={m.total} />
        <Stat label="Active" value={m.active} />
        <Stat label="Pending" value={m.pending} />
        <Stat label="Revoked" value={m.revoked} />
        <Stat label="Business tier" value={m.business} />
        <Stat label="Personal tier" value={m.personal} />
        <Stat label="Expiring in 14 days" value={m.expiringSoon} />
        <Stat label="Audit events (7d)" value={m.auditLast7d} />
      </div>

      <div className="border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Audit (last 20)
        </div>
        <ul className="divide-y divide-zinc-100">
          {audit.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">No events.</li>
          ) : (
            audit.map((e: any) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-700">{e.kind}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                    {e.created_at}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-800">{e.message}</p>
                {e.meta ? (
                  <pre className="mt-1 overflow-x-auto bg-zinc-50 px-3 py-2 font-mono text-[10px] text-zinc-700">
                    {e.meta}
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
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">{label}</div>
      <div className="mt-2 font-mono text-3xl tabular-nums text-zinc-900">{value}</div>
    </div>
  );
}
