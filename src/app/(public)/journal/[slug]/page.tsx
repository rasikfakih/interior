import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureMigrated, pgOne } from "@/lib/pg";
import RichTextRenderer from "@/components/RichTextRenderer";

export const dynamic = "force-dynamic";

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let entry: any = null;
  try {
    await ensureMigrated();
    entry = await pgOne<{
      slug: string;
      title: string;
      excerpt: string | null;
      content: string;
      content_json: unknown | null;
      cover_image: string | null;
      category: string | null;
      author_name: string | null;
      created_at: string | Date;
      is_published: boolean;
    }>(
      `SELECT slug, title, excerpt, content, content_json, cover_image,
              category, author_name, created_at, is_published
       FROM journal_posts WHERE slug = $1 LIMIT 1`,
      [slug]
    );
  } catch {}

  if (!entry) notFound();

  const dateLabel = entry.created_at
    ? new Date(entry.created_at as any).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Studio";

  return (
    <article className="pt-24 md:pt-28 pb-24">
      <div className="container-page max-w-3xl">
        <Link
          href="/journal"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-mute hover:text-warm mb-10"
        >
          <span aria-hidden>←</span> Back to journal
        </Link>

        <header className="mb-12">
          <div className="flex gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-4">
            <span>{dateLabel}</span>
            <span className="text-warm">· {entry.category || "Note"}</span>
            <span>· {entry.author_name || "Studio"}</span>
          </div>
          <h1 className="text-[clamp(2.2rem,5vw,4rem)] tracking-[-0.025em] leading-[1.05]">
            {entry.title}
          </h1>
        </header>

        {entry.cover_image && (
          <div className="aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] mb-10">
            <img
              src={entry.cover_image}
              alt={entry.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <RichTextRenderer
          json={entry.content_json}
          fallbackText={entry.content}
        />
      </div>
    </article>
  );
}
