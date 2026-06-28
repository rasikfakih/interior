"use client";

import { useEffect, useState } from "react";

export default function InstallForm() {
  const [purchaseCode, setPurchaseCode] = useState("");
  const [domain, setDomain] = useState("");
  const [tier, setTier] = useState<"personal" | "business">("business");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDomain(window.location.host);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/install/stamp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseCode, domain, tier }),
    });
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setMsg("License installed. Reloading admin...");
      setTimeout(() => {
        window.location.href = "/admin";
      }, 800);
    } else {
      setMsg(j.detail || j.error || "License install failed");
    }
  }

  return (
    <form onSubmit={submit} className="surface-elevated p-6 md:p-8 rounded-[var(--radius-card)] space-y-5">
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
          Envato purchase code
        </span>
        <input
          className="input-line"
          required
          minLength={8}
          value={purchaseCode}
          onChange={(e) => setPurchaseCode(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
      </label>
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
          Domain (single match)
        </span>
        <input
          className="input-line"
          required
          value={domain}
          onChange={(e) => setDomain(e.target.value.toLowerCase().trim())}
          placeholder="etihad-interiors.com"
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
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-warm">
                {t}
              </span>
              <p className="text-sm mt-2">
                {t === "personal"
                  ? "1 site. English only. No 3D viewer. Page builder capped at 5 pages, media at 50 items."
                  : "Up to 5 sites. Multilingual. 3D viewer honored. Unlimited pages and media."}
              </p>
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <p
          className="text-xs font-mono tracking-[0.04em]"
          style={{ color: msg && !msg.startsWith("License installed") ? "var(--accent-warm)" : "var(--ink-mute)" }}
          role="status"
          aria-live="polite"
        >
          {msg || "The license is signed offline; no internet required."}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="btn-primary disabled:opacity-50"
        >
          {busy ? "Installing" : "Install license"}
          <span aria-hidden>→</span>
        </button>
      </div>
    </form>
  );
}
