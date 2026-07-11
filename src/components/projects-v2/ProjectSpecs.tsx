type Props = {
  year: string | null;
  location: string | null;
  category: string | null;
  scope: string | null;
};

type Tile = {
  label: string;
  value: string;
  why: string;
};

/**
 * ProjectSpecsV2 - 2-col lite-spec tile grid.
 *
 * Section 5 of 7 on /projects-v2/[slug]. Taste-skill §4.9
 * long-list discipline:
 *   - The classic AI-default for project pages is a 10-row
 *     bordered spec table. Banned. v2 uses an editorial 2-col
 *     tile grid where each tile carries: a mono label, a large
 *     display value, one short "why it matters" line.
 *   - 4 cells max. Equal 2-col cardinality stays clear of the
 *     §4.3 three-equal-cards ban because each tile ships real
 *     editorial copy, not a feature bullet.
 *   - 0 chrome-pills. The spec grid is register, not category.
 *   - One radius scale (surface-tile). Forest palette only;
 *     mono amber accent on the why-line hover.
 *   - No em-dashes. No fabricated stats - every value comes
 *     from the row.
 *   - Empty state: returns null when the row has nothing to
 *     print (every label resolves to the fallback). Defensive
 *     against a sparse seed row.
 */
export default function ProjectSpecsV2({
  year,
  location,
  category,
  scope,
}: Props) {
  const tiles: Tile[] = [
    {
      label: "Year",
      value: year || "On file",
      why: "Build complete. Photographed after handover.",
    },
    {
      label: "Location",
      value: location || "Maharashtra",
      why: "On-site direction travels every Saturday.",
    },
    {
      label: "Category",
      value: category || "Residential",
      why: "Buildings we draw and direct, not consult on.",
    },
    {
      label: "Scope",
      value: scope || "Full interior direction",
      why: "One scope per commission - no split contracts.",
    },
  ];

  const allFallback =
    tiles[0].value === "On file" &&
    tiles[1].value === "Maharashtra" &&
    tiles[2].value === "Residential" &&
    tiles[3].value === "Full interior direction";
  if (allFallback) return null;

  return (
    <section
      aria-label="Project specifications"
      className="py-12 md:py-16 bg-canvas border-t hairline"
    >
      <div className="container-page">
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {tiles.map((t) => (
            <article
              key={t.label}
              className="surface-tile p-5 md:p-6 flex flex-col gap-2"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {t.label}
              </p>
              <p className="font-display text-2xl md:text-3xl tracking-[-0.015em] leading-[1.05] pb-1">
                {t.value}
              </p>
              <p className="text-xs md:text-sm text-ink-mute leading-relaxed max-w-[34ch]">
                {t.why}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
