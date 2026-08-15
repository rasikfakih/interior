"use client";

import { useEffect, useMemo, useState } from "react";

type Toast = { kind: "ok" | "err"; msg: string };

const CONFETTI_COLORS = ["#c0964f", "#122a20", "#d6cbb3", "#56605a", "#e8e2d4"];

/** Deterministic 0..1 hash so the burst is stable across renders
 *  (react-hooks/purity: no Math.random in render). */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: hash(i) * 100,
        delay: hash(i + 40) * 0.4,
        duration: 1.6 + hash(i + 80) * 1.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: hash(i + 120) * 360,
        size: 6 + hash(i + 160) * 6,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.55,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      <style>{`
        .confetti-piece {
          position: absolute;
          top: -24px;
          border-radius: 1px;
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
          animation-fill-mode: both;
          will-change: transform, opacity;
        }
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function ProposalAccept({
  token,
  status,
  brandName,
}: {
  token: string;
  status: string;
  brandName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(status === "approved");
  const [acceptedBy, setAcceptedBy] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !agree) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/proposals/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted_by_name: name.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setToast({ kind: "err", msg: j.error || `Accept failed (${r.status})` });
        return;
      }
      setDone(true);
      setAcceptedBy(name.trim());
      setOpen(false);
      if (!reduceMotion) setConfetti(true);
      // Flip the top-bar status pill to Approved (ProposalStatusBadge).
      window.dispatchEvent(new CustomEvent("proposal-accepted"));
    } catch {
      setToast({ kind: "err", msg: "Network problem. Try once more." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {confetti && <ConfettiBurst />}

      {done ? (
        <div className="rounded-lg border border-[#c0964f] bg-[rgba(192,150,79,0.12)] p-4 space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c0964f]">
            Proposal accepted
          </p>
          <p className="text-sm">
            {brandName} will contact you to start the work.
            {acceptedBy ? ` Signed by ${acceptedBy}.` : ""}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary w-full"
        >
          Accept proposal
        </button>
      )}

      {toast && (
        <p role="alert" className="text-xs mt-3 text-[var(--accent)]">
          {toast.msg}
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4"
          style={{ background: "rgba(18, 42, 32, 0.6)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Accept proposal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={accept}
            className="w-full max-w-md rounded-lg border hairline bg-canvas p-6 space-y-5"
          >
            <p className="chrome-pill inline-flex">Accept proposal</p>
            <p className="text-sm text-ink-mute">
              Accepting confirms the investment and timeline in this
              proposal. {brandName} will reach out to schedule the kick-off.
            </p>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a] mb-2">
                Your name
              </label>
              <input
                required
                autoFocus
                name="accepted_by_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-canvas border hairline rounded-[var(--radius-control)] px-3 py-2 text-sm focus:border-[var(--accent-deep)] focus:outline-none"
              />
            </div>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 accent-[#c0964f]"
              />
              <span>
                I agree to the terms and timeline in this proposal.
              </span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost flex-1"
              >
                Not yet
              </button>
              <button
                type="submit"
                disabled={busy || !name.trim() || !agree}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {busy ? "Accepting..." : "Accept proposal"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
