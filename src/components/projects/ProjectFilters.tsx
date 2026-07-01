"use client";

import { useState } from "react";
import type { ProjectItem } from "./types";

type Props = {
  categories: string[];
  years: string[];
  items: ProjectItem[];
  onFiltered?: (items: ProjectItem[]) => void;
};

/**
 * ProjectFilters - client island. Pills (not buttons), taste-skill
 * Section 5 'real-time filter' wording. Server renders default list,
 * client toggles visible state with simple CSS hide. Avoids hydration
 * mismatches by leaving the same DOM and toggling a `data-cat` /
 * `data-year` filter, never rebuilding the array.
 */
export default function ProjectFilters({
  categories,
  years,
  items,
}: Props) {
  const [activeCat, setActiveCat] = useState<string>("All");
  const [activeYear, setActiveYear] = useState<string>("All");

  function applyFilter(cat: string, year: string) {
    setActiveCat(cat);
    setActiveYear(year);
    if (typeof document === "undefined") return;
    const tiles = document.querySelectorAll<HTMLElement>("[data-tile]");
    tiles.forEach((tile) => {
      const matchesCat = cat === "All" || tile.dataset.cat === cat;
      const matchesYear = year === "All" || tile.dataset.year === year;
      tile.style.display = matchesCat && matchesYear ? "" : "none";
    });
    // The client only flips display:none, it never reorders array - keeps
    // SSR markup authoritative per taste-skill 'server renders, client
    // enhances'.
  }

  // Touch a no-op read on items so the type contract stays, even if a
  // future iteration wires a controlled callback. No-op today.
  void items;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mr-2">
          Category
        </span>
        {["All", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => applyFilter(c, activeYear)}
            aria-pressed={activeCat === c}
            className={`font-mono text-[11px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-[var(--radius-pill)] transition-colors ${
              activeCat === c
                ? "bg-ink text-bg"
                : "border hairline-strong text-ink hover:bg-canvas"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mr-2">
          Year
        </span>
        {["All", ...years].map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => applyFilter(activeCat, y)}
            aria-pressed={activeYear === y}
            className={`font-mono text-[11px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-[var(--radius-pill)] transition-colors ${
              activeYear === y
                ? "bg-ink text-bg"
                : "border hairline-strong text-ink hover:bg-canvas"
            }`}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
}
