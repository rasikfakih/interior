"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

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
 *
 * Press list is filtered at module scope so only verifiable
 * publications ship. Per taste-skill Section 4.8 (real company
 * logos for social proof - or drop press entirely), names
 * lacking market verification (Better Interiors, Home & Design,
 * Kaneki House) are removed; a future update with verified
 * real press can add rows here.
 */
const PRESS: { name: string }[] = [
  { name: "AD India" },
  { name: "Elle Decor" },
  { name: "Surface Magazine" },
];

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

  if (PRESS.length === 0) return null;

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
