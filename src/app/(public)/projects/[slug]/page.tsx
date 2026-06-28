import { notFound } from "next/navigation";
import Link from "next/link";
import { ensureMigrated, pgOne } from "@/lib/pg";
import Model3DViewer from "@/components/Model3DViewer";
import RichTextRenderer from "@/components/RichTextRenderer";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

type Row = {
  slug: string;
  title: string;
  category: string | null;
  location: string | null;
  year: string | null;
  scope: string | null;
  description: string;
  description_json: unknown | null;
  before_image: string | null;
  after_image: string | null;
  model_3d: string | null;
  is_published: boolean;
  gallery_media_ids: unknown | null;
};

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let row: Row | null = null;
  try {
    await ensureMigrated();
    row = await pgOne<Row>(
      `SELECT slug, title, category, location, year, scope, description,
              description_json, before_image, after_image, model_3d,
              is_published, gallery_media_ids
       FROM projects WHERE slug = $1 LIMIT 1`,
      [slug]
    );
  } catch {
    row = null;
  }

  if (!row || row.is_published === false) notFound();

  const FALLBACK =
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop";
  const before = row.before_image || FALLBACK;
  const after = row.after_image || FALLBACK;
  const hasAfter = Boolean(row.after_image);
  const hasBefore = Boolean(row.before_image);

  return (
    <article className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-mute hover:text-warm mb-10"
        >
          <span aria-hidden>←</span> Back to selected work
        </Link>

        <header className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-14">
          <div className="md:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-warm">
              {row.year || "—"}
            </p>
            <h1 className="text-[clamp(2.4rem,6vw,5rem)] tracking-[-0.025em] leading-[1] mt-3">
              {row.title}
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-mute mt-4">
              {[row.location, row.category].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <RichTextRenderer
              json={row.description_json as any}
              fallbackText={row.description}
            />
            {row.scope && (
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-mute mt-5">
                Scope · {row.scope}
              </p>
            )}
          </div>
        </header>

        {hasBefore && hasAfter ? (
          <BeforeAfterSlider
            beforeSrc={before}
            beforeAlt={`${row.title} — before`}
            afterSrc={after}
            afterAlt={`${row.title} — after`}
            caption={`Before and after · ${row.title}`}
          />
        ) : (
          <div className="relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/9] mb-16">
            <img
              src={before}
              alt={row.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        )}

        {row.model_3d && (
          <section className="mb-20 mt-16">
            <p className="chrome-pill mb-4 inline-flex">Spatial study</p>
            <h2 className="text-3xl md:text-5xl tracking-tighter mb-6">
              3D walkthrough
            </h2>
            <div className="surface-elevated p-3 rounded-[var(--radius-card)]">
              <Model3DViewer
                modelUrl={row.model_3d}
                posterUrl={before}
              />
            </div>
          </section>
        )}

        <VoicesSeed slug={row.slug} />
      </div>
    </article>
  );
}

async function VoicesSeed({ slug }: { slug: string }) {
  let rows: { id: number; name: string; role: string | null; quote: string; photo: string | null }[] = [];
  try {
    await ensureMigrated();
    rows = await import("@/lib/pg").then(({ pgMany }) =>
      pgMany(
        `SELECT id, name, role, quote, photo
         FROM testimonials
         WHERE is_published = TRUE
              AND role ILIKE $1
         ORDER BY id ASC
         LIMIT 3`,
        [`%${slug.split("-")[0]}%`]
      )
    );
  } catch {
    rows = [];
  }
  if (rows.length === 0) return null;
  return (
    <section className="mt-20">
      <p className="chrome-pill mb-4 inline-flex">From the homeowner</p>
      <h2 className="text-3xl md:text-5xl tracking-tighter mb-8">
        What the homeowner said
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rows.map((q) => (
          <figure
            key={q.id}
            className="surface-tile p-6 md:p-7 flex flex-col gap-3"
          >
            <blockquote className="text-base md:text-lg leading-relaxed text-ink">
              "{q.quote}"
            </blockquote>
            <figcaption className="mt-auto pt-4 border-t hairline text-sm">
              <p className="font-medium">{q.name}</p>
              <p className="text-xs text-ink-mute font-mono uppercase tracking-[0.14em]">
                {q.role}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
