"use client";

import { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Model3DViewer from "./Model3DViewer";
import Link from "next/link";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

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
    posterUrl:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop",
    scope: "4,200 sq.ft · Villa",
  },
  {
    slug: "casa-mira",
    title: "Casa Mira",
    location: "Bandra, Mumbai",
    modelUrl: "/models/seed/casa-mira.glb",
    posterUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1600&auto=format&fit=crop",
    scope: "1,820 sq.ft · Apartment",
  },
  {
    slug: "salt-flats",
    title: "Salt Flats",
    location: "Alibaug, Maharashtra",
    modelUrl: "/models/seed/salt-flats.glb",
    posterUrl:
      "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?q=80&w=1600&auto=format&fit=crop",
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
  const lede =
    data?.lede ||
    "Tap to load. Drag to rotate. Reduced-motion sets a static frame.";

  if (items.length === 0) {
    return (
      <section className="py-16 container-page text-center text-ink-mute">
        No spatial studies yet.
      </section>
    );
  }

  return <WalkthroughDeck items={items} eyebrow={eyebrow} title={title} lede={lede} compact={compact} />;
}

function WalkthroughDeck({
  items,
  eyebrow,
  title,
  lede,
  compact,
}: {
  items: Item[];
  eyebrow: string;
  title: string;
  lede: string;
  compact: boolean;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    const mqlMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqlDesktop = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      setReduceMotion(mqlMotion.matches);
      setIsDesktop(mqlDesktop.matches);
    };
    sync();
    mqlMotion.addEventListener("change", sync);
    mqlDesktop.addEventListener("change", sync);
    return () => {
      mqlMotion.removeEventListener("change", sync);
      mqlDesktop.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || !isDesktop) return;
    const wrap = sectionRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const ctx = gsap.context(() => {
      const compute = () => track.scrollWidth - window.innerWidth;
      gsap.to(track, {
        x: () => -compute(),
        ease: "none",
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: () => `+=${compute()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [items.length, reduceMotion, isDesktop]);

  const useScrub = isDesktop && !reduceMotion;

  return (
    <section
      ref={sectionRef}
      className={
        useScrub
          ? "py-12 md:py-16 bg-canvas relative"
          : "py-24 md:py-32 bg-canvas relative"
      }
      aria-label="Spatial walkthroughs"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12 md:mb-16">
          <div className="md:col-span-7">
            <p className="chrome-pill mb-6 inline-flex">{eyebrow}</p>
            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] tracking-[-0.025em] leading-[1.05] pb-1">
              {title}
            </h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute leading-relaxed">{lede}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mt-4">
              {useScrub
                ? "Scroll down to walk through"
                : "Scroll horizontally for the next"}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        className={
          useScrub
            ? "px-[max(2rem,calc((100vw-1280px)/2+2rem))] flex h-[100dvh] items-center gap-8 will-change-transform"
            : "-mx-6 px-6 overflow-x-auto snap-x snap-mandatory flex gap-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
        {items.map((it, i) => (
          <WalkthroughCard
            key={it.slug}
            item={it}
            index={i}
            compact={compact}
            lockedWidth={useScrub}
          />
        ))}
      </div>

      <div className="container-page mt-10 pt-6 border-t hairline">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          <span aria-hidden className="inline-block mr-2">·</span>
          Each model rebuilds on load from the corresponding project page.
          See{" "}
          <Link
            href="/projects"
            className="text-accent border-b border-[var(--accent-soft)] hover:text-accent-deep transition-colors"
          >
            Selected work
          </Link>{" "}
          for the full dossier.
        </p>
      </div>
    </section>
  );
}

function WalkthroughCard({
  item,
  index,
  compact,
  lockedWidth,
}: {
  item: Item;
  index: number;
  compact: boolean;
  lockedWidth: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cardWidth = lockedWidth
    ? "w-[min(86vw,1100px)] h-[min(78dvh,720px)]"
    : "w-[88vw] md:w-[640px]";

  return (
    <article
      className={`shrink-0 ${cardWidth} ${
        open ? "surface-elevated" : "surface-tile"
      } ${lockedWidth ? "snap-start" : "snap-start"} overflow-hidden`}
    >
      <div className="aspect-[16/10] relative">
        {open ? (
          <>
            <Model3DViewer
              modelUrl={item.modelUrl}
              posterUrl={item.posterUrl}
              compact={compact}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-[var(--z-modal)] btn-ghost"
              aria-label="Close 3D walk-through"
            >
              Close
            </button>
          </>
        ) : (
          <>
            {item.posterUrl ? (
              <Image
                src={item.posterUrl}
                alt={item.title}
                fill
                priority={index === 0}
                sizes="(min-width: 768px) 640px, 88vw"
                className="object-cover"
                loading={index === 0 ? undefined : "lazy"}
              />
            ) : (
              <div className="absolute inset-0 bg-elev" aria-hidden />
            )}
            <div
              className="absolute inset-0 flex items-end p-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"
            >
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
              aria-label={`Load 3D walk-through for ${item.title}`}
            >
              Load 3D
            </button>
          </>
        )}
      </div>

      <div className="p-5 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {item.scope}
          </p>
          <p className="text-base mt-1">{item.title}</p>
        </div>
        <Link
          href={`/projects/${item.slug}`}
          className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1 shrink-0"
        >
          Dossier →
        </Link>
      </div>
    </article>
  );
}
