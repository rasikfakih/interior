"use client";

import { useEffect, useState } from "react";
import DemoReset from "./DemoReset";

type License = {
  purchaseCode: string;
  domain: string;
  tier: "personal" | "business";
  installedAt: string;
  expiresAt: string | null;
  features: Record<string, boolean>;
  signature: string;
  issuedBy?: string;
};

export default function LicenseAdmin() {
  const [license, setLicense] = useState<License | null>(null);
  const [server, setServer] = useState<string | null>(null);
  const [purchaseCode, setPurchaseCode] = useState("");
  const [domain, setDomain] = useState("");
  const [tier, setTier] = useState<"personal" | "business">("business");
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/license");
    if (r.ok) {
      const j = await r.json();
      setLicense(j.license);
      setServer(j.server);
      if (j.license?.domain) setDomain(j.license.domain);
      if (j.license?.purchaseCode) setPurchaseCode(j.license.purchaseCode);
      if (j.license?.tier) setTier(j.license.tier);
    }
    const a = await fetch("/api/admin/audit?kind=license");
    if (a.ok) {
      setAudit(await a.json());
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function stamp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/admin/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseCode, domain, tier }),
    });
    setBusy(false);
    const j = await r.json();
    if (r.ok) {
      setMsg("License stamped.");
      load();
    } else {
      setMsg(j.error || "Stamp failed");
    }
  }

  const expired = license?.expiresAt && Date.parse(license.expiresAt) < Date.now();

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl md:text-4xl tracking-tighter">License</h2>
        <p className="text-ink-mute text-sm mt-1">
          Envato purchase code · tier · domain. Public reads continue even when missing.
        </p>
      </div>

      <div className="surface-elevated p-6 md:p-8 rounded-[var(--radius-card)] space-y-3">
        {license ? (
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
              {expired ? "Expired" : "Active"}
            </p>
            <p className="text-lg">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute mr-3">
                Domain
              </span>
              {license.domain}
            </p>
            <p className="text-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute mr-3">
                Tier
              </span>
              {license.tier}
            </p>
            <p className="text-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute mr-3">
                Installed
              </span>
              {new Date(license.installedAt).toLocaleString()}
            </p>
            {license.expiresAt && (
              <p className="text-sm">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute mr-3">
                  Expires
                </span>
                {new Date(license.expiresAt).toLocaleString()}
              </p>
            )}
            <div className="chrome-rule mt-3" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3">
              {Object.entries(license.features || {}).map(([k, v]) => (
                <span
                  key={k}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] flex items-center gap-2"
                  style={{ color: v ? "var(--accent)" : "var(--ink-mute)" }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: v ? "var(--accent)" : "var(--ink-mute)" }}
                    aria-hidden
                  />
                  {k}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="chrome-pill mb-3 inline-flex">Not installed</p>
            <p className="text-ink-mute">
              Public pages keep working. Admin and 3D features are limited.
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={stamp}
        className="surface-elevated p-6 md:p-8 rounded-[var(--radius-card)] space-y-5"
      >
        <p className="chrome-pill inline-flex">Re-stamp</p>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Envato purchase code
          </span>
          <input
            className="input-line"
            required
            value={purchaseCode}
            onChange={(e) => setPurchaseCode(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Domain
          </span>
          <input
            className="input-line"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value.toLowerCase().trim())}
          />
        </label>
        <div>
          <p className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            Tier
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(["personal", "business"] as const).map((t) => (
              <label
                key={t}
                className={`surface-tile p-4 cursor-pointer block ${
                  tier === t ? "border-warm" : ""
                }`}
              >
                <input
                  type="radio"
                  name="tier"
                  value={t}
                  checked={tier === t}
                  onChange={() => setTier(t)}
                  className="mr-3"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
                  {t}
                </span>
                <p className="text-sm mt-2">
                  {t === "personal"
                    ? "1 site. EN-only. No 3D. Page builder â‰¤ 5. Media â‰¤ 50."
                    : "Up to 5 sites. Multilingual. 3D viewer. Unlimited."}
                </p>
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <p
            className="text-xs font-mono tracking-[0.04em]"
            style={{ color: msg.startsWith("License") ? "var(--accent)" : "var(--accent)" }}
            role="status"
            aria-live="polite"
          >
            {msg || "Re-stamping rewrites data/license.json. No internet required."}
          </p>
          <button
            type="submit"
            disabled={busy}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? "Stamping" : "Re-stamp license"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-xl tracking-tight">Audit log</h3>
        {audit.length === 0 && (
          <p className="text-ink-mute text-sm">No license events yet.</p>
        )}
        <ul className="divide-y hairline">
          {audit.map((a: any) => (
            <li
              key={a.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 py-3 text-sm"
            >
              <p className="md:col-span-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                {new Date(a.created_at).toLocaleString()}
              </p>
              <p className="md:col-span-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink">
                {a.kind}
              </p>
              <p className="md:col-span-7 text-ink-mute">{a.message}</p>
            </li>
          ))}
        </ul>
      </div>

      {!server && (
        <p className="text-xs text-ink-mute font-mono uppercase tracking-[0.18em]">
          License server: not configured  running offline-first.
        </p>
      )}

      <div className="border-t hairline-strong pt-6">
        <DemoReset />
      </div>
    </div>
  );
}
