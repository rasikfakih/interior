import type { Metadata } from "next";
import Link from "next/link";
import { ensureMigrated, pgMany } from "@/lib/pg";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Journal",
  description: "Field notes from the studio. Written by hand, published when ready.",
};

type Row = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  author_name: string | null;
  cover_image: string | null;
  created_at: string | Date | null;
};

function fmtDate(s: string | Date | null | undefined): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function approxReadingTime(s: string | null | undefined): string {
  if (!s) return "5 min";
  const words = s.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min`;
}

export default async function JournalPage() {
  let rows: Row[] = [];
  try {
    await ensureMigrated();
    rows = await pgMany<Row>(
      `SELECT slug, title, excerpt, category, author_name,
              cover_image, created_at
       FROM journal_posts
       WHERE is_published = TRUE
       ORDER BY
         CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
         created_at DESC,
         id DESC`
    );
  } catch {
    rows = [];
  }

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

        {rows.length === 0 ? (
          <div className="surface-tile p-10 text-center">
            <p className="chrome-pill mb-3 inline-flex">No entries yet</p>
            <p className="text-ink-mute">
              The studio has not published any journal entries. Sign in to
              <Link href="/admin/journal" className="ml-2 text-warm border-b border-[var(--accent-warm-soft)]">
                write one
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="divide-y hairline">
            {rows.map((e) => (
              <Link
                key={e.slug}
                href={`/journal/${e.slug}`}
                className="group block py-8 md:py-10"
              >
                <article className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-10">
                  <div className="md:col-span-2 flex md:flex-col gap-3 md:gap-2 text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
                    <span>{fmtDate(e.created_at)}</span>
                    <span className="text-warm">{e.category || "Note"}</span>
                  </div>
                  <div className="md:col-span-7">
                    <h2 className="text-2xl md:text-3xl tracking-tight group-hover:text-accent transition-colors">
                      {e.title}
                    </h2>
                    <p className="text-ink-mute mt-3 max-w-[60ch] leading-relaxed">
                      {e.excerpt || ""}
                    </p>
                  </div>
                  <div className="md:col-span-3 md:text-right text-sm text-ink-mute font-mono uppercase tracking-[0.14em]">
                    {approxReadingTime(e.excerpt)}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
