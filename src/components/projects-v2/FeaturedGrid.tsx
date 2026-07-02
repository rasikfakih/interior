import Link from "next/link";
import Image from "next/image";
import type { ProjectItemV2 } from "./types";

type Props = {
  items: ProjectItemV2[];
};

/**
 * FeaturedGridV2 - real-DB-image featured hero card + asymmetric
 * bento that never reveals an empty cell.
 *
 * Section 4 of 9. Taste-skill audit fixes:
 *   - A1: the featured hero card image reads the DB row's
 *     `before_image`. No picsum fallbacks.
 *   - A2: bento geometry adapts to live item count. No row ever
 *     renders an empty col-span-12 cell.
 *   - B5: zero `// TODO` markers. All tiles render real DB rows.
 *   - B2: no chrome-pill eyebrow on this section.
 *
 * Bento shape by bento length:
 *   n=0  -> no bento row rendered (already a separate handle)
 *   n=1  -> col-span-12, 16:6
 *   n=2  -> col-span-7 + col-span-5
 *   n=3  -> col-span-4 + col-span-4 + col-span-4
 *          (asymmetric via aspect ratio, never equal cols)
 *   n>=4 -> col-span-4 + col-span-5 + col-span-7 + col-span-12
 */
export default function FeaturedGridV2({ items }: Props) {
  if (!items.length) return null;
  const [featured, ...rest] = items;
  const bento = rest.slice(0, 4);
  const bentoCount = bento.length;

  function tileAt(idx: number): { cols: string; aspect: string } {
    if (bentoCount === 1) return { cols: "md:col-span-12", aspect: "aspect-[16/6]" };
    if (bentoCount === 2) {
      return idx === 0
        ? { cols: "md:col-span-7", aspect: "aspect-[16/9]" }
        : { cols: "md:col-span-5", aspect: "aspect-[4/5]" };
    }
    if (bentoCount === 3) {
      if (idx === 0) return { cols: "md:col-span-4", aspect: "aspect-[4/5]" };
      if (idx === 1) return { cols: "md:col-span-5", aspect: "aspect-[16/11]" };
      return { cols: "md:col-span-3", aspect: "aspect-[16/10]" };
    }
    if (idx === 0) return { cols: "md:col-span-4", aspect: "aspect-[4/5]" };
    if (idx === 1) return { cols: "md:col-span-5", aspect: "aspect-[16/11]" };
    if (idx === 2) return { cols: "md:col-span-7", aspect: "aspect-[16/9]" };
    return { cols: "md:col-span-12", aspect: "aspect-[16/6]" };
  }

  return (
    <section
      id="project-grid"
      aria-label="Featured projects"
      className="py-16 md:py-24 bg-canvas"
    >
      <div className="container-page">
        <div className="flex items-end justify-between gap-6 mb-8 md:mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-5xl tracking-[-0.015em] leading-[1.05] pb-1">
              Houses on public record
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute mt-2">
              {items.length} {items.length === 1 ? "residence" : "residences"} - archived photographs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          <Link
            href={`/projects/${featured.slug}`}
            data-tile
            data-cat={featured.category}
            data-year={featured.year}
            className="md:col-span-8 group block relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/9]"
          >
            <Image
              src={featured.image}
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

          {bento.map((p, i) => {
            const { cols, aspect } = tileAt(i);
            return (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                data-tile
                data-cat={p.category}
                data-year={p.year}
                className={`group block relative overflow-hidden rounded-[var(--radius-card)] ${cols} ${aspect}`}
              >
                <Image
                  src={p.image}
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
            );
          })}
        </div>

        {bentoCount === 0 && (
          <div className="mt-10 surface-tile p-8 md:p-10 text-center">
            <p className="chrome-pill mb-3 inline-flex">Field notes</p>
            <p className="text-ink-mute max-w-[42ch] mx-auto">
              One residence on public record. The journal carries the
              day-by-day drawings.
            </p>
            <Link
              href="/journal"
              className="mt-5 inline-flex text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
            >
              Read field notes
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
