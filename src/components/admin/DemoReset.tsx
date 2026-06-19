"use client";

import { useState } from "react";

export default function DemoReset() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function reset() {
    if (!confirm("This wipes all demo content and reseeds the home page. Continue?")) return;
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/admin/demo-reset", { method: "POST" });
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setMsg(j.message || "Done.");
      setTimeout(() => location.reload(), 400);
    } else {
      setMsg(j.error || "Reset failed.");
    }
  }

  return (
    <div className="surface-tile p-5 rounded-[var(--radius-card)] space-y-3 border-dashed hairline">
      <p className="chrome-pill inline-flex">Demo only</p>
      <p className="text-sm text-ink-mute">
        Clears media, projects, journal, testimonials, team, and page
        blocks, then re-seeds the home page. Disabled in production.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={reset}
        className="text-xs font-mono uppercase tracking-[0.18em] text-warm border-b border-[var(--accent-warm-soft)] pb-1"
      >
        {busy ? "Resetting" : "Reset demo data"}
      </button>
      {msg && (
        <p className="text-xs font-mono tracking-[0.04em] text-ink-mute">{msg}</p>
      )}
    </div>
  );
}
