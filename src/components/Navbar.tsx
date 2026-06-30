"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTheme } from "./ThemeProvider";
import { useI18n } from "./I18nProvider";

gsap.registerPlugin(ScrollTrigger);

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile drawer: escape closes, body scroll locks while open, and
  // Tab is contained inside the drawer (mobile focus trap, §PR1).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const drawer = document.getElementById("mobile-nav-drawer");
    if (!drawer) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    if (isMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const focusables = () =>
        Array.from(
          drawer.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("aria-hidden"));

      const first = focusables()[0];
      const last = focusables()[focusables().length - 1];
      first?.focus();

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsMenuOpen(false);
          return;
        }
        if (e.key !== "Tab") return;
        const list = focusables();
        if (list.length === 0) return;
        const firstEl = list[0];
        const lastEl = list[list.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      };
      document.addEventListener("keydown", onKey);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener("keydown", onKey);
        previouslyFocused?.focus?.();
      };
    }
    return undefined;
  }, [isMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = progressRef.current;
    if (!el) return;
    if (reduce) {
      el.style.transform = "scaleX(0)";
      return;
    }
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          gsap.to(el, {
            scaleX: self.progress,
            duration: 0.18,
            ease: "power2.out",
            overwrite: "auto",
          });
        },
      });
    });
    return () => ctx.revert();
  }, []);

  const navLinks = [
    { href: "/projects", label: "Selected work" },
    { href: "/about", label: "Studio" },
    { href: "/journal", label: "Journal" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0"
      style={{ zIndex: "var(--z-nav)" }}
    >
      <div
        ref={progressRef}
        aria-hidden
        className="absolute top-0 left-0 h-[2px] w-full origin-left"
        style={{
          background:
            "linear-gradient(90deg, var(--accent) 0%, var(--accent) 100%)",
          transform: "scaleX(0)",
        }}
      />
      <div
        className={`transition-colors duration-300 ${
          scrolled
            ? "bg-canvas/85 backdrop-blur-md border-b hairline"
            : "bg-transparent"
        }`}
      >
        <div className="container-page h-16 md:h-[72px] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Etihad Interiors  home"
          >
            <span
              aria-hidden
              className="w-6 h-6 rounded-[3px]"
              style={{
                background:
                  "linear-gradient(135deg, #d8dad4 0%, #6a6f68 50%, #2a2e2a 100%)",
              }}
            />
            <span className="text-sm md:text-base font-medium tracking-[-0.01em]">
              Etihad Interiors
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] tracking-[0.04em] text-ink hover:text-ink transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as "en" | "hi" | "mr")
              }
              aria-label="Language"
              className="bg-transparent text-xs font-mono uppercase tracking-[0.18em] py-3 md:py-1.5 px-2 focus:outline-none min-h-[44px] md:min-h-0"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="mr">MR</option>
            </select>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-11 h-11 md:w-9 md:h-9 rounded-full border hairline-strong flex items-center justify-center hover:bg-[var(--surface-strong)] transition-colors"
            >
              <span className="text-xs font-mono uppercase tracking-[0.16em]">
                {theme === "dark" ? "Lt" : "Dk"}
              </span>
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden w-11 h-11 flex flex-col justify-center items-center gap-1.5"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              <span
                className={`block w-5 h-px bg-current transition-transform ${
                  isMenuOpen ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`block w-5 h-px bg-current transition-opacity ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block w-5 h-px bg-current transition-transform ${
                  isMenuOpen ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="md:hidden border-t hairline bg-canvas"
          >
            <nav className="container-page py-4 flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg py-3 min-h-[44px] flex items-center border-b hairline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
