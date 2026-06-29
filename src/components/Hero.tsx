import Image from "next/image";
import Reveal from "./Reveal";

export default function Hero() {
  return (
    <section className="relative pt-24 md:pt-28 pb-16 md:pb-24">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-end">
          <div className="md:col-span-7">
            <Reveal>
              <p className="chrome-pill inline-flex mb-6">
                Residential · Maharashtra
              </p>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="text-[clamp(2.4rem,6vw,5rem)] leading-[1.05] tracking-[-0.025em] pb-1">
                Homes built around{" "}
                <em className="text-accent font-medium italic">
                  how you live
                </em>
                , not how a catalogue looks.
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="mt-6 max-w-[58ch] text-ink-mute text-base md:text-lg leading-relaxed">
                Etihad Interiors is a residential studio in Kalyan. Twenty-four
                weeks. One team. Drawings, materials, and on-site direction from
                the same hands.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <a href="/contact" className="btn-primary">
                  Start a project
                  <span aria-hidden>↗</span>
                </a>
                <a href="/projects" className="btn-ghost">
                  See selected work
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={120} className="md:col-span-5 relative aspect-[4/5] w-full">
            <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-card)]">
              <Image
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1600&auto=format&fit=crop"
                alt="A residential interior in soft natural light"
                fill
                priority
                sizes="(min-width: 768px) 40vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-transparent" />
            </div>

            <div className="absolute -bottom-6 -left-6 hidden md:block">
              <div className="surface-elevated px-5 py-4 max-w-[220px]">
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute">
                  Studio note
                </p>
                <p className="text-sm mt-2 leading-snug">
                  Every project supervised on-site. No remote hand-offs.
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            ["EST.", "2017"],
            ["Residences delivered", "60+"],
            ["Avg. project weeks", "24"],
            ["Studio base", "Kalyan, MH"],
          ].map(([label, value], i) => (
            <Reveal key={label} delay={i * 60}>
              <div className="border-t hairline-strong pt-4">
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute">
                  {label}
                </p>
                <p className="text-2xl md:text-3xl mt-2 tracking-tight">
                  {value}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
