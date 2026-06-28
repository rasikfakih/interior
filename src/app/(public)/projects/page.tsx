import type { Metadata } from "next";
import Link from "next/link";
import { ensureMigrated, pgMany } from "@/lib/pg";
import ProjectsClient from "./ProjectsClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Selected work",
  description: "Residential interiors delivered since 2017.",
};

type DbProjectRow = {
  slug: string;
  title: string;
  category: string | null;
  location: string | null;
  year: string | null;
  scope: string | null;
  before_image: string | null;
  after_image: string | null;
  model_3d: string | null;
};

async function getDbProjects() {
  try {
    await ensureMigrated();
    return await pgMany<DbProjectRow>(
      `SELECT slug, title, category, location, year, scope,
              before_image, after_image, model_3d
       FROM projects WHERE is_published = TRUE
       ORDER BY order_index ASC, id ASC`
    );
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const dbProjects = await getDbProjects();
  const FALLBACK =
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop";

  const items = dbProjects.map((r) => ({
    slug: r.slug,
    title: r.title,
    category: r.category || "Residential",
    location: r.location || "Maharashtra",
    year: r.year || "—",
    scope: r.scope || r.category || "Residential",
    image: r.before_image || FALLBACK,
    has3D: Boolean(r.model_3d),
    modelUrl: r.model_3d || null,
    posterUrl: r.before_image || null,
  }));

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
          <div className="md:col-span-7">
            <p className="chrome-pill mb-6 inline-flex">Selected work</p>
            <h1 className="text-[clamp(2.4rem,6vw,5rem)] tracking-[-0.025em] leading-[1]">
              Homes drawn, built, and lived in.
            </h1>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">
              {items.length} residences on public record. Walk through any
              that carry a 3D model straight from this page.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="surface-tile p-10 text-center">
            <p className="chrome-pill mb-3 inline-flex">No projects yet</p>
            <p className="text-ink-mute max-w-prose mx-auto">
              The studio has not published any projects. Sign in to
              <Link
                href="/admin/projects"
                className="ml-2 text-warm border-b border-[var(--accent-warm-soft)]"
              >
                write one
              </Link>
              .
            </p>
          </div>
        ) : (
          <ProjectsClient items={items} />
        )}
      </div>
    </section>
  );
}
