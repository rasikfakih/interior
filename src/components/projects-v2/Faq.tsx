"use client";

import { useState } from "react";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How far ahead should I book?",
    a: "Six to nine months. The studio runs one full build at a time and one parallel commission. Lead time is by queue, not by urgency.",
  },
  {
    q: "Do you take projects outside Maharashtra?",
    a: "Selectively. We commit to on-site direction every Saturday, so distance is a constraint. Goa and Bengaluru commissions have shipped; Hyderabad and Surat are on the bench.",
  },
  {
    q: "Is the studio child-and-pet-safe in approach?",
    a: "Materials are pre-screened for VOC, off-gassing, and edge profiles. The 2024 commission in the pull-quote shipped with two cats and a toddler.",
  },
  {
    q: "What does the first month cover?",
    a: "Sketch set, materials mood-board, budget envelope, and a hand-written scope. No CAD until drawings align. We sign the scope before invoicing 10 percent.",
  },
  {
    q: "Can I keep my contractor?",
    a: "Yes, as long as your contractor is willing to work to our drawings and materials spec. We have a shortlist if you would rather not.",
  },
];

/**
 * FaqV2 - sparse-divider accordion.
 *
 * Section 7 of 8. Taste-skill discipline:
 *   - One border-bottom between rows (Section 9.F rule).
 *   - No chrome-pill eyebrow at section head. v1 carried one -
 *     v2 drops it. FAQ titles already do the work.
 *   - H2 carries no terminal period (audit D2 fix).
 *   - Detail uses button + state toggle. Behaves the same as
 *     v1 but stripped of the LS-bait eyebrow pill.
 */
export default function FaqV2() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      aria-label="Frequently asked questions"
      className="py-16 md:py-24 bg-canvas"
    >
      <div className="container-page">
        <h2 className="font-display text-3xl md:text-5xl tracking-[-0.015em] leading-[1.05] pb-1 mb-10 md:mb-14 max-w-[22ch]">
          Before you write, the answers already here
        </h2>

        <ul className="border-b hairline">
          {FAQS.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <li
                key={f.q}
                className="border-t hairline"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start justify-between gap-4 py-5 md:py-6 text-left"
                >
                  <h3 className="font-display text-lg md:text-2xl tracking-[-0.015em] leading-[1.15]">
                    {f.q}
                  </h3>
                  <span
                    aria-hidden="true"
                    className={`font-mono text-xs uppercase tracking-[0.18em] text-ink-mute shrink-0 transition-transform ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    Plus
                  </span>
                </button>
                {isOpen && (
                  <p className="pb-6 max-w-[62ch] text-ink-mute leading-relaxed">
                    {f.a}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
