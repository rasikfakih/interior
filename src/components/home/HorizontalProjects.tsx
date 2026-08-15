"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { HomeProject } from "@/app/(public)/page";
import { useGSAP } from "@/lib/use-gsap";
import ShaderHoverCard from "./ShaderHoverCard";

gsap.registerPlugin(ScrollTrigger);

/**
 * HorizontalProjects: vertical scroll drives a pinned horizontal track
 * (GSAP ScrollTrigger xPercent). Each card is 80vw on desktop, an
 * editorial stack on mobile where the pin is disabled.
 */
export default function HorizontalProjects({ projects }: { projects: HomeProject[] }) {
  const scope = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!trackRef.current) return;
      const track = trackRef.current;
      const max = track.scrollWidth - window.innerWidth;
      if (max <= 0) return;
      const tween = gsap.to(track, {
        x: -max,
        ease: "none",
        scrollTrigger: {
          trigger: scope.current,
          start: "top top",
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    scope,
    [projects]
  );

  return (
    <section ref={scope} className="relative overflow-hidden bg-canvas">
      <div className="container-page pt-16 md:pt-24">
        <p className="eyebrow dark:text-[#9AA89E]">Selected work</p>
        <h2 className="font-hero mt-3 text-4xl md:text-6xl tracking-tight">
          Rooms we have built.
        </h2>
      </div>

      <div ref={trackRef} className="mt-10 md:mt-16 flex flex-col gap-8 md:flex-row md:gap-6 md:pl-[max(1.5rem,calc((100vw-1320px)/2))] md:pr-[max(1.5rem,calc((100vw-1320px)/2))]">
        {projects.map((p, i) => (
          <article
            key={p.slug}
            className="group md:w-[80vw] md:max-w-[980px] md:shrink-0"
          >
            <ShaderHoverCard
              src={p.image}
              alt={p.title}
              href={`/projects/${p.slug}`}
              className="aspect-[16/10] w-full"
            />
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
                  {String(i + 1).padStart(2, "0")} · {p.category} · {p.year}
                </p>
                <h3 className="font-hero mt-1 text-3xl md:text-5xl tracking-tight group-hover:text-[#735a2f] transition-colors">
                  {p.title}
                </h3>
              </div>
              <Link
                href={`/projects/${p.slug}`}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#122A20] border-b border-[#C0964F] pb-0.5 hover:text-[#735a2f] transition-colors shrink-0"
              >
                Open project
              </Link>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
              {p.location}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
