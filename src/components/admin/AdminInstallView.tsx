"use client";

import { useCallback, useEffect, useState } from "react";

type License = {
  purchaseCode: string;
  domain: string;
  tier: string;
  installedAt: string;
  expiresAt: string;
  features: Record<string, boolean>;
  signature: string;
  issuedBy?: string;
};

type ApiShape = {
  license: License | null;
  rotatedAt: string | null;
  available: boolean;
  canAdvance: boolean;
  canRotate: boolean;
};

type Toast = { kind: "ok" | "err"; msg: string };

const LABEL_CLS =
  "font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute";

function fmtDate(s: string | null | undefined): string {
  if (!s) return "-";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return s;
  }
}

function visibleSig(sig: string): string {
  if (!sig) return "-";
  if (sig.length <= 16) return sig;
  return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
}

export default function AdminInstallView({ role }: { role: string }) {
  const [data, setData] = useState<ApiShape | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(kind: Toast["kind"], msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/install/stamp", {
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Load failed (${r.status})`);
        return;
      }
      setData(j);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function advance() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Advance install stamp?\n\nThis re-stamps installedAt to now() and re-signs the HMAC. preservePurchaseCode / domain / tier / features / expiresAt. The audit log will record who advanced it.`
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/install/stamp", {
        method: "PUT",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast("err", j.error || `Advance failed (${r.status})`);
        return;
      }
      if (j.license) {
        setData((prev) =>
          prev
            ? { ...prev, license: j.license, rotatedAt: j.license.installedAt }
            : prev
        );
      }
      showToast("ok", "Stamp advanced.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  const license = data?.license ?? null;

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end">
        <div className="md:col-span-8">
          <p className="chrome-pill mb-3 inline-flex">Install</p>
          <h1 className="text-3xl md:text-5xl tracking-tighter">
            Stamp & HMAC.
          </h1>
          <p className="text-ink-mute text-sm mt-2">
            Read-only view of the active license stamp.{" "}
            <span className="font-mono text-xs">Advance stamp</span> rolls
            installedAt forward and re-signs the HMAC; seat usage and
            tier are preserved. HMAC rotation (cryptographic reset)
            stays on <span className="font-mono text-xs">/superadmin</span>.
            Role: <span className="font-mono text-xs">{role}</span>.
          </p>
        </div>
        <div className="md:col-span-4 flex md:justify-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {data ? (data.available ? "license present" : "no license") : "loading..."}
          </span>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className={`surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)] ${
            toast.kind === "err" ? "text-red-700" : "text-accent"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <main className="md:col-span-8 surface-tile p-6 rounded-[var(--radius-card)] space-y-4">
          {license ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6">
                  <p className={LABEL_CLS}>purchase_code</p>
                  <p className="font-mono text-sm break-all mt-1">
                    {license.purchaseCode}
                  </p>
                </div>
                <div className="md:col-span-6">
                  <p className={LABEL_CLS}>domain</p>
                  <p className="font-mono text-sm break-all mt-1">
                    {license.domain}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <p className={LABEL_CLS}>tier</p>
                  <p className="font-mono text-sm mt-1">{license.tier}</p>
                </div>
                <div className="md:col-span-4">
                  <p className={LABEL_CLS}>installed_at</p>
                  <p className="font-mono text-sm mt-1">
                    {fmtDate(license.installedAt)}
                  </p>
                </div>
                <div className="md:col-span-4">
                  <p className={LABEL_CLS}>expires_at</p>
                  <p className="font-mono text-sm mt-1">
                    {fmtDate(license.expiresAt)}
                  </p>
                </div>
              </div>
              <div>
                <p className={LABEL_CLS}>features</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2">
                  {Object.entries(license.features ?? {}).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">{k}</span>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                          v ? "text-accent" : "text-ink-mute"
                        }`}
                      >
                        {v ? "on" : "off"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className={LABEL_CLS}>signature</p>
                <p className="font-mono text-xs break-all mt-1">
                  {visibleSig(license.signature ?? "")}
                </p>
              </div>
              {license.issuedBy && (
                <div>
                  <p className={LABEL_CLS}>issued_by</p>
                  <p className="font-mono text-xs break-all mt-1">
                    {license.issuedBy}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className={LABEL_CLS}>No active license</p>
              <p className="text-sm text-ink-mute">
                This server has no <span className="font-mono text-xs">data/license.json</span>.
                Run <span className="font-mono text-xs">POST /api/install/stamp</span> with
                purchase code + domain to issue one. The advance action
                gets you 404 until then.
              </p>
            </div>
          )}
        </main>

        <aside className="md:col-span-4 space-y-4">
          <div className="surface-tile p-5 rounded-[var(--radius-card)] space-y-3">
            <p className={LABEL_CLS}>Capabilities</p>
            <ul className="text-sm space-y-1">
              <li className="flex justify-between">
                <span className="text-ink-mute">Advance stamp</span>
                <span className="font-mono text-xs">
                  {data?.canAdvance ? "yes" : "no license"}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink-mute">Rotate HMAC</span>
                <span className="font-mono text-xs">
                  {data?.canRotate ? "yes" : "no env"}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-ink-mute">HMAC key env</span>
                <span className="font-mono text-xs">
                  {data?.canRotate ? "present" : "absent"}
                </span>
              </li>
            </ul>
          </div>
          <div className="surface-tile p-5 rounded-[var(--radius-card)] space-y-3">
            <p className={LABEL_CLS}>Actions</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={advance}
                disabled={
                  busy ||
                  !data ||
                  !data.canAdvance ||
                  !data.canRotate
                }
                className="btn-primary w-full"
              >
                {busy ? "Working..." : "Advance stamp"}
              </button>
              <button
                type="button"
                onClick={load}
                disabled={busy}
                className="btn-ghost w-full"
              >
                {busy ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
          <p className="text-xs text-ink-mute">
            HMAC rotation (cryptographic key change) intentionally
            does not live here. That path lives at{" "}
            <span className="font-mono">/superadmin/license</span>{" "}
            and stays superadmin-only by tier-gate policy.
          </p>
        </aside>
      </div>
    </div>
  );
}
