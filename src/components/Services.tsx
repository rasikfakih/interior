"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@/lib/use-gsap";

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  {
    title: "Spatial design",
    body: "Plans, sections, and elevations drawn in-house. Locked before any material is chosen.",
    photo:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop",
    span: "md:col-span-7",
    aspect: "aspect-[16/10]",
  },
  {
    title: "Material specification",
    body: "Stone, wood, textile, finish — sourced and specified against your brief.",
    photo:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop",
    span: "md:col-span-5",
    aspect: "aspect-[16/12]",
  },
  {
    title: "On-site direction",
    body: "Weekly site visits. Written reports. Contractors work to drawings.",
    photo:
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=1600&auto=format&fit=crop",
    span: "md:col-span-5",
    aspect: "aspect-[16/11]",
  },
  {
    title: "Furniture & styling",
    body: "Custom joinery and made-to-order soft furnishing. Everything accounted for.",
    photo:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop",
    span: "md:col-span-7",
    aspect: "aspect-[16/9]",
  },
];

export default function Services() {
  const ref = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const cards = ref.current?.querySelectorAll(".ei-cap");
      if (!cards || cards.length === 0) return;

      cards.forEach((card, idx) => {
        const photo = card.querySelector(".ei-cap-photo");
        const overlay = card.querySelector(".ei-cap-overlay");
        if (photo) {
          gsap.set(photo, { clipPath: "inset(0 0 100% 0)" });
          ScrollTrigger.create({
            trigger: card,
            start: "top 80%",
            once: true,
            onEnter: () =>
              gsap.to(photo, {
                clipPath: "inset(0 0 0% 0)",
                duration: 1.2,
                delay: idx * 0.08,
                ease: "expo.out",
              }),
          });
        }
        if (overlay) {
          const text = overlay.querySelectorAll(".ei-cap-fade");
          if (text.length) {
            gsap.set(text, { y: 16, opacity: 0 });
            ScrollTrigger.create({
              trigger: card,
              start: "top 70%",
              once: true,
              onEnter: () =>
                gsap.to(text, {
                  y: 0,
                  opacity: 1,
                  duration: 0.7,
                  stagger: 0.08,
                  delay: 0.25 + idx * 0.05,
                  ease: "expo.out",
                }),
            });
          }
        }
      });
    },
    ref,
    []
  );

  return (
    <section
      ref={ref as any}
      className="bg-elev py-24 md:py-36"
      aria-label="What we do"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12 md:mb-16">
          <div className="md:col-span-7">
            <h2 className="text-4xl md:text-[3.5rem] tracking-tighter">
              A studio that draws, specifies, and{" "}
              <em className="text-warm not-italic font-medium">builds</em>.
            </h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute text-base md:text-lg leading-relaxed">
              Four capabilities. An interior studio that doesn't farm out
              drawings or hand off a material board at week six and disappear.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
          {capabilities.map((c, i) => (
            <article
              key={c.title}
              className={`ei-cap group relative overflow-hidden rounded-[var(--radius-card)] ${c.span}`}
            >
              <div className={`relative ${c.aspect} w-full overflow-hidden`}>
                <div className="ei-cap-photo absolute inset-0">
                  <img
                    src={c.photo}
                    alt={c.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              </div>
              <div className="ei-cap-overlay absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                <p className="ei-cap-fade font-mono text-[10px] tracking-[0.22em] uppercase text-white/70">
                  0{i + 1}
                </p>
                <h3 className="ei-cap-fade text-white text-2xl md:text-3xl mt-3 tracking-tight">
                  {c.title}
                </h3>
                <p className="ei-cap-fade text-white/80 text-sm md:text-base mt-2 max-w-[40ch]">
                  {c.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
