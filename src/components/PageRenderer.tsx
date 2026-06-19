"use client";

import Reveal from "./Reveal";
import Link from "next/link";
import ProcessStickyStack from "./ProcessStickyStack";
import RichTextRenderer from "./RichTextRenderer";
import SpatialWalkthroughs from "./SpatialWalkthroughs";
import SelectedWork from "./SelectedWork";
import Testimonials from "./Testimonials";
import JournalPreview from "./JournalPreview";

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
  const stats = data?.stats || [];
  return (
    <section className="relative pt-24 md:pt-28 pb-16 md:pb-24">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-end">
          <div className="md:col-span-7">
            <Reveal>
              <span className="chrome-pill inline-flex mb-6">{data?.eyebrow}</span>
            </Reveal>
            <Reveal delay={50}>
              <h1 className="text-[clamp(2.4rem,6vw,5rem)] leading-[1] tracking-[-0.025em]">
                {data?.headlinePlain}{" "}
                <em className="text-accent not-italic font-medium">
                  {data?.headlineItalic}
                </em>
                {data?.afterPlain ? `, ${data.afterPlain}` : "."}
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-6 max-w-[58ch] text-ink-mute text-base md:text-lg leading-relaxed">
                {data?.subtext}
              </p>
            </Reveal>
          </div>
          <Reveal delay={120} className="md:col-span-5 relative aspect-[4/5] w-full">
            <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-card)]">
              <img
                src={data?.photoUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-transparent" />
            </div>
            {data?.studioNote && (
              <div className="absolute -bottom-6 -left-6 hidden md:block">
                <div className="surface-elevated px-5 py-4 max-w-[220px]">
                  <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute">
                    Studio note
                  </p>
                  <p className="text-sm mt-2 leading-snug">{data.studioNote}</p>
                </div>
              </div>
            )}
          </Reveal>
        </div>
        {stats.length > 0 && (
          <div className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s: any, i: number) => (
              <div key={i} className="border-t hairline-strong pt-4">
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute">{s.label}</p>
                <p className="text-2xl md:text-3xl mt-2 tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PrinciplesBlock({ data }: any) {
  const items = data?.items || [];
  return (
    <section className="py-20 md:py-28 bg-elev border-y hairline">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          <div className="md:col-span-7">
            <h2 className="text-3xl md:text-5xl tracking-tighter">{data?.title}</h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">{data?.lede}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border hairline rounded-[var(--radius-card)] overflow-hidden">
          {items.map((p: any, i: number) => (
            <div key={i} className="bg-canvas p-6 md:p-7">
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-warm">0{i + 1}</p>
              <h3 className="text-xl md:text-2xl mt-3 mb-3 tracking-tight">{p.label}</h3>
              <p className="text-sm text-ink-mute leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesBlock({ data }: any) {
  const cells = data?.cells || [];
  return (
    <section className="bg-elev py-24 md:py-36">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12 md:mb-16">
          <div className="md:col-span-7">
            <h2 className="text-4xl md:text-[3.5rem] tracking-tighter">
              {data?.title}
              <em className="text-warm not-italic font-medium">{data?.titleEm}</em>
              {data?.afterEm ? `, ${data.afterEm}` : "."}
            </h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute text-base md:text-lg leading-relaxed">{data?.lede}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
          {cells.map((c: any, i: number) => (
            <div
              key={i}
              className={`${i % 4 === 0 || i % 4 === 3 ? "md:col-span-7" : "md:col-span-5"} group relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/10]`}
            >
              <img src={c.photo} alt={c.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-white/70">0{i + 1}</p>
                <h3 className="text-white text-2xl md:text-3xl mt-3 tracking-tight">{c.title}</h3>
                <p className="text-white/80 text-sm md:text-base mt-2 max-w-[40ch]">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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
  return (
    <section className="py-24 md:py-40">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-9">
            <h2 className="text-[clamp(2.4rem,7vw,6rem)] tracking-[-0.03em] leading-[0.95]">
              {data?.text?.split(data?.em || "").map((piece: string, i: number) => (
                <span key={i}>
                  {piece}
                  {i === 0 && data?.em ? (
                    <em className="text-warm not-italic font-medium">{data.em}</em>
                  ) : null}
                </span>
              ))}
            </h2>
          </div>
          <div className="md:col-span-3 md:pt-3 flex md:justify-end">
            <Link href={data?.buttonHref || "/contact"} className="btn-primary w-fit">
              {data?.buttonLabel || "Start a project"} <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
