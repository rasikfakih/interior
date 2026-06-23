"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/superadmin/tenants", label: "Tenants" },
  { href: "/superadmin/issue", label: "Issue license" },
  { href: "/superadmin/theme", label: "Theme distro" },
  { href: "/superadmin/rotate", label: "Rotate HMAC" },
  { href: "/superadmin/metrics", label: "Metrics" },
];

export function OperatorNav({ email }: { email: string }) {
  const path = usePathname();

  async function signOut() {
    await fetch("/api/operator/login", { method: "DELETE" });
    window.location.href = "/superadmin";
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/superadmin/tenants" className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-900">
          Superadmin
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-6">
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={
                path?.startsWith(it.href)
                  ? "font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-900 underline underline-offset-4"
                  : "font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-900"
              }
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            {email}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="border border-zinc-300 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-700 hover:border-zinc-700 hover:text-zinc-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
