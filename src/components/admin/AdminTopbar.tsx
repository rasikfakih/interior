"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import PWAInstall from "./PWAInstall";

/** Slim console topbar shared by /admin (shell) and every standalone
 *  /admin/* editor page. Brand mark, tenant operator identity, the
 *  current plan badge (Module 10), and the two global actions. PWA
 *  affordances (install + offline badge) sit between the identity and
 *  the actions. */
export function AdminTopbar({ email, role }: { email: string; role: string }) {
  const [plan, setPlan] = useState<{ planId: string; planName: string } | null>(null);

  useEffect(() => {
    fetch("/api/billing/current", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.plan) setPlan({ planId: String(d.plan.planId ?? ""), planName: String(d.plan.planName ?? "") });
      })
      .catch(() => {
        /* no badge when billing is unreachable */
      });
  }, []);

  return (
    <header className="admin-topbar">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
          <span className="font-display text-lg leading-none tracking-tight">
            Console
          </span>
          <span className="hairline hidden h-4 w-px bg-[var(--line-strong)] sm:block" />
          <span className="hidden truncate font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute sm:block">
            {email.split("@")[0]} · {role}
          </span>
          {plan && plan.planId !== "free" && (
            <Link
              href="/admin/billing"
              className="hidden rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-deep sm:inline-flex"
            >
              {plan.planName}
            </Link>
          )}
          {plan && plan.planId === "free" && (
            <Link
              href="/admin/billing"
              className="hidden rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-deep hover:underline sm:inline-flex"
            >
              Free · Upgrade
            </Link>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <PWAInstall />
          <Link href="/" className="btn-ghost hidden h-9 px-4 text-[10px] sm:inline-flex">
            View site
          </Link>
          <button
            onClick={() => signOut()}
            className="btn-primary h-9 px-4 text-[10px]"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
