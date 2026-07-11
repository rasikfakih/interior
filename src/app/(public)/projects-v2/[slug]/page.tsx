import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { getStudioBrand } from "@/lib/studio-brand";
import Model3DViewer from "@/components/Model3DViewer";
import ProjectHeaderV2 from "@/components/projects-v2/ProjectHeader";
import ProjectBeforeAfterV2 from "@/components/projects-v2/ProjectBeforeAfter";
import ProjectSpecsV2 from "@/components/projects-v2/ProjectSpecs";
import ProjectVoicesV2 from "@/components/projects-v2/ProjectVoices";
import ProjectRelatedV2 from "@/components/projects-v2/ProjectRelated";
import DetailCtaBandV2 from "@/components/projects-v2/DetailCtaBand";

export const dynamic = "force-dynamic";

type ProjectRow = {
  slug: string;
  title: string;
  category: string | null;
  location: string | null;
  year: string | null;
  scope: string | null;
  description: string | null;
  description_json: unknown | null;
  before_image: string | null;
  after_image: string | null;
  model_3d: string | null;
  is_published: boolean;
};

const FALLBACK =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop";

async function getProject(slug: string): Promise<ProjectRow | null> {
  try {
    await ensureMigrated();
    return await pgOne<ProjectRow>(
      `SELECT slug, title, category, location, year, scope,
              description, description_json, before_image, after_image,
              model_3d, is_published
       FROM projects WHERE slug = $1 LIMIT 1`,
      [slug]
    );
  } catch {
    return null;
  }
}

async function getRelated(category: string, currentSlug: string) {
  try {
    await ensureMigrated();
    const rows = await pgMany<{
      slug: string;
      title: string;
      category: string | null;
      location: string | null;
      year: string | null;
      scope: string | null;
      before_image: string | null;
    }>(
      `SELECT slug, title, category, location, year, scope, before_image
       FROM projects
       WHERE is_published = TRUE
            AND slug <> $1
            AND category IS NOT NULL
            AND category = $2
       ORDER BY order_index ASC, id ASC
       LIMIT 3`,
      [currentSlug, category]
    );
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      category: r.category || "Residential",
      location: r.location || "Maharashtra",
      year: r.year || "",
      scope: r.scope || r.category || "Residential",
      image: r.before_image || FALLBACK,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getProject(slug);
  if (!row) return { title: "Project not found" };
  return {
    title: row.title,
    description: row.description || `${row.title} - Etihad Interiors`,
  };
}

export default async function ProjectV2DetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getProject(slug);
  if (!row || row.is_published === false) notFound();

  const brand = getStudioBrand();
  const related = await getRelated(row.category || "Residential", row.slug);

  return (
    <main>
      <ProjectHeaderV2
        slug={row.slug}
        title={row.title}
        year={row.year}
        location={row.location}
        category={row.category}
        scope={row.scope}
        description={row.description}
        description_json={row.description_json}
      />

      <ProjectBeforeAfterV2
        title={row.title}
        beforeSrc={row.before_image}
        beforeAlt={`${row.title} - before photograph`}
        afterSrc={row.after_image}
        afterAlt={`${row.title} - after photograph`}
        caption={`Before and after - ${row.title}`}
      />

      {row.model_3d ? (
        <section
          aria-label="3D walkthrough"
          className="py-12 md:py-16 bg-canvas border-t hairline"
        >
          <div className="container-page">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-4">
              Spatial study - 3D walkthrough
            </p>
            <div className="surface-elevated p-3 rounded-[var(--radius-card)]">
              <Model3DViewer
                modelUrl={row.model_3d}
                posterUrl={row.before_image || FALLBACK}
              />
            </div>
          </div>
        </section>
      ) : null}

      <ProjectSpecsV2
        year={row.year}
        location={row.location}
        category={row.category}
        scope={row.scope}
      />

      <ProjectVoicesV2 slug={row.slug} />

      <ProjectRelatedV2 items={related} />

      <DetailCtaBandV2 />

      <footer className="py-8 border-t hairline bg-canvas">
        <div className="container-page flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
          <span>{brand.footer_credit}</span>
          <span>{brand.studio_address}</span>
        </div>
      </footer>
    </main>
  );
}
