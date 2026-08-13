"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconNav, IconSignOut, type NavIconName } from "@/components/icons";

type NavItem = { href: string; label: string; icon: NavIconName };

const GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Operations",
    items: [
      { href: "/superadmin/tenants", label: "Tenants", icon: "tenants" },
      { href: "/superadmin/issue", label: "License", icon: "license" },
      { href: "/superadmin/health", label: "Health", icon: "health" },
      { href: "/superadmin/metrics", label: "Metrics", icon: "metrics" },
    ],
  },
  {
    group: "Platform",
    items: [
      { href: "/superadmin/announcements", label: "Announcements", icon: "announcements" },
      { href: "/superadmin/backup", label: "Backup", icon: "backup" },
      { href: "/superadmin/theme", label: "Theme distro", icon: "distro" },
      { href: "/superadmin/rotate", label: "Rotate HMAC", icon: "rotate" },
    ],
  },
];

export function OperatorNav({ email }: { email: string }) {
  const path = usePathname();

  async function signOut() {
    await fetch("/api/operator/login", { method: "DELETE" });
    window.location.href = "/superadmin";
  }

  const isActive = (href: string) =>
    href === "/superadmin/tenants"
      ? path === href || path?.startsWith(`${href}/`)
      : path?.startsWith(href);

  return (
    <>
      {/* Mobile: top bar + scrollable nav row. */}
      <div className="border-b hairline bg-[var(--bg-elev)] lg:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <Brand />
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="text-ink-mute hover:text-ink"
          >
            <IconSignOut size={18} />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3" aria-label="Superadmin sections">
          {GROUPS.flatMap((g) => g.items).map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] ${
                isActive(it.href)
                  ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                  : "text-ink-mute"
              }`}
            >
              <IconNav name={it.icon} size={14} />
              {it.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop: fixed left sidebar. */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r hairline bg-[var(--bg-elev)] lg:flex">
        <Brand />
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Superadmin sections">
          {GROUPS.map((g) => (
            <div key={g.group} className="mb-5">
              <p className="admin-nav-group">{g.group}</p>
              <div className="flex flex-col gap-0.5">
                {g.items.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    aria-current={isActive(it.href) ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                      isActive(it.href)
                        ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                        : "text-ink-mute hover:bg-[var(--surface)] hover:text-ink"
                    }`}
                  >
                    <IconNav name={it.icon} size={15} />
                    <span className="truncate">{it.label}</span>
                    {isActive(it.href) ? (
                      <span
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        aria-hidden
                      />
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t hairline px-4 py-3">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            {email}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-[var(--op-bad)]"
          >
            <IconSignOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <Link
      href="/superadmin/tenants"
      className="flex h-14 items-center gap-2.5 border-b hairline px-5"
    >
      <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
      <span className="font-display text-lg leading-none tracking-tight">
        StudioOS
      </span>
      <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.24em] text-ink-mute">
        Operator
      </span>
    </Link>
  );
}
