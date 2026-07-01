import type { Metadata } from "next";
import Link from "next/link";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { getStudioBrand } from "@/lib/studio-brand";
import Hero from "@/components/projects/Hero";
import NumbersStrip from "@/components/projects/NumbersStrip";
import ProjectsClient from "./ProjectsClient";
import FeaturedGrid from "@/components/projects/FeaturedGrid";
import ProjectsTestimonial from "@/components/projects/Testimonial";
import ProcessStrip from "@/components/projects/ProcessStrip";
import LogoWall from "@/components/projects/LogoWall";
import ProjectsFaq from "@/components/projects/Faq";
import CtaBand from "@/components/projects/CtaBand";

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
    year: r.year || "",
    scope: r.scope || r.category || "Residential",
    image: r.before_image || FALLBACK,
    has3D: Boolean(r.model_3d),
    modelUrl: r.model_3d || null,
    posterUrl: r.before_image || null,
  }));

  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean))
  );
  const years = Array.from(new Set(items.map((i) => i.year).filter(Boolean)))
    .sort()
    .reverse();
  const brand = getStudioBrand();

  return (
    <main>
      {items.length === 0 ? (
        <Hero count={0} />
      ) : (
        <Hero count={items.length} />
      )}

      <NumbersStrip projectCount={items.length} />

      {items.length === 0 ? (
        <section className="py-16 md:py-24 bg-canvas">
          <div className="container-page">
            <div className="surface-tile p-10 text-center">
              <p className="chrome-pill mb-3 inline-flex">No projects yet</p>
              <p className="text-ink-mute max-w-prose mx-auto">
                The studio has not published any projects. Sign in to
                <Link
                  href="/admin/projects"
                  className="ml-2 text-ink border-b border-[var(--accent-soft)]"
                >
                  write one
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="py-16 md:py-24 bg-canvas">
          <div className="container-page">
            <ProjectsClient
              items={items}
              categories={categories}
              years={years}
            />
          </div>
        </section>
      )}

      <FeaturedGrid items={items} />
      <ProjectsTestimonial />
      <ProcessStrip />
      <LogoWall />
      <ProjectsFaq />
      <CtaBand />

      <footer className="py-8 border-t hairline bg-canvas">
        <div className="container-page flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
          <span>{brand.footer_credit}</span>
          <span>{brand.studio_address}</span>
        </div>
      </footer>
    </main>
  );
}
