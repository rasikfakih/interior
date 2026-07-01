"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const STAGES: { label: string; hours: string; note: string }[] = [
  {
    label: "Draw",
    hours: "Weeks 1-4",
    note: "Plan, section, elevation. Hand sketches first, CAD second.",
  },
  {
    label: "Specify",
    hours: "Weeks 5-10",
    note: "Materials, finishes, fixtures. Counter-sourced, never catalogue.",
  },
  {
    label: "Build",
    hours: "Weeks 11-20",
    note: "On-site direction. Same hands every Saturday.",
  },
  {
    label: "Live in",
    hours: "Weeks 21-24",
    note: "Snag, hand-off, one year defect window.",
  },
];

/**
 * ProcessStrip - scroll-snap horizontal pills, GSAP-driven per-stage
 * reveal.
 *
 * Section 6 of 9. Taste-skill audit:
 *   - 4 stages, no "Stage 1 / Stage 2" labels. Each label is a
 *     verb (Draw / Specify / Build / Live in).
 *   - GSAP is gated on prefers-reduced-motion.
 *   - Reduced motion falls back to plain scroll-snap rail.
 *   - Hairline ruler separates stages instead of card boxes.
 */
export default function ProcessStrip() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce || !ref.current) return;

    const ctx = gsap.context(() => {
      const stages = gsap.utils.toArray<HTMLElement>("[data-stage]");
      gsap.from(stages, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 75%",
          once: true,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section
      aria-label="Process timeline"
      className="py-16 md:py-24 bg-canvas"
    >
      <div className="container-page">
        <div className="mb-8 md:mb-12 max-w-[44ch]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
            How a project runs
          </p>
          <h2 className="font-display text-3xl md:text-5xl tracking-[-0.015em] leading-[1.05] pb-1">
            Twenty-four weeks, four stages, one team.
          </h2>
        </div>

        <div
          ref={ref}
          className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 snap-x snap-mandatory flex md:grid md:grid-cols-4 gap-0 md:divide-x md:divide-[var(--line)]"
        >
          {STAGES.map((s, i) => (
            <article
              key={s.label}
              data-stage
              className="snap-start shrink-0 w-[78vw] md:w-auto md:py-4 md:px-6 first:md:pl-0 last:md:pr-0 pr-6 md:pr-6 last:pr-0 py-6 border-b md:border-b-0 hairline flex flex-col gap-3"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-2xl md:text-3xl tracking-[-0.015em] leading-[1.05]">
                {s.label}
              </h3>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
                {s.hours}
              </p>
              <p className="text-sm md:text-base text-ink-mute leading-relaxed pt-2">
                {s.note}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
