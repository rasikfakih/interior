"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import Model3DViewer from "@/components/Model3DViewer";
import type { ProjectItemV2 } from "./types";

type Props = {
  items: ProjectItemV2[];
  categories: string[];
  years: string[];
};

/**
 * ProjectsV2Client - filter pills + card grid.
 *
 * Section 3. Taste-skill discipline:
 *   - Single CTA per intent (skill 4.5). The grid opens /projects/{slug}
 *     on tile click; intent is "view project," distinct from /contact.
 *   - Filter pills are full-pill buttons, mono labels.
 *   - Categories + Years use a single mono label per group, not split
 *     eyebrows. The "Category" / "Year" labels inside the filter row
 *     are field legends, not eyebrow counts (skill 4.7).
 *   - Grid is 2-up desktop, 1-up mobile to avoid bento repetition.
 *   - On <=2 cards, no vertical stagger (avoids forced zigzag below
 *     the 2-section cap of skill 4.7).
 */
export default function ProjectsClientV2({
  items,
  categories,
  years,
}: Props) {
  const [activeCat, setActiveCat] = useState<string>("All");
  const [activeYear, setActiveYear] = useState<string>("All");
  const [openModel, setOpenModel] = useState<ProjectItemV2 | null>(null);

  const matched = useMemo(() => {
    return items.filter((p) => {
      const cat = activeCat === "All" || p.category === activeCat;
      const year = activeYear === "All" || p.year === activeYear;
      return cat && year;
    });
  }, [items, activeCat, activeYear]);

  const staggerActive = matched.length >= 3;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8 mb-8 md:mb-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mr-2">
            Category
          </span>
          {["All", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCat(c)}
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
              onClick={() => setActiveYear(y)}
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

      {matched.length === 0 ? (
        <div className="surface-tile p-10 text-center">
          <p className="chrome-pill mb-3 inline-flex">No matches</p>
          <p className="text-ink-mute max-w-prose mx-auto">
            No residences on public record for this category and year.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12 md:gap-y-16">
          {matched.map((p, i) => (
            <article
              key={p.slug}
              data-tile
              data-cat={p.category}
              data-year={p.year}
              className={`${staggerActive && i % 2 === 1 ? "md:mt-12" : ""}`}
            >
              <Link
                href={`/projects/${p.slug}`}
                className="group block relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/11]"
              >
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                {p.has3D && (
                  <span className="absolute top-3 left-3 chrome-pill">
                    3D - walk-through
                  </span>
                )}
              </Link>
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl md:text-3xl tracking-tight">
                    <Link
                      href={`/projects/${p.slug}`}
                      className="hover:text-accent transition-colors"
                    >
                      {p.title}
                    </Link>
                  </h3>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-mute mt-2">
                    {p.location} - {p.scope}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-mute">
                    {p.year}
                  </p>
                  {p.has3D && (
                    <button
                      type="button"
                      onClick={() => setOpenModel(p)}
                      className="text-[10px] font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
                    >
                      Open 3D
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {openModel && openModel.has3D && openModel.modelUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/55"
          onClick={() => setOpenModel(null)}
        >
          <div
            className="bg-canvas border hairline rounded-[var(--radius-card)] w-full max-w-4xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-4 border-b hairline">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  {openModel.location}
                </p>
                <p className="text-lg">{openModel.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenModel(null)}
                className="text-xs font-mono uppercase tracking-[0.18em]"
              >
                Close
              </button>
            </header>
            <div className="aspect-[16/9] relative">
              <Model3DViewer
                modelUrl={openModel.modelUrl}
                posterUrl={openModel.posterUrl || openModel.image}
              />
            </div>
            <footer className="flex justify-between items-center p-4 border-t hairline">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {openModel.scope}
              </p>
              <Link
                href={`/projects/${openModel.slug}`}
                className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
              >
                Full project
              </Link>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
