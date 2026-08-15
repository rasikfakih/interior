"use client";

import Link from "next/link";
import { IconX } from "@/components/icons";

/**
 * Shared Module 10 upgrade modal. Create flows that hit a 402
 * PLAN_LIMIT response mount this with the server's reason string.
 */
export default function PlanLimitModal({
  reason,
  onClose,
}: {
  reason: string | null;
  onClose: () => void;
}) {
  if (!reason) return null;
  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-[rgba(10,24,19,0.55)] p-4"
      role="dialog"
      aria-label="Plan limit reached"
    >
      <div className="surface-elevated w-full max-w-md space-y-4 rounded-[var(--radius-card)] p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl">Plan limit reached.</p>
          <button
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-ink-mute hover:bg-[var(--accent-soft)] hover:text-accent-deep transition-colors"
          >
            <IconX size={15} />
          </button>
        </div>
        <p className="text-sm text-ink-mute">{reason}</p>
        <p className="text-xs text-ink-mute">
          Upgrade in Billing to lift the cap. Your existing work stays untouched.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost h-10 px-4 text-[10px]">
            Not now
          </button>
          <Link
            href="/admin/billing"
            className="btn-primary inline-flex h-10 items-center px-5 text-[10px]"
          >
            Upgrade plan
          </Link>
        </div>
      </div>
    </div>
  );
}
