"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCheck, IconX } from "@/components/icons";

type Toast = { kind: "ok" | "err"; msg: string };

type PlanDto = {
  id: string;
  name: string;
  priceUsd: number;
  priceInr: number;
  billingCycle: string;
  projectLimit: number;
  leadLimit: number;
  boardLimit: number;
  boqVersionLimit: number;
  aiCreditsLimit: number;
  features: Record<string, unknown>;
};

type UsageDto = {
  projects: { used: number; limit: number };
  leads: { used: number; limit: number };
  boards: { used: number; limit: number };
  boqVersions: { used: number; limit: number };
  aiCredits: { used: number; limit: number };
  whiteLabel: boolean;
};

type SubscriptionDto = {
  id: string;
  planId: string;
  planName: string;
  provider: string;
  providerSubscriptionId: string;
  status: string;
  amountInr: number;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string | null;
};

type CurrentDto = {
  tenantId: number;
  plan: {
    planId: string;
    planName: string;
    subscriptionStatus: string;
    planStartedAt: string | null;
    planEndsAt: string | null;
    billingCycle: string | null;
    features: Record<string, unknown>;
  };
  usage: UsageDto;
  subscriptions: SubscriptionDto[];
};

const FEATURE_LABELS: [keyof Record<string, unknown>, string][] = [
  ["white_label", "White-label portal"],
  ["custom_domain", "Custom domain"],
  ["client_subdomain", "Client subdomain"],
  ["portal_approvals", "Portal approvals"],
  ["export_pdf", "PDF export"],
  ["social_autopilot", "Social autopilot"],
];

function fmtInr(n: number): string {
  return "Rs " + n.toLocaleString("en-IN");
}

function limitLabel(n: number): string {
  return n === -1 ? "Unlimited" : String(n);
}

function getUsagePercent(usage: number, limit: number): number {
  if (limit === -1) return 0;
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((usage / limit) * 100));
}

export default function AdminBilling() {
  const [toast, setToast] = useState<Toast | null>(null);
  const [plans, setPlans] = useState<PlanDto[] | null>(null);
  const [current, setCurrent] = useState<CurrentDto | null>(null);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [checkout, setCheckout] = useState<PlanDto | null>(null);
  const [paying, setPaying] = useState(false);
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [savingDomains, setSavingDomains] = useState(false);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      fetch("/api/billing/plans", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/billing/current", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (p) setPlans(p.plans ?? []);
    if (c) {
      setCurrent(c);
      setSubdomain("");
      setCustomDomain("");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function upgrade(plan: PlanDto) {
    if (plan.id === current?.plan.planId) {
      showToast("ok", "You are already on this plan.");
      return;
    }
    setCheckout(plan);
  }

  async function pay() {
    if (!checkout) return;
    setPaying(true);
    try {
      // Create the order (mock when no provider keys), then activate.
      const orderRes = await fetch("/api/billing/create-order", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: checkout.id, provider: "stripe" }),
      });
      const order = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        showToast("err", order.error || "Order creation failed.");
        return;
      }
      const activate = await fetch("/api/billing/mock-upgrade", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: checkout.id }),
      });
      const j = await activate.json().catch(() => ({}));
      if (!activate.ok) {
        showToast("err", j.error || "Upgrade failed.");
        return;
      }
      showToast("ok", `Upgraded to ${checkout.name}.`);
      setCheckout(null);
      await load();
    } catch {
      showToast("err", "Network problem. Upgrade not completed.");
    } finally {
      setPaying(false);
    }
  }

  async function saveDomains() {
    setSavingDomains(true);
    try {
      const r = await fetch(`/api/tenants/${current?.tenantId ?? "0"}/domains`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_subdomain: subdomain || null,
          custom_domain: customDomain || null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || "Could not save domains.");
        return;
      }
      showToast("ok", "Portal hostnames saved.");
      await load();
    } catch {
      showToast("err", "Network problem. Domains not saved.");
    } finally {
      setSavingDomains(false);
    }
  }

  const usageBars = current
    ? [
        { label: "Projects", used: current.usage.projects.used, limit: current.usage.projects.limit },
        { label: "Leads", used: current.usage.leads.used, limit: current.usage.leads.limit },
        { label: "Boards", used: current.usage.boards.used, limit: current.usage.boards.limit },
        { label: "BOQ versions", used: current.usage.boqVersions.used, limit: current.usage.boqVersions.limit },
        { label: "AI credits", used: current.usage.aiCredits.used, limit: current.usage.aiCredits.limit },
      ]
    : [];

  return (
    <div className="space-y-10">
      {toast && (
        <p role="status" className={`text-sm ${toast.kind === "ok" ? "text-accent-deep" : "text-[#8a2f2f]"}`}>
          {toast.msg}
        </p>
      )}

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="chrome-pill inline-flex">Billing</p>
          <h1 className="mt-2 text-3xl md:text-4xl tracking-tighter">Plans.</h1>
          <p className="font-display text-lg text-ink-mute mt-1">
            {current
              ? `Current plan: ${current.plan.planName} · ${current.plan.subscriptionStatus}`
              : "Loading your plan..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">Show</span>
          {(["INR", "USD"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`rounded-md border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                currency === c
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-accent-deep"
                  : "hairline text-ink-mute hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      {/* Usage */}
      <section className="space-y-4">
        <p className="chrome-pill inline-flex">Usage</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {usageBars.map((u) => {
            const pct = getUsagePercent(u.used, u.limit);
            const over = u.limit !== -1 && u.used >= u.limit;
            return (
              <div key={u.label} className="surface-tile rounded-[var(--radius-card)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">{u.label}</p>
                  <p className={`font-mono text-sm ${over ? "text-[#8a2f2f]" : "text-accent-deep"}`}>
                    {u.used}/{limitLabel(u.limit)}
                  </p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#d6cbb3]/60">
                  <div
                    className={`h-full rounded-full transition-all ${over ? "bg-[#8a2f2f]" : "bg-[#c0964f]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {pct >= 80 && !over && (
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-deep">
                    Near limit - consider upgrading
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Plans grid */}
      <section className="space-y-4">
        <p className="chrome-pill inline-flex">Plans</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {(plans ?? []).map((p) => {
            const isCurrent = current?.plan.planId === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-[var(--radius-card)] border p-5 flex flex-col ${
                  isCurrent ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "hairline bg-[rgba(214,203,179,0.25)]"
                }`}
              >
                <p className="font-display text-xl">{p.name}</p>
                <p className="mt-2 font-mono text-2xl text-accent-deep">
                  {currency === "INR" ? fmtInr(p.priceInr) : `$${p.priceUsd}`}
                  <span className="text-xs text-ink-mute"> / mo</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-ink-mute">Projects</span>
                    <span className="font-mono">{limitLabel(p.projectLimit)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink-mute">Leads</span>
                    <span className="font-mono">{limitLabel(p.leadLimit)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink-mute">Boards</span>
                    <span className="font-mono">{limitLabel(p.boardLimit)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink-mute">BOQ versions</span>
                    <span className="font-mono">{limitLabel(p.boqVersionLimit)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink-mute">AI credits</span>
                    <span className="font-mono">{limitLabel(p.aiCreditsLimit)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink-mute">Team</span>
                    <span className="font-mono">{String(p.features.team_members ?? 1)}</span>
                  </li>
                </ul>
                <div className="mt-4 space-y-1.5">
                  {FEATURE_LABELS.map(([key]) => (
                    <p key={key} className="flex items-center gap-2 text-xs text-[#56605a]">
                      {p.features[key] ? (
                        <IconCheck size={12} className="text-accent-deep" />
                      ) : (
                        <span className="inline-block h-3 w-3 rounded-full border hairline" />
                      )}
                      {key === "white_label" ? "White-label (no footer)" : FEATURE_LABELS.find(([k]) => k === key)?.[1]}
                    </p>
                  ))}
                </div>
                <div className="mt-5 flex-1" />
                <button
                  onClick={() => void upgrade(p)}
                  disabled={isCurrent}
                  className={`w-full rounded-lg px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    isCurrent
                      ? "border hairline text-ink-mute"
                      : "text-[#ECECE6] bg-[#122A20] hover:opacity-90"
                  }`}
                >
                  {isCurrent ? "Current plan" : p.priceInr === 0 ? "Downgrade" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* White-label domains */}
      <section className="surface-tile rounded-[var(--radius-card)] p-6 space-y-4">
        <div>
          <p className="chrome-pill inline-flex">White-label hostnames</p>
          <p className="text-sm text-ink-mute mt-1">
            Point your client portal at your own hosts. Client subdomains are a Starter feature, custom domains a Studio feature.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="billing-subdomain" className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2">
              Client subdomain
            </label>
            <input
              id="billing-subdomain"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="client-mystudio"
              className="w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-deep)] focus:outline-none"
            />
            {current?.plan.features.client_subdomain ? (
              <p className="mt-1 font-mono text-[10px] text-[#56605a]">Live at https://{subdomain || "client-mystudio"}.ethinterior.vercel.app/portal/&lt;token&gt;</p>
            ) : (
              <p className="mt-1 font-mono text-[10px] text-accent-deep">Upgrade to Starter for client subdomains.</p>
            )}
          </div>
          <div>
            <label htmlFor="billing-custom-domain" className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2">
              Custom domain
            </label>
            <input
              id="billing-custom-domain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="projects.mystudio.com"
              className="w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm font-mono focus:border-[var(--accent-deep)] focus:outline-none"
            />
            {current?.plan.features.custom_domain ? (
              <p className="mt-1 font-mono text-[10px] text-[#56605a]">White-label: the portal footer hides on this host.</p>
            ) : (
              <p className="mt-1 font-mono text-[10px] text-accent-deep">Custom domains are a Studio feature.</p>
            )}
          </div>
        </div>
        <button
          onClick={() => void saveDomains()}
          disabled={savingDomains}
          className="btn-primary h-10 px-5 text-[10px]"
        >
          {savingDomains ? "Saving..." : "Save hostnames"}
        </button>
      </section>

      {/* Invoices */}
      <section className="space-y-3">
        <p className="chrome-pill inline-flex">Subscription history</p>
        {!current ? (
          <p className="text-sm text-ink-mute">Loading...</p>
        ) : current.subscriptions.length === 0 ? (
          <div className="surface-tile rounded-[var(--radius-card)] p-8 text-center">
            <p className="text-ink-mute text-sm">No payments yet. Upgrade above to start your plan.</p>
          </div>
        ) : (
          <div className="surface-tile rounded-[var(--radius-card)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b hairline text-left font-mono text-[10px] uppercase tracking-[0.18em] text-[#56605a]">
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Period</th>
                </tr>
              </thead>
              <tbody>
                {current.subscriptions.map((s) => (
                  <tr key={s.id} className="border-b hairline last:border-0">
                    <td className="px-4 py-3 font-display">{s.planName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.provider}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
                        s.status === "active" ? "border-[#3f6b4f]/40 bg-[#3f6b4f]/10 text-[#3f6b4f]" : "hairline text-ink-mute"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-accent-deep">{fmtInr(s.amountInr)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#56605a]">
                      {s.periodStart ? `${s.periodStart.slice(0, 10)} → ${(s.periodEnd ?? "").slice(0, 10)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {checkout && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,24,19,0.55)] p-4"
          role="dialog"
          aria-label="Checkout"
        >
          <div className="surface-elevated w-full max-w-md space-y-5 rounded-[var(--radius-card)] p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl">Upgrade to {checkout.name}.</p>
              <button aria-label="Close" onClick={() => setCheckout(null)} className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-ink-mute hover:bg-[var(--accent-soft)] hover:text-accent-deep">
                <IconX size={15} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between"><span className="text-ink-mute">Plan</span><span className="font-display">{checkout.name}</span></p>
              <p className="flex justify-between"><span className="text-ink-mute">Amount</span><span className="font-mono text-accent-deep">{fmtInr(checkout.priceInr)} / mo</span></p>
              <p className="flex justify-between"><span className="text-ink-mute">Mode</span><span className="font-mono text-xs">Mock checkout (dev)</span></p>
            </div>
            <p className="text-xs text-ink-mute">
              In production with Stripe or Razorpay keys this redirects to the provider. No keys are configured, so Pay completes the upgrade locally.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCheckout(null)} className="btn-ghost h-10 px-4 text-[10px]">Cancel</button>
              <button onClick={() => void pay()} disabled={paying} className="btn-primary h-10 px-5 text-[10px]">
                {paying ? "Paying..." : `Pay ${fmtInr(checkout.priceInr)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
