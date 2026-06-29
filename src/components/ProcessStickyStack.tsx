"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Phase = {
  number: string;
  title: string;
  body: string;
  deliverable: string;
  duration: string;
};

const defaultPhases: Phase[] = [
  { number: "01", title: "Brief", body: "We start at the kitchen table, not the mood board.", deliverable: "Site survey, spatial brief, budget frame", duration: "Week 1-2" },
  { number: "02", title: "Spatial design", body: "Plans, sections, and elevations drawn to scale.", deliverable: "Architectural plans, furniture grids", duration: "Week 3-6" },
  { number: "03", title: "Material", body: "Stone, wood, metal, textile. We source from quarries, mills and workshops.", deliverable: "Material board, vendor list, samples", duration: "Week 6-9" },
  { number: "04", title: "Build", body: "Site direction, weekly visits, written reports.", deliverable: "Weekly reports, snag list, QC photos", duration: "Week 10-24" },
  { number: "05", title: "Handover", body: "Furniture placed, art hung, lighting tuned.", deliverable: "As-built manual, vendor contacts", duration: "Final week" },
];

export default function ProcessStickyStack({ data }: { data?: any }) {
  const phases: Phase[] = data?.phases || defaultPhases;
  const eyebrow = data?.eyebrow || "How we work";
  const title = data?.title || "Five phases. Twenty-four weeks. One team.";
  const ref = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mql.matches);
    const onChange = () => setReduceMotion(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || !ref.current || phases.length < 2) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".process-card");
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return;
        ScrollTrigger.create({
          trigger: card,
          start: "top top",
          endTrigger: cards[cards.length - 1],
          end: "top top",
          pin: true,
          pinSpacing: false,
        });
        gsap.to(card, {
          scale: 0.94,
          opacity: 0.5,
          ease: "none",
          scrollTrigger: {
            trigger: cards[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
      });
    }, ref);

    return () => ctx.revert();
  }, [phases.length, reduceMotion]);

  return (
    <section ref={ref} className="relative bg-elev py-20 md:py-28" aria-label="Process">
      <div className="container-page mb-12 md:mb-20">
        <p className="chrome-pill mb-4">{eyebrow}</p>
        <h2 className="text-4xl md:text-6xl tracking-tighter">{title}</h2>
      </div>

      <div className="container-page">
        {phases.map((p, i) => (
          <article
            key={p.number}
            className="process-card sticky top-0 min-h-[88dvh] flex items-center justify-center py-10"
            style={{ zIndex: i + 1 }}
          >
            <div className="surface-elevated w-full overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0 rounded-[var(--radius-card)]">
              <div className="md:col-span-5 p-8 md:p-12 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs tracking-[0.22em] uppercase text-ink-mute">
                    Phase {p.number}
                  </span>
                  <h3 className="text-4xl md:text-5xl mt-4 mb-6">{p.title}</h3>
                  <p className="text-ink-mute text-base md:text-lg leading-relaxed">
                    {p.body}
                  </p>
                </div>
                <div className="mt-10 space-y-2">
                  <div className="flex justify-between text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
                    <span>Deliverable</span>
                    <span className="text-ink">{p.duration}</span>
                  </div>
                  <div className="chrome-rule" />
                  <p className="text-sm text-ink mt-3">{p.deliverable}</p>
                </div>
              </div>
              <div className="md:col-span-7 relative aspect-[16/10] md:aspect-auto md:min-h-[60dvh] bg-canvas">
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  Phase {p.number}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
