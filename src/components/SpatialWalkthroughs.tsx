"use client";

import { useEffect, useRef, useState } from "react";
import Model3DViewer from "./Model3DViewer";
import Link from "next/link";

type Item = {
  slug: string;
  title: string;
  location: string;
  modelUrl: string;
  posterUrl?: string;
  scope?: string;
};

const seed: Item[] = [
  {
    slug: "nalanda-house",
    title: "Nalanda House",
    location: "Kalyan, Maharashtra",
    modelUrl: "/models/seed/reception-room.glb",
    posterUrl: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop",
    scope: "4,200 sq.ft · Villa",
  },
  {
    slug: "casa-mira",
    title: "Casa Mira",
    location: "Bandra, Mumbai",
    modelUrl: "/models/seed/casa-mira.glb",
    posterUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1600&auto=format&fit=crop",
    scope: "1,820 sq.ft · Apartment",
  },
  {
    slug: "salt-flats",
    title: "Salt Flats",
    location: "Alibaug, Maharashtra",
    modelUrl: "/models/seed/salt-flats.glb",
    posterUrl: "https://images.unsplash.com/photo-1613553497126-a44624272013?q=80&w=1600&auto=format&fit=crop",
    scope: "3,400 sq.ft · Coastal",
  },
];

export default function SpatialWalkthroughs({
  data,
  compact = false,
}: {
  data?: any;
  compact?: boolean;
}) {
  const slugs: string[] = data?.projectSlugs || seed.map((s) => s.slug);
  const items = slugs
    .map((s) => seed.find((p) => p.slug === s))
    .filter((i): i is Item => Boolean(i));
  const eyebrow = data?.eyebrow || "Walk through";
  const title = data?.title || "Spatial studies, in 3D";
  const lede = data?.lede || "Tap to load. Rotate. Reduced-motion skips animation.";

  if (items.length === 0) {
    return (
      <section className="py-16 container-page text-center text-ink-mute">
        No spatial studies yet.
      </section>
    );
  }

  return (
    <section className="py-20 md:py-28 bg-canvas" aria-label="Spatial walkthroughs">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
          <div className="md:col-span-7">
            <p className="chrome-pill mb-4 inline-flex">{eyebrow}</p>
            <h2 className="text-4xl md:text-6xl tracking-tighter">{title}</h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">{lede}</p>
          </div>
        </div>
        <div className="-mx-6 px-6 overflow-x-auto snap-x snap-mandatory flex gap-5 pb-2">
          {items.map((it, i) => (
            <WalkthroughCard key={it.slug} item={it} index={i} compact={compact} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WalkthroughCard({
  item,
  index,
  compact,
}: {
  item: Item;
  index: number;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <article className="snap-start shrink-0 w-[88vw] md:w-[560px] surface-tile overflow-hidden">
        <div className="aspect-[16/10] relative">
          <img
            src={item.posterUrl}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-end p-6 bg-gradient-to-t from-black/60 to-transparent">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">
                {item.location}
              </p>
              <p className="text-white text-2xl md:text-3xl mt-1 tracking-tight">
                {item.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute top-4 right-4 btn-primary"
          >
            Load 3D
          </button>
        </div>
        <div className="p-5 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {item.scope}
          </p>
          <Link
            href={`/projects/${item.slug}`}
            className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
          >
            View project →
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="snap-start shrink-0 w-[88vw] md:w-[720px] surface-elevated overflow-hidden">
      <div className="aspect-[16/9] relative">
        <Model3DViewer
          modelUrl={item.modelUrl}
          posterUrl={item.posterUrl}
          compact={compact}
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 btn-ghost"
        >
          Close
        </button>
      </div>
      <div className="p-5 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {item.location}
          </p>
          <p className="text-xl mt-1">{item.title}</p>
        </div>
        <Link
          href={`/projects/${item.slug}`}
          className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
        >
          View project →
        </Link>
      </div>
    </article>
  );
}
