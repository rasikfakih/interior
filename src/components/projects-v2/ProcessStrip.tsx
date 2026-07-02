"use client";

import { useEffect, useRef, useState } from "react";
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
 * ProcessStripV2 - 4 stages, hairline dividers, GSAP reveal gated
 * on prefers-reduced-motion.
 *
 * Section 6 of 9. Taste-skill discipline:
 *   - 4 stages, no "Stage 1 / Stage 2" labels. Each label is a
 *     verb-only token.
 *   - Reduced-motion matchMedia is *subscribed* (carry-forward E
 *     audit note): if the OS-level setting flips mid-session the
 *     tween reapplies immediately.
 *   - Hairline ruler separates stages (no card boxes).
 *   - No chrome-pill eyebrow on this section.
 */
export default function ProcessStripV2() {
  const ref = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(media.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    if ("addEventListener" in media) {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reduceMotion || !ref.current) return undefined;
    gsap.registerPlugin(ScrollTrigger);

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
  }, [reduceMotion]);

  return (
    <section
      aria-label="Process timeline"
      className="py-16 md:py-24 bg-canvas"
    >
      <div className="container-page">
        <div className="mb-8 md:mb-12 max-w-[44ch]">
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
