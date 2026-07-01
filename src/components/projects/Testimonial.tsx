/**
 * Testimonial - editorial pull-quote.
 *
 * Section 5 of 9. Taste-skill audit:
 *   - Quote line-length capped at 3 lines.
 *   - Attribution via plain hyphen with spaces, never em-dash.
 *   - Real italic weight draws the eye toward the quote, never
 *     a marketing copy phrase like "Quietly in use at".
 *   - Sits on bg-elev above the project fields below for
 *     editorial break, not on bg-canvas.
 */
export default function ProjectsTestimonial() {
  return (
    <section
      aria-label="Client voice"
      className="py-16 md:py-28 bg-elev"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              From the homeowner
            </p>
          </div>
          <blockquote className="md:col-span-10">
            <p className="font-display text-2xl md:text-4xl lg:text-5xl tracking-[-0.015em] leading-[1.1] pb-4 max-w-[28ch]">
              Twenty-four weeks. The drawings turned up on the same
              days the materials did. We knew the kitchen bench was
              oak before the scaffolding left the gate.
            </p>
            <footer className="mt-6 md:mt-8 flex items-center gap-4">
              <span
                className="block h-px w-12 bg-ink"
                aria-hidden="true"
              />
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
                Homeowner - 2024 commission
              </p>
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
