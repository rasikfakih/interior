"use client";

import { useEffect, useRef } from "react";
import Reveal from "./Reveal";
import Link from "next/link";
import ProcessStickyStack from "./ProcessStickyStack";
import RichTextRenderer from "./RichTextRenderer";
import SpatialWalkthroughs from "./SpatialWalkthroughs";
import Services from "./Services";
import SelectedWork from "./SelectedWork";
import Testimonials from "./Testimonials";
import Principles from "./Principles";
import JournalPreview from "./JournalPreview";
import ClosingCTA from "./ClosingCTA";
import HeroClient from "./HeroClient";
import { useReducedMotion } from "@/lib/use-gsap";

type Block = {
  id: number;
  type: string;
  data: any;
};

export default function PageRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockRenderer key={b.id ?? i} block={b} />
      ))}
    </>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return <HeroBlock data={block.data} />;
    case "principles":
      return <PrinciplesBlock data={block.data} />;
    case "services":
      return <ServicesBlock data={block.data} />;
    case "selected-work":
      return <SelectedWorkBlock data={block.data} />;
    case "process":
      return <ProcessBlock data={block.data} />;
    case "testimonials":
      return <TestimonialsBlock data={block.data} />;
    case "journal-preview":
      return <JournalPreviewBlock data={block.data} />;
    case "spatial-walkthroughs":
      return <SpatialWalkthroughs data={block.data} />;
    case "closing-cta":
      return <ClosingCTABlock data={block.data} />;
    case "rich-text":
      return <section className="py-12"><div className="container-page max-w-3xl"><RichTextRenderer json={block.data?.body} /></div></section>;
    case "image":
      return (
        <section className="py-8 container-page">
          <figure className={`relative w-full aspect-[${block.data?.aspect || "16/9"}] overflow-hidden rounded-[var(--radius-card)]`}>
            <img src={block.data?.url} alt={block.data?.alt || ""} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </figure>
        </section>
      );
    case "image-grid":
      return (
        <section className="py-12 container-page">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {(block.data?.images || []).map((img: any, i: number) => (
              <div key={i} className="aspect-[16/10] relative overflow-hidden rounded-[var(--radius-card)]">
                <img src={img.url} alt={img.alt || ""} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </section>
      );
    case "divider":
      return <div className="py-6 container-page"><div className="chrome-rule" /></div>;
    case "spacer":
      return <div className={block.data?.size === "lg" ? "py-24" : block.data?.size === "sm" ? "py-4" : "py-12"} />;
    default:
      return null;
  }
}

let step = 0;
function i_delay(n: number) { return 0; }

function HeroBlock({ data }: any) {
  return <HeroClient data={data} />;
}

function PrinciplesBlock({ data }: any) {
  return <Principles data={data} />;
}

function ServicesBlock({ data }: any) {
  // Render the GSAP-backed Services client component. If the block was
  // authored with a custom title/lede/cells we fall back to inline
  // shape that matches Services DOM (so seeded pages survive without
  // re-authoring).
  const cells = data?.cells;
  if (Array.isArray(cells) && cells.length > 0) {
    const title = data?.title || "A studio that draws, specifies, and";
    const titleEm = data?.titleEm || "builds";
    const lede = data?.lede || "";
    return (
      <section className="bg-elev py-24 md:py-36" aria-label="What we do">
        <div className="container-page">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12 md:mb-16">
            <div className="md:col-span-7">
              <h2 className="text-4xl md:text-[3.5rem] tracking-tighter">
                {title}{" "}
                <em className="text-warm not-italic font-medium">{titleEm}</em>
                {data?.afterEm ? `, ${data.afterEm}` : "."}
              </h2>
            </div>
            <div className="md:col-span-5 md:pt-3">
              <p className="text-ink-mute text-base md:text-lg leading-relaxed">
                {lede}
              </p>
            </div>
          </div>
          <ServicesTsxCells cells={cells} />
        </div>
      </section>
    );
  }
  return <Services />;
}

function ServicesTsxCells({ cells }: { cells: any[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || typeof window === "undefined") return;
    let ctx: any = null;
    let cleanup: (() => void) | undefined;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      if (!ref.current) return;
      ctx = gsap.context(() => {
        const cards = gsap.utils.toArray<HTMLElement>(".ei-cap");
        cards.forEach((card, idx) => {
          const photo = card.querySelector(".ei-cap-photo");
          if (photo) {
            gsap.set(photo, { clipPath: "inset(0 0 100% 0)" });
            gsap.to(photo, {
              clipPath: "inset(0 0 0% 0)",
              duration: 1.2,
              delay: idx * 0.08,
              ease: "expo.out",
              scrollTrigger: { trigger: card, start: "top 80%", once: true },
            });
          }
          const text = card.querySelectorAll(".ei-cap-fade");
          if (text.length) {
            gsap.set(text, { y: 16, opacity: 0 });
            gsap.to(text, {
              y: 0,
              opacity: 1,
              duration: 0.7,
              stagger: 0.08,
              delay: 0.25 + idx * 0.05,
              ease: "expo.out",
              scrollTrigger: { trigger: card, start: "top 70%", once: true },
            });
          }
        });
      }, ref);
      cleanup = () => ctx && ctx.revert();
    })();
    return () => cleanup && cleanup();
  }, [reduce]);
  return (
    <div ref={ref as any} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
      {cells.map((c, i) => (
        <article
          key={c.title || i}
          className={`${i % 4 === 0 || i % 4 === 3 ? "md:col-span-7" : "md:col-span-5"} ei-cap group relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/10]`}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="ei-cap-photo absolute inset-0">
              <img
                src={c.photo}
                alt={c.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
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
  );
}

function SelectedWorkBlock({ data }: any) {
  return (
    <SelectedWork slugs={data?.projectSlugs} title={data?.sectionTitle} lede={data?.lede} />
  );
}

function ProcessBlock({ data }: any) {
  return <ProcessStickyStack data={data} />;
}

function TestimonialsBlock({ data }: any) {
  return <Testimonials data={data} />;
}

function JournalPreviewBlock({ data }: any) {
  return (
    <JournalPreview
      title={data?.sectionTitle}
      titleEm={data?.sectionTitleEm}
      lede={data?.lede}
      count={data?.count || 3}
    />
  );
}

function ClosingCTABlock({ data }: any) {
  return <ClosingCTA data={data} />;
}
