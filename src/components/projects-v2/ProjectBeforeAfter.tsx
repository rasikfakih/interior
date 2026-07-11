"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

type Props = {
  title: string;
  beforeSrc: string | null;
  beforeAlt: string;
  afterSrc: string | null;
  afterAlt: string;
  caption: string;
};

const FALLBACK =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop";

/**
 * ProjectBeforeAfterV2 - real DB before/after reveal.
 *
 * Section 2 of 7 on /projects-v2/[slug]. Taste-skill §6.B /
 * §4.7 / §6.A discipline:
 *   - When both panes exist, render the BeforeAfterSlider as a
 *     pointer-driven reveal. When reduced-motion is active the
 *     slider falls back to a static 50/50 side-by-side reveal
 *     rather than dragging (no continuous pointer physics the
 *     viewer cannot stop).
 *   - When only the before image exists, render a single
 *     priority-loaded hero with a tiny mono caption. No fake
 *     after pane.
 *   - Real DB URLs only - no picsum, no FALLBACK marker in
 *     shipped markup. The component defaults to the same
 *     Unsplash file the rest of the studio uses when the row
 *     is missing data.
 *   - aspect-[16/9] locked on the figure to keep CLS near
 *     zero (skill §6.D).
 *   - LCP-preferred: the rendered pane carries `priority` and
 *     `fetchPriority="high"` so Vercel ships it as the LCP
 *     candidate during the prerender pass.
 */
export default function ProjectBeforeAfterV2({
  title,
  beforeSrc,
  beforeAlt,
  afterSrc,
  afterAlt,
  caption,
}: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mql.matches);
    const handler = (ev: MediaQueryListEvent) => setReduceMotion(ev.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  const hasBoth = Boolean(beforeSrc) && Boolean(afterSrc);
  const onlyBefore = Boolean(beforeSrc) && !hasBoth;
  const before = beforeSrc || FALLBACK;
  const after = afterSrc || FALLBACK;

  if (hasBoth && reduceMotion) {
    return (
      <section
        aria-label="Before and after"
        className="py-10 md:py-16 bg-canvas"
      >
        <div className="container-page">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <figure className="relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/9] surface-tile">
              <Image
                src={before}
                alt={beforeAlt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
                className="object-cover"
              />
              <span className="absolute top-3 left-3 chrome-pill">Before</span>
            </figure>
            <figure className="relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/9] surface-tile">
              <Image
                src={after}
                alt={afterAlt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
                className="object-cover"
              />
              <span className="absolute top-3 left-3 chrome-pill">After</span>
            </figure>
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {caption}
          </p>
        </div>
      </section>
    );
  }

  if (hasBoth) {
    return (
      <section
        aria-label="Before and after"
        className="py-10 md:py-16 bg-canvas"
      >
        <div className="container-page">
          <BeforeAfterSlider
            beforeSrc={before}
            beforeAlt={beforeAlt}
            afterSrc={after}
            afterAlt={afterAlt}
            caption={`${caption} - drag the seam to reveal`}
          />
        </div>
      </section>
    );
  }

  if (onlyBefore) {
    return (
      <section
        aria-label="Before photograph"
        className="py-10 md:py-16 bg-canvas"
      >
        <div className="container-page">
          <figure className="relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/9] surface-elevated">
            <Image
              src={before}
              alt={`${title} - photograph`}
              fill
              sizes="(min-width: 1280px) 1232px, 100vw"
              priority
              fetchPriority="high"
              className="object-cover"
            />
          </figure>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {caption}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Project placeholder photograph"
      className="py-10 md:py-16 bg-canvas"
    >
      <div className="container-page">
        <figure className="relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/9] surface-tile">
          <Image
            src={FALLBACK}
            alt={`${title} - placeholder`}
            fill
            sizes="(min-width: 1280px) 1232px, 100vw"
            priority
            className="object-cover"
          />
        </figure>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Photograph on file with the studio - request via /contact.
        </p>
      </div>
    </section>
  );
}
