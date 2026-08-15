"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";

const LINKS: { href: string; label: string }[] = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/demo", label: "Live demo" },
];

export function SaasNav() {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[var(--z-nav)] border-b hairline bg-canvas/85 backdrop-blur-md">
      <div className="container-page h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Studio OS home">
          <span
            aria-hidden
            className="h-5 w-5 rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, #c0964f 0%, #7d6233 55%, #122a20 100%)",
            }}
          />
          <span className="font-hero text-lg tracking-tight">Studio OS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="Product">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute hover:text-ink transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-9 w-9 rounded-lg border hairline-strong flex items-center justify-center hover:bg-[var(--surface-strong)] transition-colors"
          >
            <span aria-hidden className="font-mono text-[10px] uppercase tracking-[0.14em]">
              {theme === "dark" ? "Lt" : "Dk"}
            </span>
          </button>
          <Link
            href="/admin"
            className="rounded-lg border border-[var(--ink)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/admin"
            className="rounded-lg bg-[#C0964F] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#122A20] dark:text-[#122A20] hover:bg-[#D2B06A] transition-colors"
          >
            Get started
          </Link>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-9 w-9 rounded-lg border hairline-strong flex items-center justify-center"
          >
            <span aria-hidden className="font-mono text-[10px] uppercase tracking-[0.14em]">
              {theme === "dark" ? "Lt" : "Dk"}
            </span>
          </button>
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="h-9 w-9 flex flex-col justify-center items-center gap-1.5"
          >
            <span className={`block w-5 h-px bg-current transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`} />
            <span className={`block w-5 h-px bg-current transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-px bg-current transition-transform ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="Product mobile"
          className="md:hidden border-t hairline bg-canvas"
        >
          <div className="container-page py-4 flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 min-h-[44px] flex items-center border-b hairline font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="mt-4 rounded-lg bg-[#C0964F] px-4 py-3 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[#122A20] dark:text-[#122A20]"
            >
              Get started
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
