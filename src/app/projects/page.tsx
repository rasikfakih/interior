import type { Metadata } from "next";
import Link from "next/link";
import Database from "better-sqlite3";
import path from "path";
import ProjectsClient from "./ProjectsClient";

export const metadata: Metadata = {
  title: "Selected work",
  description: "Residential interiors delivered since 2017.",
};

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

const seedProjects = [
  {
    slug: "casa-mira",
    title: "Casa Mira",
    location: "Bandra, Mumbai",
    year: "2024",
    scope: "1,820 sq.ft · Apartment",
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1600&auto=format&fit=crop",
    has3D: false,
    modelUrl: null,
    posterUrl: null,
  },
  {
    slug: "nalanda-house",
    title: "Nalanda House",
    location: "Kalyan, Maharashtra",
    year: "2024",
    scope: "4,200 sq.ft · Independent villa",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a89a2c?q=80&w=1600&auto=format&fit=crop",
    has3D: true,
    modelUrl: "/models/seed/reception-room.glb",
    posterUrl:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop",
  },
  {
    slug: "salt-flats",
    title: "Salt Flats",
    location: "Alibaug, Maharashtra",
    year: "2023",
    scope: "3,400 sq.ft · Coastal home",
    image:
      "https://images.unsplash.com/photo-1613553497126-a44624272013?q=80&w=1600&auto=format&fit=crop",
    has3D: true,
    modelUrl: "/models/seed/salt-flats.glb",
    posterUrl:
      "https://images.unsplash.com/photo-1613553497126-a44624272013?q=80&w=1600&auto=format&fit=crop",
  },
  {
    slug: "ashok-villa",
    title: "Ashok Villa",
    location: "Nashik",
    year: "2023",
    scope: "5,600 sq.ft · Weekend home",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1600&auto=format&fit=crop",
    has3D: false,
    modelUrl: null,
    posterUrl: null,
  },
  {
    slug: "banu-residence",
    title: "Banu Residence",
    location: "Pune",
    year: "2022",
    scope: "2,400 sq.ft · Apartment",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop",
    has3D: false,
    modelUrl: null,
    posterUrl: null,
  },
  {
    slug: "lotus-arc",
    title: "Lotus Arc",
    location: "Thane",
    year: "2022",
    scope: "3,800 sq.ft · Apartment",
    image:
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1600&auto=format&fit=crop",
    has3D: false,
    modelUrl: null,
    posterUrl: null,
  },
];

function getDbProjects() {
  try {
    const sqlite = new Database(DB_PATH);
    const rows = sqlite
      .prepare(
        `SELECT slug, title, category, location, year, scope, before_image, model_3d
         FROM projects WHERE is_published = 1 ORDER BY order_index ASC, id ASC`
      )
      .all();
    sqlite.close();
    return rows.map((r: any) => ({
      slug: r.slug,
      title: r.title,
      category: r.category,
      location: r.location || "Maharashtra",
      year: r.year || "—",
      scope: r.scope || r.category || "Residential",
      image:
        r.before_image ||
        "https://images.unsplash.com/photo-1600585154340-be6161a89a2c?q=80&w=1600&auto=format&fit=crop",
      has3D: Boolean(r.model_3d),
      modelUrl: r.model_3d || null,
      posterUrl: r.before_image || null,
    }));
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const dbProjects: any[] = getDbProjects();
  const items = dbProjects.length
    ? dbProjects
    : seedProjects;

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
        <ProjectsClient items={items} />
      </div>
    </section>
  );
}
