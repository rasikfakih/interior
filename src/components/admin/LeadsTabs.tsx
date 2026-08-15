"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/leads", label: "List" },
  { href: "/admin/leads/board", label: "Board" },
];

/** List | Board switcher for the lead inbox area (rendered by the
 *  /admin/leads layout above both views). */
export default function LeadsTabs() {
  const pathname = usePathname();
  return (
    <div
      className="mb-6 flex items-center gap-1 border-b hairline"
      role="tablist"
      aria-label="Lead inbox views"
    >
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            className={`-mb-px border-b-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-accent-deep"
                : "border-transparent text-ink-mute hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
