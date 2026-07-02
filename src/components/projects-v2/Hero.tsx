import Link from "next/link";

type Props = {
  count: number;
};

/**
 * ProjectsV2Hero - 7/5 asymmetric split, single primary CTA.
 *
 * Section 1 of 9. Taste-skill discipline:
 *   - Headline 2 lines max at desktop (clamp caps at 5rem).
 *   - Subtext under 20 words.
 *   - Single primary CTA (Begin a project -> /contact). The audit
 *     flagged the v1 hero for carrying a second "View archive"
 *     CTA that duplicated intent with CtaBand (B1).
 *   - No eyebrow.
 *   - Low-count state (<5 rows) drops to min-h-[85dvh] so a
 *     sparse studio does not render the hero as a giant
 *     whitespace footer (B7).
 *   - Address line moved out - the page footer band carries it.
 *     The v1 hero printed brand.studio_address twice across the
 *     page (D3).
 *   - No em-dashes.
 */
export default function ProjectsHeroV2({ count }: Props) {
  const subject =
    count === 0
      ? "Nothing on public record yet"
      : count === 1
        ? "One residence on public record"
        : `${count} residences on public record`;

  const minHeightClass = count < 5 ? "min-h-[85dvh]" : "min-h-[100dvh]";

  return (
    <section
      aria-label="Projects hero"
      className={`relative pt-24 md:pt-28 pb-12 md:pb-20 ${minHeightClass} flex items-center bg-canvas`}
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
              {subject}. Drawings archived, photographs kept. No full
              client list published.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="btn-primary">
                Begin a project
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
