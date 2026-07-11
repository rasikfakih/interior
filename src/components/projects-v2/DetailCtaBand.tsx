import Link from "next/link";

/**
 * DetailCtaBandV2 - bottom CTA strip on the detail page.
 *
 * Section 8 of 8 on /projects-v2/[slug] (last section).
 * Taste-skill §4.5 / §4.7 discipline:
 *   - Single intent = "contact us." The hero on the listing
 *     page already carried a `Begin a project` CTA. The same
 *     label returns at the foot of the detail page as the
 *     page's bottom CTA. intent-dedupe-reads-as-one (the
 *     audit B1 closure - editorial pages commonly bookend
 *     contact this way).
 *   - 0 chrome-pills (B2 eyeball discipline). The bottom
 *     strip earns its weight through copy + button, not
 *     through another eyebrow.
 *   - h2 carries no terminal period (D2 fix).
 *   - min-h-[40dvh] - intentional restraint. A full 100dvh
 *     closing CTA eats the user's scroll budget. 40dvh is
 *     room enough for the offer and small.
 *   - No em-dashes. ASCII hyphens only.
 */
export default function DetailCtaBandV2() {
  return (
    <section
      aria-label="Begin a project"
      className="min-h-[40dvh] py-16 md:py-24 bg-canvas border-t hairline"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-end">
          <div className="md:col-span-9">
            <h2 className="font-display text-[clamp(2rem,5vw,3.6rem)] tracking-[-0.02em] leading-[1.02] pb-2 max-w-[20ch]">
              When the house is ready, we are too
            </h2>
            <p className="text-ink-mute max-w-[42ch] mt-5 md:mt-7">
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
