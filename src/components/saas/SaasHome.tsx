"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";
import { FEATURES, Pricing } from "@/components/home/HomeV2";
import HorizontalProjects from "@/components/home/HorizontalProjects";
import { IMAGES } from "@/lib/images";
import type { HomePlan, HomeProject } from "@/app/(public)/page";

function SaasHero() {
  return (
    <section className="relative grid min-h-dvh grid-cols-1 md:grid-cols-10 items-end md:items-center overflow-hidden bg-canvas">
      <div className="md:col-span-6 container-page pb-10 md:pb-0 z-10 relative">
        <p className="eyebrow">Studio OS · Kalyan, Maharashtra</p>
        <h1 className="font-hero mt-6 text-[12vw] md:text-[6.5vw] leading-[0.92] tracking-tight">
          The operating system for interior studios.
        </h1>
        <p className="mt-6 max-w-[48ch] font-serif text-lg md:text-xl leading-relaxed text-ink-mute">
          We start at the kitchen table, not the mood board. Leads,
          proposals, boards, BOQ with live material costs, an offline
          site diary, and a client portal - one console from first call
          to handover.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-lg bg-[#C0964F] px-6 py-4 text-sm font-medium text-[#122A20] dark:text-[#122A20] hover:bg-[#D2B06A] transition-colors"
          >
            See the live demo <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--ink)] px-6 py-4 text-sm font-medium text-ink hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
          >
            Open the console
          </Link>
        </div>
      </div>

      <div className="md:col-span-4 h-[46dvh] md:h-full relative overflow-hidden md:border-l border-[var(--line-soft)]">
        <Image
          src={IMAGES.living}
          alt="A living room finished by a studio running Studio OS"
          fill
          priority
          fetchPriority="high"
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#122A20]/10" />
        <div className="absolute bottom-5 left-5 space-y-2">
          <div className="paper-card px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">2BHK · BOQ v2</p>
            <p className="font-mono text-sm text-ink mt-1">Rs 18,45,320 live</p>
          </div>
          <div className="paper-card px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">Site diary</p>
            <p className="font-mono text-sm text-ink mt-1">Synced offline · 12 logs</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SaasStats() {
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
            <span className="font-mono text-4xl md:text-5xl tracking-tight text-accent-deep">{s.value}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SaasHome({
  projects,
  plans,
}: {
  projects: HomeProject[];
  plans: HomePlan[];
}) {
  return (
    <>
      <SaasHero />
      <SaasStats />

      <section id="features" className="bg-[var(--paper-soft)]">
        <div className="container-page py-20 md:py-28">
          <p className="eyebrow">What is inside</p>
          <h2 className="font-hero mt-3 text-4xl md:text-6xl tracking-tight">
            One console for the whole job.
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="paper-card p-6 group hover:border-[var(--accent)]/60 transition-colors">
                <f.icon size={22} weight="duotone" className="text-[var(--amber)]" aria-hidden />
                <h3 className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-mute">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {projects.length > 0 && (
        <section className="bg-canvas">
          <div className="container-page pt-16 md:pt-24">
            <p className="eyebrow">See it live</p>
            <h2 className="font-hero mt-3 text-4xl md:text-6xl tracking-tight">
              A real studio, running on Studio OS.
            </h2>
            <p className="mt-4 max-w-[56ch] font-serif text-lg leading-relaxed text-ink-mute">
              Etihad Interiors is a live tenant: the boards are drag-built,
              the BOQ pulls live material rates, and the site diary logs
              are real. This is the system, not a mockup.
            </p>
          </div>
          <HorizontalProjects projects={projects} />
        </section>
      )}

      <div id="pricing">
        <Pricing plans={plans} />
      </div>

      <section className="bg-[#122A20] text-[#ECECE6]">
        <div className="container-page py-24 md:py-36 text-center">
          <p className="eyebrow !text-[#D6CBB3]">The studio OS</p>
          <h2 className="font-hero mx-auto mt-5 max-w-[16ch] text-5xl md:text-[5rem] leading-[0.95] tracking-tight">
            Start with one project, stay for the system.
          </h2>
          <Link
            href="/admin"
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-[#C0964F] px-8 py-4 text-sm font-medium text-[#122A20] dark:text-[#122A20] hover:bg-[#D2B06A] transition-colors"
          >
            Open the console <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-[#D6CBB3]">
            Free plan, one project, no card
          </p>
        </div>
      </section>
    </>
  );
}
