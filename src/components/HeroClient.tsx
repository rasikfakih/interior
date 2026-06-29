"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@/lib/use-gsap";

gsap.registerPlugin(ScrollTrigger);

type HeroData = {
  eyebrow?: string;
  headlinePlain?: string;
  headlineItalic?: string;
  afterPlain?: string;
  subtext?: string;
  photoUrl?: string;
  studioNote?: string;
  stats?: { label: string; value: string }[];
};

function normalizeTail(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/^[\s,.;:]+/, "").trim();
}

export default function HeroClient({ data }: { data: HeroData }) {
  const root = useRef<HTMLElement | null>(null);
  const photoRef = useRef<HTMLDivElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const eyebrowRef = useRef<HTMLSpanElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      if (eyebrowRef.current) {
        tl.fromTo(
          eyebrowRef.current,
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0
        );
      }

      if (headlineRef.current) {
        const words = headlineRef.current.querySelectorAll(".ei-word");
        if (words.length) {
          gsap.set(words, { yPercent: 110, opacity: 0 });
          tl.to(words, {
            yPercent: 0,
            opacity: 1,
            duration: 1.05,
            stagger: 0.045,
            ease: "expo.out",
          }, 0.1);
        }
      }

      if (subRef.current) {
        tl.fromTo(
          subRef.current,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85 },
          0.5
        );
      }

      if (ctaRef.current) {
        tl.fromTo(
          ctaRef.current,
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0.65
        );
      }

      if (studioRef.current) {
        tl.fromTo(
          studioRef.current,
          { y: 18, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 0.85 },
          0.85
        );
      }

      if (photoRef.current) {
        gsap.fromTo(
          photoRef.current,
          { scale: 1.18, filter: "blur(8px)", opacity: 0.6 },
          {
            scale: 1,
            filter: "blur(0px)",
            opacity: 1,
            duration: 1.6,
            ease: "expo.out",
          }
        );
        gsap.to(photoRef.current, {
          yPercent: 12,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      }

      if (statsRef.current) {
        const tiles = statsRef.current.querySelectorAll(".ei-stat");
        gsap.set(tiles, { y: 22, opacity: 0 });
        ScrollTrigger.batch(tiles, {
          start: "top 85%",
          onEnter: (batch) =>
            gsap.to(batch, {
              y: 0,
              opacity: 1,
              duration: 0.7,
              stagger: 0.07,
              ease: "expo.out",
              overwrite: true,
            }),
          once: true,
        });

        const rules = statsRef.current.querySelectorAll(".ei-stat-rule");
        rules.forEach((rule) => {
          gsap.fromTo(
            rule,
            { scaleX: 0, transformOrigin: "left center" },
            {
              scaleX: 1,
              duration: 1.1,
              ease: "expo.out",
              scrollTrigger: {
                trigger: rule,
                start: "top 90%",
                once: true,
              },
            }
          );
        });
      }
    },
    root,
    []
  );

  const stats = data?.stats || [];
  const statsValid = stats.filter(
    (s) => s && typeof s.label === "string" && typeof s.value === "string"
  );

  return (
    <section
      ref={root as any}
      className="relative pt-24 md:pt-28 pb-16 md:pb-24"
      aria-label="Hero"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-end">
          <div className="md:col-span-7">
            <span
              ref={eyebrowRef}
              className="chrome-pill inline-flex mb-6"
              style={{ opacity: 0 }}
            >
              {data?.eyebrow || "Residential Studio"}
            </span>

            <h1
              ref={headlineRef}
              className="text-[clamp(2.4rem,6vw,5rem)] leading-[1.05] tracking-[-0.025em] pb-1"
            >
              <span className="ei-word inline-block overflow-hidden align-bottom">
                <span className="inline-block">{data?.headlinePlain || "Homes built around"}</span>
              </span>{" "}
              <em className="text-accent font-medium italic ei-word inline-block overflow-hidden align-bottom">
                <span className="inline-block">{data?.headlineItalic || "how you live"}</span>
              </em>
              {normalizeTail(data?.afterPlain) && (
                <>
                  ,{" "}
                  <span className="ei-word inline-block overflow-hidden align-bottom">
                    <span className="inline-block">
                      {normalizeTail(data.afterPlain)}
                    </span>
                  </span>
                  .
                </>
              )}
            </h1>

            <p
              ref={subRef}
              className="mt-6 max-w-[58ch] text-ink-mute text-base md:text-lg leading-relaxed"
              style={{ opacity: 0 }}
            >
              {data?.subtext ||
                "Twenty-four weeks. One team. Drawings, materials, and on-site direction from the same hands."}
            </p>

            <div
              ref={ctaRef}
              className="mt-10 flex flex-wrap items-center gap-3"
              style={{ opacity: 0 }}
            >
              <a href="/contact" className="btn-primary">
                Start a project
                <span aria-hidden>↗</span>
              </a>
              <a href="/projects" className="btn-ghost">
                See selected work
              </a>
            </div>
          </div>

          <div className="md:col-span-5 relative aspect-[4/5] w-full">
            <div
              ref={photoRef}
              className="absolute inset-0 overflow-hidden rounded-[var(--radius-card)]"
            >
              <Image
                src={
                  data?.photoUrl ||
                  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1600&auto=format&fit=crop"
                }
                alt="A residential interior in soft natural light"
                fill
                priority
                sizes="(min-width: 768px) 40vw, 100vw"
                className="object-cover"
                style={{ willChange: "transform" }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-transparent" />
            </div>

            {data?.studioNote && (
              <div
                ref={studioRef}
                className="absolute -bottom-6 -left-6 hidden md:block"
                style={{ opacity: 0 }}
              >
                <div className="surface-elevated px-5 py-4 max-w-[220px]">
                  <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute">
                    Studio note
                  </p>
                  <p className="text-sm mt-2 leading-snug">{data.studioNote}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {statsValid.length > 0 && (
          <div
            ref={statsRef}
            className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {statsValid.map((s, i) => (
              <div key={i} className="ei-stat" style={{ opacity: 0 }}>
                <div className="ei-stat-rule h-px bg-[var(--line-strong)] mb-4 origin-left" />
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute">
                  {s.label}
                </p>
                <p className="text-2xl md:text-3xl mt-2 tracking-tight">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
