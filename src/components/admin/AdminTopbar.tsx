"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

/** Slim console topbar shared by /admin (shell) and every standalone
 *  /admin/* editor page. Brand mark, tenant operator identity, and the
 *  two global actions. */
export function AdminTopbar({ email, role }: { email: string; role: string }) {
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
        </div>
        <div className="flex shrink-0 items-center gap-3">
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
