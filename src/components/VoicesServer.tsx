import Link from "next/link";
import { ensureMigrated, pgMany } from "@/lib/pg";

type Row = {
  id: number;
  name: string;
  role: string | null;
  quote: string;
  photo: string | null;
  is_published: boolean;
};

export default async function VoicesServer({
  limit = 6,
}: {
  limit?: number;
}) {
  let rows: Row[] = [];
  try {
    await ensureMigrated();
    rows = await pgMany<Row>(
      `SELECT id, name, role, quote, photo, is_published
       FROM testimonials
       WHERE is_published = TRUE
       ORDER BY id ASC
       LIMIT $1`,
      [limit]
    );
  } catch {
    rows = [];
  }

  if (rows.length === 0) {
    return (
      <section
        className="py-20 md:py-28"
        aria-label="Client voices, empty"
      >
        <div className="container-page">
          <div className="surface-tile p-10 text-center">
            <p className="chrome-pill mb-3 inline-flex">Voices</p>
            <p className="text-ink-mute max-w-prose mx-auto">
              No client testimonials have been published yet. Sign in to
              <Link href="/admin/testimonials" className="ml-2 text-ink border-b border-[var(--accent-soft)]">
                write one
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 md:py-36" aria-label="Client voices">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12 md:mb-16">
          <div className="md:col-span-7">
            <p className="chrome-pill mb-6 inline-flex">Voices</p>
            <h2 className="text-4xl md:text-[3.5rem] tracking-tighter">
              Words from the homes.
            </h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">
              Three clients, three completions. Names abbreviated on request.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {rows.map((q) => {
            const initial = (q.name || "Â·").charAt(0).toUpperCase();
            const photo = q.photo && String(q.photo).trim();
            return (
              <article
                key={q.id}
                className="surface-tile p-7 md:p-8 flex flex-col gap-6"
              >
                <span
                  aria-hidden
                  className="font-mono text-5xl leading-none text-ink/50 select-none"
                >
                  â€œ
                </span>
                <blockquote className="text-base md:text-lg leading-relaxed text-ink">
                  {q.quote}
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-3 pt-4 border-t hairline">
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="inline-flex items-center justify-center w-11 h-11 rounded-full font-mono text-base font-medium"
                      style={{
                        background: "var(--accent)",
                        color: "var(--bg)",
                        letterSpacing: "-0.02em",
                      }}
                      aria-hidden
                    >
                      {initial}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium">{q.name}</p>
                    <p className="text-xs text-ink-mute font-mono uppercase tracking-[0.14em]">
                      {q.role || "Client"}
                    </p>
                  </div>
                </figcaption>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
