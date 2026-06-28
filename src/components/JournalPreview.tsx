"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@/lib/use-gsap";

gsap.registerPlugin(ScrollTrigger);

type Entry = {
  slug: string;
  title: string;
  excerpt: string;
  readingTime: string;
  date: string;
  category: string;
};

const defaultEntries: Entry[] = [
  {
    slug: "stone-quarries",
    title: "Three stone quarries outside Pune, and what they actually do",
    excerpt:
      "You'll never be quoted the same marble twice. A walk through the yards that supply our floors.",
    readingTime: "6 min",
    date: "Mar 2025",
    category: "Materials",
  },
  {
    slug: "first-meeting",
    title: "The first on-site meeting, and the four questions we always ask",
    excerpt:
      "How a household is lived in matters more than how it looks in renderings. A note from the studio's front room.",
    readingTime: "4 min",
    date: "Jan 2025",
    category: "Process",
  },
  {
    slug: "site-reports",
    title: "Why we still write site reports by hand",
    excerpt:
      "A photograph shows one moment. A written report shows the movement between them.",
    readingTime: "5 min",
    date: "Nov 2024",
    category: "Studio notes",
  },
];

export default function JournalPreview({
  title = "Studio Journal",
  titleEm = "Studio",
  lede = "Field notes from the studio. Written by hand. Published when ready.",
  count = 3,
}: {
  title?: string;
  titleEm?: string;
  lede?: string;
  count?: number;
}) {
  const entries = defaultEntries.slice(0, Math.max(1, Math.min(count, defaultEntries.length)));
  const ref = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const items = ref.current?.querySelectorAll(".ei-news-row");
      if (!items || items.length === 0) return;
      items.forEach((row, i) => {
        const line = row.querySelector(".ei-news-line");
        const meta = row.querySelector(".ei-news-meta");
        const body = row.querySelector(".ei-news-body");
        if (line) {
          gsap.set(line, { scaleX: 0, transformOrigin: "left center" });
          ScrollTrigger.create({
            trigger: row,
            start: "top 88%",
            once: true,
            onEnter: () =>
              gsap.to(line, {
                scaleX: 1,
                duration: 1.1,
                ease: "expo.out",
                delay: i * 0.05,
              }),
          });
        }
        const show = meta || body;
        if (show) {
          gsap.set(show, { y: 18, opacity: 0 });
          ScrollTrigger.create({
            trigger: row,
            start: "top 80%",
            once: true,
            onEnter: () =>
              gsap.to(show, {
                y: 0,
                opacity: 1,
                duration: 0.7,
                delay: i * 0.05 + 0.2,
                ease: "expo.out",
              }),
          });
        }
      });
      const headline = ref.current?.querySelector(".ei-news-head");
      if (headline) {
        gsap.set(headline, { y: 18, opacity: 0 });
        gsap.to(headline, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "expo.out",
          scrollTrigger: { trigger: headline, start: "top 88%", once: true },
        });
      }
    },
    ref,
    []
  );

  return (
    <section
      ref={ref as any}
      className="py-24 md:py-36 bg-elev"
      aria-label="Journal"
    >
      <div className="container-page">
        <div className="ei-news-head flex items-end justify-between flex-wrap gap-6 mb-12 md:mb-16">
          <div>
            <h2 className="text-4xl md:text-6xl tracking-tighter">
              <em className="text-accent not-italic font-medium">{titleEm}</em>{" "}
              {title?.replace(titleEm, "")}
            </h2>
            <p className="mt-4 text-ink-mute max-w-[48ch]">{lede}</p>
          </div>
          <Link
            href="/journal"
            className="text-sm font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
          >
            All entries →
          </Link>
        </div>

        <div className="divide-y hairline">
          {entries.map((e, i) => (
            <article
              key={e.slug}
              className="ei-news-row relative grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-10 py-8 md:py-10"
            >
              <div className="ei-news-meta md:col-span-2 flex md:flex-col gap-3 md:gap-2 text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
                <span>{e.date}</span>
                <span className="text-warm">{e.category}</span>
              </div>
              <div className="ei-news-body md:col-span-7">
                <Link href={`/journal/${e.slug}`} className="group">
                  <h3 className="text-2xl md:text-3xl tracking-tight group-hover:text-accent transition-colors">
                    {e.title}
                  </h3>
                  <p className="text-ink-mute mt-3 max-w-[60ch] leading-relaxed">
                    {e.excerpt}
                  </p>
                </Link>
              </div>
              <div className="md:col-span-3 md:text-right text-sm text-ink-mute font-mono uppercase tracking-[0.14em]">
                {e.readingTime}
              </div>
              <span
                aria-hidden
                className="ei-news-line absolute left-0 right-0 bottom-0 h-px bg-[var(--line)] -z-10"
                style={{ transformOrigin: "left center" }}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
