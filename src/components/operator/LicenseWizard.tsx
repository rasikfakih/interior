"use client";

import { useState } from "react";

type Tenant = {
  id: number;
  slug: string;
  studio_name: string;
  tier: string;
  owner_email?: string | null;
  expires_at?: string | null;
};

type Result = {
  action: string;
  license: Record<string, unknown> | null;
  installCode: { slug: string | null; hmac_key: string | null };
  owner_email: string | null;
  domain: string | null;
};

/**
 * Phase 5: license wizard. Issue / extend / revoke a tenant license,
 * with an optional revenue amount for the ledger, and an output panel
 * carrying the full license payload, the install code (slug + HMAC
 * key), and a mailto to the buyer so the operator can hand it over.
 */
export function LicenseWizard({ tenants }: { tenants: Tenant[] }) {
  const [tab, setTab] = useState<"issue" | "extend" | "revoke">("issue");
  const [id, setId] = useState(tenants[0]?.id?.toString() || "");
  const [expires, setExpires] = useState("");
  const [amount, setAmount] = useState("0");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = tenants.find((t) => t.id.toString() === id);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "revoke" && !confirm) {
      setErr("Type the tenant slug to confirm revoke, or tick the confirm box.");
      return;
    }
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const body: Record<string, unknown> = {
        action: tab,
        tenant_id: Number(id),
        amount: Number(amount) * 100,
      };
      if (tab !== "revoke") {
        const defaultExpiry = new Date(Date.now() + 365 * 86400 * 1000)
          .toISOString()
          .slice(0, 10);
        body.expires_at = new Date(expires || defaultExpiry).toISOString();
      }
      const r = await fetch("/api/operator/license", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "request failed");
        return;
      }
      setRes(j as Result);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyLicense() {
    if (!res?.license) return;
    await navigator.clipboard.writeText(JSON.stringify(res.license, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const mailto = res?.owner_email
    ? `mailto:${res.owner_email}?subject=${encodeURIComponent(
        `License ${res.action} - ${res.installCode.slug ?? ""}`
      )}&body=${encodeURIComponent(
        `Install code:\n${res.installCode.slug ?? ""} | ${res.installCode.hmac_key ?? ""}\n\nLicense:\n${JSON.stringify(res.license, null, 2)}`
      )}`
    : null;

  return (
    <div className="max-w-3xl">
      <div className="op-panel flex divide-x divide-[var(--line)]">
        {(["issue", "extend", "revoke"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setRes(null);
              setErr(null);
            }}
            className={`op-tab ${tab === t ? "op-tab--active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={go} className="mt-4 grid gap-4 op-panel p-6">
        <label className="block">
          <span className="op-label">Tenant</span>
          <select
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setRes(null);
              setErr(null);
            }}
            className="input-line"
            required
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} · {t.slug} · {t.studio_name} ({t.tier}
                {t.expires_at ? `, exp ${t.expires_at.slice(0, 10)}` : ""})
              </option>
            ))}
          </select>
        </label>

        {tab !== "revoke" ? (
          <label className="block">
            <span className="op-label">
              {tab === "extend" ? "New expiry" : "Expiry"} (default +1 year)
            </span>
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="input-line"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="op-label">
            Revenue amount (USD) · recorded in the license ledger
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-line w-40"
            />
            {["0", "29", "49", "99"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={`op-btn-sm ${amount === v ? "op-btn-sm--active" : ""}`}
              >
                ${v}
              </button>
            ))}
          </div>
        </label>

        {tab === "revoke" ? (
          <label className="op-banner op-banner--bad flex items-center gap-3">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
            <span>
              I confirm revoking{" "}
              <span className="font-mono font-medium">{selected?.slug}</span> - this
              immediately blocks admin access and tier features.
            </span>
          </label>
        ) : null}

        {err ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--op-bad)]">
            {err}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className={`${
            tab === "revoke" ? "op-btn-danger" : "btn-primary"
          } justify-self-start h-10 px-5 text-[10px]`}
        >
          {busy
            ? "Working..."
            : tab === "issue"
            ? "Issue license"
            : tab === "extend"
            ? "Extend license"
            : "Revoke license"}
        </button>
      </form>

      {res ? (
        <div className="op-panel mt-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
              {res.action === "revoke" ? "Revoked" : "License payload"}
            </p>
            {res.action !== "revoke" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyLicense}
                  className="op-btn-sm"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                {mailto ? (
                  <a href={mailto} className="op-btn-sm">
                    Email {res.owner_email}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="op-label mb-1">Install code (slug | HMAC key)</p>
              <pre className="op-code">
                {res.installCode.slug ?? "-"} | {res.installCode.hmac_key ?? "-"}
              </pre>
            </div>
            <div>
              <p className="op-label mb-1">Buyer</p>
              <p className="op-code">
                {res.owner_email ?? "no email on file"} · {res.domain ?? "studio-hosted"}
              </p>
            </div>
          </div>

          {res.action === "revoke" ? (
            <p className="op-banner op-banner--bad mt-4">
              Tenant {res.installCode.slug} revoked. Admin access and tier features are
              blocked; license.revoke logged.
            </p>
          ) : (
            <pre className="op-code mt-4">
              {JSON.stringify(res.license, null, 2)}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  );
}
