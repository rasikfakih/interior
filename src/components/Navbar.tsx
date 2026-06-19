"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { useI18n } from "./I18nProvider";

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
            aria-label="Etihad Interiors — home"
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
                className="text-[13px] tracking-[0.04em] text-ink hover:text-warm transition-colors"
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
              className="bg-transparent text-xs font-mono uppercase tracking-[0.18em] py-1.5 px-2 focus:outline-none"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="mr">MR</option>
            </select>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full border hairline-strong flex items-center justify-center hover:bg-[var(--surface-strong)] transition-colors"
            >
              <span className="text-xs font-mono uppercase tracking-[0.16em]">
                {theme === "dark" ? "Lt" : "Dk"}
              </span>
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden w-9 h-9 flex flex-col justify-center items-center gap-1.5"
              aria-label="Open menu"
              aria-expanded={isMenuOpen}
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
          <div className="md:hidden border-t hairline bg-canvas">
            <nav className="container-page py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg"
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
