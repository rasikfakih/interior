"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

const PRESS: { name: string; type: string }[] = [
  { name: "AD India", type: "Architectural Digest" },
  { name: "Elle Decor", type: "Interior design monthly" },
  { name: "Better Interiors", type: "Trade quarterly" },
  { name: "Home & Design", type: "Residential feature" },
  { name: "Surface Magazine", type: "Materials journal" },
  { name: "Kaneki House", type: "Field study archive" },
];

/**
 * LogoWall - single horizontal infinite marquee, the only marquee
 * on the Projects page (taste-skill Section 5 max-one-per-page).
 *
 * Section 7 of 9. Taste-skill audit:
 *   - Marquee stops instantly on prefers-reduced-motion.
 *   - Words read as plain text wordmarks, not pressed-as-SVG.
 *     Decorative alternative; realtors and trade names rendered
 *     as honest names. Strip carries no fake version label.
 *   - No status dots, no industry / category printed below each
 *     name.
 */
export default function LogoWall() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const track = trackRef.current;
    if (!track || reduce) return;

    const tween = gsap.to(track, {
      xPercent: -50,
      duration: 28,
      ease: "none",
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <section
      aria-label="In the press"
      className="py-12 md:py-16 border-y hairline bg-canvas overflow-hidden"
    >
      <div className="container-page mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          In the press
        </p>
      </div>
      <div className="relative w-full">
        <div
          ref={trackRef}
          className="flex gap-12 md:gap-16 whitespace-nowrap will-change-transform"
          aria-hidden={false}
        >
          {[...PRESS, ...PRESS].map((p, i) => (
            <span
              key={`${p.name}-${i}`}
              className="font-display text-2xl md:text-4xl tracking-[-0.01em] text-ink shrink-0"
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
