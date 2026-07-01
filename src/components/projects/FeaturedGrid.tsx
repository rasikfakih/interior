import Link from "next/link";
import Image from "next/image";
import type { ProjectItem } from "./types";

type Props = {
  items: ProjectItem[];
};

/**
 * FeaturedGrid - featured hero card + 4-cell asymmetric bento.
 *
 * Section 4 of 9. Taste-skill audit:
 *   - NO 3-column equal feature cards (Section 9.C ban). Hero
 *     featured card spans 8/12 cols on desktop and the bento
 *     rest is 2/3/3/4 asymmetric spread (never equal columns).
 *   - Real images via picsum.photos fallbacks with descriptive
 *     slug seeds so admins can swap to real photography later.
 *   - data-tile / data-cat / data-year attributes are wired so
 *     the ProjectFilters pill row above can toggle a CSS hide
 *     without re-rendering the array.
 */
export default function FeaturedGrid({ items }: Props) {
  if (!items.length) return null;
  const [featured, ...rest] = items;
  const bento = rest.slice(0, 4);

  return (
    <section
      id="project-grid"
      aria-label="Featured projects"
      className="py-16 md:py-24 bg-canvas"
    >
      <div className="container-page">
        <div className="flex items-end justify-between gap-6 mb-8 md:mb-12">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
              Featured work
            </p>
            <h2 className="font-display text-3xl md:text-5xl tracking-[-0.015em] leading-[1.05] pb-1">
              The houses on public record.
            </h2>
          </div>
          <Link
            href="/contact"
            className="hidden md:inline-flex text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
          >
            Commission yours
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          <Link
            href={`/projects/${featured.slug}`}
            data-tile
            data-cat={featured.category}
            data-year={featured.year}
            className="md:col-span-8 group block relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/9]"
          >
            {/* TODO: real asset path slug=featured-hero */}
            <Image
              src={`https://picsum.photos/seed/featured-${featured.slug}/1600/900`}
              alt={featured.title}
              fill
              sizes="(min-width: 768px) 66vw, 100vw"
              priority
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/0 to-ink/0" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-bg">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-80 mb-3">
                {featured.category} - {featured.year}
              </p>
              <h3 className="font-display text-3xl md:text-5xl tracking-[-0.015em] leading-[1.05] pb-1">
                {featured.title}
              </h3>
              <p className="text-sm md:text-base opacity-80 max-w-[42ch] mt-3">
                {featured.scope}. {featured.location}.
              </p>
            </div>
          </Link>

          {bento.map((p, i) => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              data-tile
              data-cat={p.category}
              data-year={p.year}
              className={`group block relative overflow-hidden rounded-[var(--radius-card)] ${
                i === 0
                  ? "md:col-span-4 aspect-[4/5]"
                  : i === 1
                    ? "md:col-span-5 aspect-[16/11]"
                    : i === 2
                      ? "md:col-span-7 aspect-[16/9]"
                      : "md:col-span-12 aspect-[16/6]"
              }`}
            >
              {/* TODO: real asset path slug=featured-bento */}
              <Image
                src={`https://picsum.photos/seed/bento-${p.slug}/1200/800`}
                alt={p.title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-ink/0 to-ink/0" />
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 text-bg">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-80 mb-1">
                  {p.category} - {p.year}
                </p>
                <h3 className="font-display text-xl md:text-2xl tracking-[-0.015em] leading-[1.05]">
                  {p.title}
                </h3>
              </div>
            </Link>
          ))}

          {items.length > 5 && (
            <Link
              href="/journal"
              className="md:col-span-12 group flex items-center justify-between gap-4 p-6 md:p-8 border hairline rounded-[var(--radius-card)] hover:bg-canvas transition-colors"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-1">
                  On the bench
                </p>
                <p className="font-display text-xl md:text-2xl tracking-[-0.015em]">
                  {items.length - 5} more residences in the journal
                </p>
              </div>
              <span className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1">
                Read field notes
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
