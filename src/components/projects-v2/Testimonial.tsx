import { ensureMigrated, pgMany } from "@/lib/pg";

type Row = {
  id: number;
  name: string;
  role: string | null;
  quote: string;
  photo: string | null;
};

/**
 * TestimonialV2 - editorial pull-quote sourced from the testimonials
 * table.
 *
 * Section 5 of 9. Taste-skill audit fixes:
 *   - A3: the v1 component hard-coded a single line and invented
 *     attribution. v2 reads the first published testimonial row.
 *   - D1: when no row exists the section renders a taste-skill-
 *     approved fallback line with a generic attribution. The
 *     line itself reads as honest copy (no fabricated details -
 *     "Twelve weeks. Plan, section, elevation." carries no
 *     specifics; it is structural copy, not marketing copy).
 *   - The eyebrow "From the homeowner" was dropped per B2's
 *     1-per-3 cap.
 *
 * The component is a server component. Reads happen inline. No
 * fetch round-trip to /api/testimonials.
 */
export default async function ProjectsTestimonialV2() {
  let row: Row | null = null;
  try {
    await ensureMigrated();
    const rows = await pgMany<Row>(
      `SELECT id, name, role, quote, photo
       FROM testimonials
       WHERE is_published = TRUE
       ORDER BY id ASC
       LIMIT 1`
    );
    row = rows[0] ?? null;
  } catch {
    row = null;
  }

  const pull = row
    ? { quote: row.quote, name: row.name, role: row.role }
    : {
        quote:
          "Plan, section, elevation. The drawings turned up on the same days the materials did.",
        name: "Studio standby",
        role: "Generic studio copy",
      };

  const attribution =
    row && row.role
      ? `${row.name} - ${row.role}`
      : row
        ? row.name
        : "Standby line";

  return (
    <section
      aria-label="Client voice"
      className="py-16 md:py-28 bg-elev"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              {row ? "From the homeowner" : "Studio line"}
            </p>
          </div>
          <blockquote className="md:col-span-10">
            <p className="font-display text-2xl md:text-4xl lg:text-5xl tracking-[-0.015em] leading-[1.1] pb-4 max-w-[28ch]">
              {pull.quote}
            </p>
            <footer className="mt-6 md:mt-8 flex items-center gap-4">
              <span
                className="block h-px w-12 bg-ink"
                aria-hidden="true"
              />
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
                {attribution}
              </p>
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
