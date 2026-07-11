import Link from "next/link";
import Image from "next/image";

type RelatedItem = {
  slug: string;
  title: string;
  category: string;
  location: string;
  year: string;
  scope: string;
  image: string;
};

type Props = {
  items: RelatedItem[];
};

const FALLBACK =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop";

/**
 * ProjectRelatedV2 - conditional related-projects bento.
 *
 * Section 7 of 7 on /projects-v2/[slug] (only renders when
 * at least 3 sibling rows exist in the same category).
 * Taste-skill §4.7 discipline:
 *   - Gated on n >= 3. When fewer siblings exist the whole
 *     section is omitted to prevent an empty-col-span-12
 *     cell violation. This is the same shape FeaturedGridV2
 *     uses upstream on the listing page.
 *   - 3-col bento (col-span-4 each) so the section is the
 *     closing teaser before the bottom CTA strip.
 *   - Real DB-image URL per tile (the row's before_image).
 *   - 0 chrome-pills. The eyebrow budget was already spent
 *     on From-the-homeowner.
 *   - No em-dashes. ASCII hyphens only.
 */
export default function ProjectRelatedV2({ items }: Props) {
  if (items.length < 3) return null;
  const limited = items.slice(0, 3);
  return (
    <section
      aria-label="Related projects"
      className="py-16 md:py-24 bg-canvas border-t hairline"
    >
      <div className="container-page">
        <div className="flex items-end justify-between gap-6 mb-8 md:mb-10">
          <div>
            <h2 className="font-display text-2xl md:text-4xl tracking-[-0.015em] leading-[1.05] pb-1 max-w-[22ch]">
              Other commissions in this register
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mt-3">
              Three projects - same category - architects drawings kept
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {limited.map((tile, i) => {
            const aspect =
              i === 0
                ? "aspect-[4/5]"
                : i === 1
                  ? "aspect-[4/5]"
                  : "aspect-[4/5]";
            return (
              <Link
                key={tile.slug}
                href={`/projects-v2/${tile.slug}`}
                className="group block"
              >
                <div
                  className={`relative overflow-hidden rounded-[var(--radius-card)] ${aspect}`}
                >
                  <Image
                    src={tile.image || FALLBACK}
                    alt={tile.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <h3 className="mt-4 font-display text-xl md:text-2xl tracking-[-0.015em] leading-[1.1]">
                  {tile.title}
                </h3>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  {tile.location} - {tile.scope}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
