import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Journal",
  description: "Field notes from the studio. Written by hand, published when ready.",
};

const entries = [
  {
    slug: "stone-quarries",
    title: "Three stone quarries outside Pune, and what they actually do",
    excerpt:
      "You'll never be quoted the same marble twice. A walk through the yards that supply our floors.",
    date: "Mar 2025",
    category: "Materials",
    readingTime: "6 min",
  },
  {
    slug: "first-meeting",
    title: "The first on-site meeting, and the four questions we always ask",
    excerpt:
      "How a household is lived in matters more than how it looks in renderings.",
    date: "Jan 2025",
    category: "Process",
    readingTime: "4 min",
  },
  {
    slug: "site-reports",
    title: "Why we still write site reports by hand",
    excerpt:
      "A photograph shows one moment. A written report shows the movement between them.",
    date: "Nov 2024",
    category: "Studio notes",
    readingTime: "5 min",
  },
  {
    slug: "wood-vendors",
    title: "On finding wood vendors who still work by eye",
    excerpt:
      "An interview with two third-generation vendors in central Mumbai.",
    date: "Sep 2024",
    category: "Materials",
    readingTime: "8 min",
  },
  {
    slug: "drawings-on-paper",
    title: "We draw on paper before we draw on screen",
    excerpt:
      "Three reasons why the studio still keeps rolls of tracing on a low table in the front room.",
    date: "Jul 2024",
    category: "Process",
    readingTime: "3 min",
  },
  {
    slug: "monsoon-sites",
    title: "What monsoon week looks like on a client site",
    excerpt:
      "Three things every homeowner should know about indoor humidity during June.",
    date: "May 2024",
    category: "Studio notes",
    readingTime: "4 min",
  },
];

export default function JournalPage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
          <div className="md:col-span-7">
            <p className="chrome-pill mb-6 inline-flex">Journal</p>
            <h1 className="text-[clamp(2.4rem,6vw,5rem)] tracking-[-0.025em] leading-[1]">
              <em className="text-accent not-italic font-medium">Field</em> notes
              from the studio.
            </h1>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">
              Long-form entries on materials, process, and the parts of the
              work that don't end up in a photograph.
            </p>
          </div>
        </div>

        <div className="divide-y hairline">
          {entries.map((e) => (
            <Link
              key={e.slug}
              href={`/journal/${e.slug}`}
              className="group block py-8 md:py-10"
            >
              <article className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-10">
                <div className="md:col-span-2 flex md:flex-col gap-3 md:gap-2 text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
                  <span>{e.date}</span>
                  <span className="text-warm">{e.category}</span>
                </div>
                <div className="md:col-span-7">
                  <h2 className="text-2xl md:text-3xl tracking-tight group-hover:text-accent transition-colors">
                    {e.title}
                  </h2>
                  <p className="text-ink-mute mt-3 max-w-[60ch] leading-relaxed">
                    {e.excerpt}
                  </p>
                </div>
                <div className="md:col-span-3 md:text-right text-sm text-ink-mute font-mono uppercase tracking-[0.14em]">
                  {e.readingTime}
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
