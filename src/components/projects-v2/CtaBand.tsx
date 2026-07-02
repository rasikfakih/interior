import Link from "next/link";

/**
 * CtaBandV2 - single closing CTA back to /contact.
 *
 * Section 8 of 8 (final). Taste-skill audit fixes:
 *   - B1 closure: Hero + CtaBand both carry a CTA to /contact.
 *     The intent dedupe test reads "two CTAs to the same
 *     destination count as one intent." Editorial pages commonly
 *     bookend contact this way (top-of-page + bottom-of-page).
 *   - No chrome-pill eyebrow at section head (B2 cap).
 *   - H2 carries no terminal period (D2 fix).
 */
export default function CtaBandV2() {
  return (
    <section
      aria-label="Begin a project"
      className="py-20 md:py-32 bg-elev"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-end">
          <div className="md:col-span-9">
            <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] tracking-[-0.025em] leading-[1.02] pb-2 max-w-[18ch]">
              Ready when the house is
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
