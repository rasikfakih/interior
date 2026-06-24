"use client";

import { useState } from "react";
import Link from "next/link";
import Model3DViewer from "@/components/Model3DViewer";

type Item = {
  slug: string;
  title: string;
  location: string;
  year: string;
  scope: string;
  image: string;
  has3D: boolean;
  modelUrl: string | null;
  posterUrl: string | null;
};

export default function ProjectsClient({ items }: { items: Item[] }) {
  const [openModel, setOpenModel] = useState<Item | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12 md:gap-y-16">
        {items.map((p, i) => (
          <article key={p.slug} className={`${i % 2 === 1 ? "md:mt-12" : ""}`}>
            <Link
              href={`/projects/${p.slug}`}
              className="group block relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/11]"
            >
              <img
                src={p.image}
                alt={p.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              {p.has3D && (
                <span className="absolute top-3 left-3 chrome-pill">
                  3D · walk-through
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
                  {p.location} · {p.scope}
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
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                {openModel.scope}
              </p>
              <Link
                href={`/projects/${openModel.slug}`}
                className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
              >
                Full project →
              </Link>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
