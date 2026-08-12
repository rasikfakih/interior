"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP, useReducedMotion } from "@/lib/use-gsap";
import Magnetic from "@/components/Magnetic";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  count: number;
  imageUrl?: string;
};

/**
 * ProjectsHeroV2 - cinematic full-viewport hero.
 *
 * Phase 4 immersion pass. The archive hero was a type-only split; it
 * now opens with real studio photography behind a kinetic word-by-word
 * headline, a parallax scrub, and a single magnetic CTA. Taste-skill
 * discipline preserved from the audit:
 *   - Headline 2 lines max at desktop, 6 words.
 *   - Subtext under 20 words, single CTA (Begin a project -> /contact).
 *   - No eyebrow. Scroll cue is a line, not a label.
 *   - Reduced-motion renders the markup visible at first paint (the
 *     timeline never runs, so nothing may start hidden).
 */
export default function ProjectsHeroV2({ count, imageUrl }: Props) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLElement | null>(null);
  const photoRef = useRef<HTMLDivElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const cueRef = useRef<HTMLDivElement | null>(null);

  // Entrance elements start invisible only when the timeline will run;
  // under reduced-motion they must render at rest.
  const initialHidden = { opacity: 0 };
  const visibleAtRest = {};

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      if (headlineRef.current) {
        const words = headlineRef.current.querySelectorAll(".ei-word");
        if (words.length) {
          gsap.set(words, { yPercent: 110, opacity: 0 });
          tl.to(
            words,
            { yPercent: 0, opacity: 1, duration: 1.05, stagger: 0.05 },
            0.15
          );
        }
      }

      if (subRef.current) {
        tl.fromTo(
          subRef.current,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85 },
          0.55
        );
      }

      if (ctaRef.current) {
        tl.fromTo(
          ctaRef.current,
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0.7
        );
      }

      if (cueRef.current) {
        tl.fromTo(
          cueRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.6 },
          1.0
        );
      }

      if (photoRef.current) {
        // Slow settle on load, then a scrubbed parallax as the page
        // scrolls away - the photo stays alive under the type.
        gsap.fromTo(
          photoRef.current,
          { scale: 1.12 },
          { scale: 1, duration: 1.8, ease: "expo.out" }
        );
        gsap.to(photoRef.current, {
          yPercent: 14,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      }
    },
    root,
    []
  );

  const subject =
    count === 0
      ? "Nothing on public record yet"
      : count === 1
        ? "One residence on public record"
        : `${count} residences on public record`;

  const headlineWords = ["Homes", "drawn,", "built,", "and", "lived", "in."];

  return (
    <section
      ref={root}
      aria-label="Projects hero"
      className="relative min-h-[100dvh] flex items-end md:items-center overflow-hidden bg-ink"
    >
      <div ref={photoRef} className="absolute inset-0 will-change-transform">
        <Image
          src={imageUrl || "/demo/living-room-1.jpg"}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/45" />
      </div>

      <div className="container-page relative z-10 w-full pt-24 pb-14 md:pb-20 text-bg">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-end">
          <div className="md:col-span-8">
            <h1
              ref={headlineRef}
              className="font-display text-[clamp(2.6rem,7vw,6rem)] tracking-[-0.025em] leading-[0.98] pb-1 text-bg"
            >
              {headlineWords.map((w) => (
                <span
                  key={w}
                  className="ei-word inline-block overflow-hidden align-bottom"
                >
                  <span className="inline-block">{w}</span>
                  {w === "drawn," || w === "built," || w === "and" ? " " : ""}
                </span>
              ))}
            </h1>
          </div>
          <div className="md:col-span-4 md:pb-2">
            <p
              ref={subRef}
              className="text-white/75 text-base md:text-lg leading-relaxed max-w-[40ch]"
              style={reduce ? visibleAtRest : initialHidden}
            >
              {subject}. Drawings archived, photographs kept. No full client
              list published.
            </p>
            <div
              ref={ctaRef}
              className="mt-8 flex flex-wrap gap-3"
              style={reduce ? visibleAtRest : initialHidden}
            >
              <Magnetic>
                <Link href="/contact" className="btn-primary">
                  Begin a project
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>

        <div
          ref={cueRef}
          className="mt-14 flex items-center gap-3 text-white/60 font-mono text-[10px] uppercase tracking-[0.22em]"
          style={reduce ? visibleAtRest : initialHidden}
        >
          Scroll
          <span className="w-10 h-px bg-white/40" aria-hidden />
        </div>
      </div>
    </section>
  );
}
