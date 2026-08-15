"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Kanban,
  LinkSimple,
  Cube,
  FrameCorners,
  Calculator,
  HardDrives,
  ArrowRight,
} from "@phosphor-icons/react";
import type { HomePlan, HomeProject } from "@/app/(public)/page";
import { useReducedMotion } from "@/lib/use-gsap";
import { IMAGES } from "@/lib/images";
import HorizontalProjects from "./HorizontalProjects";

export const FEATURES: { icon: typeof Kanban; title: string; body: string }[] = [
  {
    icon: Kanban,
    title: "Lead inbox",
    body: "Six statuses from new to won, drag anywhere on the funnel. Every move stamped with a timestamp you can audit.",
  },
  {
    icon: LinkSimple,
    title: "Proposal link",
    body: "One token link per proposal. View counts, accept flow, boards and BOQ totals inside the link itself.",
  },
  {
    icon: Cube,
    title: "Material library",
    body: "Vendors, categories, live cost per unit. The BOQ pulls from here, so a rate change flows everywhere.",
  },
  {
    icon: FrameCorners,
    title: "Board canvas",
    body: "Drag materials onto a freeform moodboard. Resize, rotate, layer, then approve it from the client portal.",
  },
  {
    icon: Calculator,
    title: "BOQ engine",
    body: "Indian bill of quantities with GST, wastage, and labour rates. Versioned per engagement, totals always live.",
  },
  {
    icon: HardDrives,
    title: "Site diary PWA",
    body: "Offline-first daily logs with photos and voice notes. Snags tracked open, fixed, verified from the site.",
  },
];

function useMagnetic<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
    };
    const leave = () => {
      el.style.transform = "translate(0, 0)";
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);
  return ref;
}

function Hero() {
  const scope = useRef<HTMLDivElement>(null);
  const imageWrap = useRef<HTMLDivElement>(null);
  const ctaRef = useMagnetic<HTMLAnchorElement>();
  const reduce = useReducedMotion();

  // Clip-path reveal on load + image scale on scroll, plain GSAP.
  useEffect(() => {
    if (reduce) return;
    let cleanup: (() => void) | undefined;
    import("gsap").then(({ gsap }) => {
      const lines = scope.current?.querySelectorAll("[data-reveal-line]");
      if (lines && lines.length) {
        // Defer the reveal until after first paint (LCP window): the clip
        // path + transform work would otherwise share the main thread with
        // the hero image's first render on slow devices.
        gsap.set(lines, { clipPath: "inset(0 0 100% 0)", yPercent: 40 });
        gsap.to(lines, {
          clipPath: "inset(0 0 0% 0)",
          yPercent: 0,
          duration: 1.2,
          ease: "power4.out",
          stagger: 0.12,
          delay: 0.8,
        });
      }
      const img = imageWrap.current?.querySelector("img");
      if (img) {
        const tween = gsap.to(img, {
          scale: 1.1,
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
        cleanup = () => tween.scrollTrigger?.kill();
      }
    });
    return () => cleanup?.();
  }, [reduce]);

  return (
    <section ref={scope} className="relative grid min-h-dvh grid-cols-1 md:grid-cols-10 items-end md:items-center overflow-hidden">
      <div className="md:col-span-6 container-page pb-10 md:pb-0 z-10 relative">
        <p className="eyebrow" data-reveal-line>
          Studio OS for interior designers - Kalyan, Maharashtra
        </p>
        <h1 className="font-hero mt-6 text-[13vw] md:text-[7.5vw] leading-[0.92] tracking-tight">
          <span data-reveal-line className="block">Homes built</span>
          <span data-reveal-line className="block">around how</span>
          <span data-reveal-line className="block">you live.</span>
        </h1>
        <p data-reveal-line className="mt-6 max-w-[44ch] font-serif text-lg md:text-xl leading-relaxed text-ink-mute">
          We start at the kitchen table, not the mood board. Every material,
          every bill, every site photo in one place.
        </p>
        <div data-reveal-line className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            ref={ctaRef}
            href="/demo/work"
            className="inline-flex items-center gap-2 rounded-lg bg-[#C0964F] px-6 py-4 text-sm font-medium text-ink dark:text-[#122A20] transition-transform duration-200 will-change-transform"
          >
            See live demo <ArrowRight size={16} weight="bold" />
          </Link>
          <Link
            href="/demo/work"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--ink)] px-6 py-4 text-sm font-medium text-ink hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          >
            Explore boards
          </Link>
        </div>
      </div>

      <div
        ref={imageWrap}
        className="md:col-span-4 h-[46dvh] md:h-full relative overflow-hidden md:border-l border-[var(--line-soft)]"
      >
        <Image
          src={IMAGES.living}
          alt="A living room finished by the studio"
          fill
          priority
          fetchPriority="high"
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#122A20]/10" />
        <div className="absolute bottom-5 left-5 paper-card px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">2BHK · BOQ v1</p>
          <p className="font-mono text-sm text-ink mt-1">Rs 18,45,320 live</p>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats: { value: string; label: string }[] = [
    { value: "1", label: "project free" },
    { value: "25", label: "leads" },
    { value: "20", label: "AI credits" },
    { value: "100%", label: "offline diary" },
  ];
  return (
    <section className="border-y border-[var(--line-soft)] bg-[var(--paper-soft)]">
      <div className="container-page grid grid-cols-2 md:grid-cols-4 gap-y-8 py-10 md:py-12">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            {/* Accent text role via the AA token (light #735a2f, dark
                #e0c686): bright amber is decorative only. */}
            <span className="font-mono text-4xl md:text-5xl tracking-tight text-accent-deep">{s.value}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section className="paper-grain bg-canvas">
      <div className="container-page grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 py-20 md:py-32">
        <div className="md:sticky md:top-28 self-start">
          <p className="eyebrow">The system</p>
          <h2 className="font-hero mt-4 text-4xl md:text-[4.5rem] leading-[0.95] tracking-tight text-ink">
            Excel is where good studios go to die.
          </h2>
        </div>
        <div className="space-y-6 font-serif text-lg md:text-xl leading-relaxed text-ink max-w-[52ch]">
          <p>
            The interior trade runs on scattered WhatsApp messages, eleven
            versions of a rates sheet, and a memory of what was approved last
            Tuesday. The BOQ is built by hand every single time.
          </p>
          <p>
            This system keeps the bill of quantities live against the material
            library, so a rate change in one place flows to every project.
            The site diary works offline, because sites do not have wifi.
            The client portal shows boards and budgets without a login, and
            records every approval.
          </p>
          <p>
            One project on the free plan is enough to feel the difference.
            Twenty-five leads, two boards, one BOQ version, twenty AI
            generations a month.
          </p>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="bg-[var(--paper-soft)]">
      <div className="container-page py-20 md:py-28">
        <p className="eyebrow">What is inside</p>
        <h2 className="font-hero mt-3 text-4xl md:text-6xl tracking-tight text-ink">
          One console for the whole job.
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="paper-card p-6 group hover:border-[#C0964F]/60 transition-colors">
              <f.icon size={22} weight="duotone" className="text-[var(--amber)]" />
              <h3 className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-mute">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing({ plans }: { plans: HomePlan[] }) {
  const [inr, setInr] = useState(true);
  const fallback: HomePlan[] = [
    { id: "free", name: "Free", priceUsd: 0, priceInr: 0, projectLimit: 1, leadLimit: 25, boardLimit: 2, boqVersionLimit: 1, aiCreditsLimit: 20, features: { white_label: false } },
    { id: "starter", name: "Starter", priceUsd: 29, priceInr: 2499, projectLimit: 3, leadLimit: 200, boardLimit: 10, boqVersionLimit: 5, aiCreditsLimit: 100, features: {} },
    { id: "pro", name: "Pro", priceUsd: 99, priceInr: 8499, projectLimit: 15, leadLimit: 1000, boardLimit: 50, boqVersionLimit: 20, aiCreditsLimit: 500, features: { white_label: true } },
    { id: "studio", name: "Studio", priceUsd: 249, priceInr: 19999, projectLimit: -1, leadLimit: -1, boardLimit: -1, boqVersionLimit: -1, aiCreditsLimit: 2000, features: { white_label: true, custom_domain: true } },
  ];
  const list = plans.length > 0 ? plans : fallback;

  const lim = (n: number) => (n === -1 ? "Unlimited" : String(n));

  return (
    <section className="bg-canvas">
      <div className="container-page py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Pricing</p>
            <h2 className="font-hero mt-3 text-4xl md:text-6xl tracking-tight text-ink">
              Start free, scale when the jobs land.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">Show</span>
            {(["INR", "USD"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setInr(c === "INR")}
                className={`rounded-lg border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                  inr === (c === "INR")
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-accent-deep"
                    : "border-[var(--clay)] text-ink-mute hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {list.map((p) => (
            <div key={p.id} className="paper-card p-6 flex flex-col">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{p.name}</p>
              <p className="font-mono text-3xl text-ink mt-3">
                {inr ? `Rs ${p.priceInr.toLocaleString("en-IN")}` : `$${p.priceUsd}`}
                <span className="text-xs text-ink-mute"> / mo</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-ink-mute">
                <li className="flex justify-between"><span>Projects</span><span className="font-mono text-ink">{lim(p.projectLimit)}</span></li>
                <li className="flex justify-between"><span>Leads</span><span className="font-mono text-ink">{lim(p.leadLimit)}</span></li>
                <li className="flex justify-between"><span>Boards</span><span className="font-mono text-ink">{lim(p.boardLimit)}</span></li>
                <li className="flex justify-between"><span>AI credits</span><span className="font-mono text-ink">{lim(p.aiCreditsLimit)}</span></li>
              </ul>
              <div className="mt-5 flex-1" />
              <Link
                href="/admin/billing"
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[10px] font-mono uppercase tracking-[0.16em] transition-colors ${
                  p.id === "free"
                    ? "border border-[var(--ink)] text-ink hover:bg-[var(--ink)] hover:text-[var(--paper)]"
                    : "bg-[var(--ink)] text-[var(--paper)] hover:opacity-90"
                }`}
              >
                {p.id === "free" ? "Start free" : "Upgrade"} <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-[#122A20] text-[#ECECE6]">
      <div className="container-page py-24 md:py-36 text-center">
        <p className="eyebrow !text-[#D6CBB3]">The studio OS</p>
        <h2 className="font-hero mx-auto mt-5 max-w-[16ch] text-5xl md:text-[5rem] leading-[0.95] tracking-tight">
          Start with one project, stay for the system.
        </h2>
        <Link
          href="/admin"
          className="mt-10 inline-flex items-center gap-2 rounded-lg bg-[#C0964F] px-8 py-4 text-sm font-medium text-ink dark:text-[#122A20] hover:bg-[#D2B06A] transition-colors"
        >
          Open the console <ArrowRight size={16} weight="bold" />
        </Link>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-[#D6CBB3]">
          Free plan, one project, no card
        </p>
      </div>
    </section>
  );
}

export default function HomeV2({ projects, plans }: { projects: HomeProject[]; plans: HomePlan[] }) {
  return (
    <>
      <Hero />
      <StatsBar />
      <HorizontalProjects projects={projects} />
      <Manifesto />
      <Features />
      <Pricing plans={plans} />
      <FinalCta />
    </>
  );
}
