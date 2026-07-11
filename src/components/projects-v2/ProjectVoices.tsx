import { ensureMigrated, pgMany } from "@/lib/pg";

type Row = {
  id: number;
  name: string;
  role: string | null;
  quote: string;
};

type Props = {
  slug: string;
};

/**
 * ProjectVoicesV2 - DB-backed homeowner quote on the detail page.
 *
 * Section 6 of 7 on /projects-v2/[slug]. Single eyebrow
 * allowance on the entire page is spent here ("From the
 * homeowner"). Taste-skill discipline:
 *   - The eyebrow is a real chrome-pill (mono, 10px, 0.22em
 *     tracking, hairline-strong); identical shape to the rest
 *     of the studio chrome.
 *   - Quote body uses Cormorant display with line-clamp-6
 *     so excessive testimonial copy neverballoons past six
 *     rows. The skill caps quote at "3 lines lean, 6 lines
 *     saturated" (§4.10). The clamp happens at CSS level so
 *     JS-side data shaping is not required.
 *   - Attribution via ASCII hyphen with spaces (no em-dash,
 *     §9.G ban). When role is null the fallback omits it.
 *   - Empty state: returns null. The v1 detail page hits
 *     this codepath on every slug in production because
 *     testimonial rows are not bound to project IDs in the
 *     data model - null is the honest render.
 *   - Server component. Direct pg read. No /api roundtrip.
 *   - Match-by-slug-prefix so the same quote carries across
 *     similar projects (e.g. "casa-mira" surfaces the "casa-"
 *     testimonial row when the DB carries one).
 */
export default async function ProjectVoicesV2({ slug }: Props) {
  let rows: Row[] = [];
  try {
    await ensureMigrated();
    const prefix = slug.split("-")[0];
    rows = await pgMany<Row>(
      `SELECT id, name, role, quote
       FROM testimonials
       WHERE is_published = TRUE
            AND role ILIKE $1
       ORDER BY id ASC
       LIMIT 3`,
      [`%${prefix}%`]
    );
  } catch {
    rows = [];
  }
  if (rows.length === 0) return null;

  return (
    <section
      aria-label="From the homeowner"
      className="py-16 md:py-24 bg-elev"
    >
      <div className="container-page">
        <p className="chrome-pill mb-4 inline-flex">From the homeowner</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mt-2">
          {rows.map((q) => (
            <figure
              key={q.id}
              className="surface-tile p-6 md:p-7 flex flex-col gap-4"
            >
              <blockquote className="font-display text-xl md:text-2xl tracking-[-0.015em] leading-[1.2] pb-2 line-clamp-6 max-w-[40ch]">
                &ldquo;{q.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-auto pt-4 border-t hairline flex items-center gap-3">
                <span aria-hidden className="block h-px w-10 bg-ink" />
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
                  {q.role
                    ? `${q.name} - ${q.role}`
                    : q.name}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
