"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@/lib/use-gsap";

gsap.registerPlugin(ScrollTrigger);

const defaultItems = [
  { label: "One team", body: "Drawings, materials, and site direction from the same studio. No hand-offs." },
  { label: "Five phases", body: "A repeat process. Watched weekly. Reported in writing, not in chat." },
  { label: "On-site direction", body: "Weekly site visits. Snag lists with photographs. Final handover document." },
  { label: "No catalogue swap", body: "Materials are specified against the brief. Substitutions need a conversation." },
];

export default function Principles({ data }: { data?: any }) {
  const items = data?.items || defaultItems;
  const title = data?.title ?? "Four standards we hold ourselves to.";
  const lede =
    data?.lede ??
    "Drawn from the studio's first seven years. Decisions and standards, not copy.";

  const ref = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const tiles = ref.current?.querySelectorAll(".ei-prin");
      if (!tiles || tiles.length === 0) return;

      tiles.forEach((tile) => {
        const num = tile.querySelector(".ei-prin-num");
        const label = tile.querySelector(".ei-prin-label");
        const body = tile.querySelector(".ei-prin-body");
        const tl = gsap.timeline({
          scrollTrigger: { trigger: tile, start: "top 85%", once: true },
        });
        if (num) {
          gsap.set(num, { y: 14, opacity: 0 });
          tl.to(num, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" });
        }
        if (label) {
          gsap.set(label, { y: 18, opacity: 0 });
          tl.to(label, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out" }, 0.1);
        }
        if (body) {
          gsap.set(body, { y: 14, opacity: 0 });
          tl.to(body, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, 0.18);
        }
      });

      const headline = ref.current?.querySelector(".ei-prin-head");
      if (headline) {
        gsap.set(headline, { y: 20, opacity: 0 });
        gsap.to(headline, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "expo.out",
          scrollTrigger: { trigger: headline, start: "top 88%", once: true },
        });
      }
    },
    ref,
    []
  );

  return (
    <section
      ref={ref as any}
      className="py-20 md:py-28 bg-elev border-y hairline"
      aria-label="Studio principles"
    >
      <div className="container-page">
        <div className="ei-prin-head grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          <div className="md:col-span-7">
            <h2 className="text-3xl md:text-5xl tracking-tighter">{title}</h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">{lede}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border hairline rounded-[var(--radius-card)] overflow-hidden">
          {items.map((p: any, i: number) => (
            <article key={i} className="ei-prin bg-canvas p-6 md:p-7">
              <p className="ei-prin-num font-mono text-[10px] tracking-[0.22em] uppercase text-warm">
                0{i + 1}
              </p>
              <h3 className="ei-prin-label text-xl md:text-2xl mt-3 mb-3 tracking-tight">
                {p.label}
              </h3>
              <p className="ei-prin-body text-sm text-ink-mute leading-relaxed">
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
