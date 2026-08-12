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
      <div className="flex border border-zinc-200 bg-white">
        {(["issue", "extend", "revoke"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setRes(null);
              setErr(null);
            }}
            className={`flex-1 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] ${
              tab === t
                ? "bg-zinc-900 text-white"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={go} className="mt-4 grid gap-4 border border-zinc-200 bg-white p-6">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">
            Tenant
          </span>
          <select
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setRes(null);
              setErr(null);
            }}
            className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none"
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
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">
              {tab === "extend" ? "New expiry" : "Expiry"} (default +1 year)
            </span>
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="w-full border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mb-2">
            Revenue amount (USD) · recorded in the license ledger
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-40 border border-zinc-300 px-3 py-2 focus:border-zinc-700 focus:outline-none"
            />
            {["0", "29", "49", "99"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={`border px-3 font-mono text-[11px] ${
                  amount === v
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 text-zinc-600 hover:border-zinc-700"
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
        </label>

        {tab === "revoke" ? (
          <label className="flex items-center gap-2 border border-red-200 bg-red-50 px-4 py-3">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
            <span className="text-sm text-red-800">
              I confirm revoking{" "}
              <span className="font-mono font-medium">{selected?.slug}</span> — this
              immediately blocks admin access and tier features.
            </span>
          </label>
        ) : null}

        {err ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-red-700">
            {err}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className={`justify-self-start px-5 py-2 text-sm font-medium text-white disabled:opacity-60 ${
            tab === "revoke" ? "bg-red-800 hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-800"
          }`}
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
        <div className="mt-4 border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              {res.action === "revoke" ? "Revoked" : "License payload"}
            </p>
            {res.action !== "revoke" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyLicense}
                  className="border border-zinc-300 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-700 hover:border-zinc-700"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                {mailto ? (
                  <a
                    href={mailto}
                    className="border border-zinc-300 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-700 hover:border-zinc-700"
                  >
                    Email {res.owner_email}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 mb-1">
                Install code (slug | HMAC key)
              </p>
              <pre className="overflow-x-auto bg-zinc-50 p-4 font-mono text-xs text-zinc-800">
                {res.installCode.slug ?? "-"} | {res.installCode.hmac_key ?? "-"}
              </pre>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400 mb-1">
                Buyer
              </p>
              <p className="bg-zinc-50 p-4 font-mono text-xs text-zinc-800">
                {res.owner_email ?? "no email on file"} · {res.domain ?? "studio-hosted"}
              </p>
            </div>
          </div>

          {res.action === "revoke" ? (
            <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Tenant {res.installCode.slug} revoked. Admin access and tier features are
              blocked; license.revoke logged.
            </p>
          ) : (
            <pre className="mt-4 overflow-x-auto bg-zinc-50 p-4 font-mono text-xs text-zinc-800">
              {JSON.stringify(res.license, null, 2)}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  );
}
