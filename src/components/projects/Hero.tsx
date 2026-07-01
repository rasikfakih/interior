import Link from "next/link";
import { getStudioBrand } from "@/lib/studio-brand";

type Props = {
  count: number;
};

/**
 * Hero - 7/5 asymmetric split.
 *
 * Section 1 of 9. Taste-skill audit:
 *   - Headline 2 lines max at desktop, subtext <= 20 words.
 *   - No trust strip in hero.
 *   - No eyebrow (chrome-pill reserved for 2 sections across 9 - FAQ + CTA).
 *   - min-h-[100dvh] never h-screen.
 *   - Top padding max pt-24 at desktop.
 *   - No em-dashes.
 */
export default function ProjectsHero({ count }: Props) {
  const brand = getStudioBrand();

  return (
    <section
      aria-label="Projects hero"
      className="relative pt-24 md:pt-28 pb-12 md:pb-20 min-h-[100dvh] flex items-center bg-canvas"
    >
      <div className="container-page w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
          <div className="md:col-span-7">
            <h1 className="font-display text-[clamp(2.4rem,6vw,5rem)] tracking-[-0.025em] leading-[0.98] pb-1">
              Homes drawn, built, and lived in.
            </h1>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute text-base md:text-lg leading-relaxed max-w-[42ch]">
              {count} residences on public record. Drawings archived,
              photographs kept. No full client list published.
            </p>
            <p className="mt-6 text-ink-mute text-sm font-mono uppercase tracking-[0.18em]">
              {brand.studio_address}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-primary">
                Begin a project
              </Link>
              <Link href="#project-grid" className="btn-ghost">
                View archive
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
