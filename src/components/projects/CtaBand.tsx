import Link from "next/link";

/**
 * CtaBand - single closing CTA back to /contact.
 *
 * Section 9 of 9 (final). Taste-skill audit:
 *   - One CTA intent on the page. No duplicate "Get in touch"
 *     vs "Let's talk" pattern (Section 9.F ban).
 *   - Carries the second eyebrow of the page (FAQ + Cta = 2 of
 *     9 sections with chrome-pill, within 1-per-3 cap).
 *   - Hero-equivalent layout: minimal type, no logotype,
 *     contact CTA only.
 */
export default function CtaBand() {
  return (
    <section
      aria-label="Begin a project"
      className="py-20 md:py-32 bg-elev"
    >
      <div className="container-page">
        <p className="chrome-pill mb-6 inline-flex">Tail end</p>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-end">
          <div className="md:col-span-9">
            <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] tracking-[-0.025em] leading-[1.02] pb-2 max-w-[18ch]">
              Ready when the house is.
            </h2>
            <p className="text-ink-mute max-w-[42ch] mt-6 md:mt-8">
              Six to nine months on the queue. Drawings first, materials
              second, build third. We do not run more than one build at
              a time.
            </p>
          </div>
          <div className="md:col-span-3 flex md:justify-end">
            <Link href="/contact" className="btn-primary">
              Begin a project
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
