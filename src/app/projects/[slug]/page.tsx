import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Model3DViewer from "@/components/Model3DViewer";
import RichTextRenderer from "@/components/RichTextRenderer";

const seedProjects: Record<
  string,
  {
    title: string;
    location: string;
    year: string;
    scope: string;
    description: string;
    descriptionJson?: string | null;
    image: string;
    gallery: string[];
    has3D: boolean;
    modelUrl?: string;
    posterUrl?: string;
    category: string;
  }
> = {
  "casa-mira": {
    title: "Casa Mira",
    location: "Bandra, Mumbai",
    year: "2024",
    scope: "1,820 sq.ft · 3-bed apartment",
    category: "Apartment",
    description:
      "A family of four moved from a smaller duplex into a bandra-facing apartment that catches morning light from two sides. The plan reorganised public and private halves into a long, low arrangement. Stone floor with a single accent wall; cabinets in cedar, not veneer.",
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1600&auto=format&fit=crop",
    ],
    has3D: false,
  },
  "nalanda-house": {
    title: "Nalanda House",
    location: "Kalyan, Maharashtra",
    year: "2024",
    scope: "4,200 sq.ft · Independent villa",
    category: "Villa",
    description:
      "Double-height living room, four bedrooms arranged around a courtyard. The villa's spine is a single corridor with cross-ventilation from east to west. Teak, stone, lime plaster. A small library off the master suite is the project's quiet centre.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a89a2c?q=80&w=1600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop",
    ],
    has3D: true,
    modelUrl: "/models/seed/reception-room.glb",
    posterUrl:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop",
  },
  "salt-flats": {
    title: "Salt Flats",
    location: "Alibaug, Maharashtra",
    year: "2023",
    scope: "3,400 sq.ft · Coastal home",
    category: "Coastal",
    description:
      "A single-storey weekend home within eighty metres of the shoreline. Lime plaster walls, Mangalore tile roof, exposed rafters in Kathiawar cedar. Built to salt, sun, and monsoon. All outdoor furniture in A-frames, designed for storage.",
    image:
      "https://images.unsplash.com/photo-1613553497126-a44624272013?q=80&w=1600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop",
    ],
    has3D: false,
  },
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let project: any = seedProjects[slug];
  try {
    const rows = await db.select().from(projects).where(eq(projects.slug, slug));
    const row = rows?.[0];
    if (row && row.isPublished !== false) {
      project = {
        ...(project || {}),
        title: row.title,
        location: row.location || "Maharashtra",
        category: row.category || "Residential",
        year: row.year || "—",
        scope: row.scope || row.category || "Residential",
        description: row.description,
        descriptionJson: row.descriptionJson,
        image:
          row.beforeImage ||
          "https://images.unsplash.com/photo-1600585154340-be6161a89a2c?q=80&w=1600&auto=format&fit=crop",
        gallery:
          (project?.gallery?.length ? project.gallery : []) || [],
        has3D: Boolean(row.model3d),
        modelUrl: row.model3d,
      };
    }
  } catch {}

  if (!project) notFound();

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
              {project.year}
            </p>
            <h1 className="text-[clamp(2.4rem,6vw,5rem)] tracking-[-0.025em] leading-[1] mt-3">
              {project.title}
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-mute mt-4">
              {project.location}
            </p>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <RichTextRenderer
              json={project.descriptionJson}
              fallbackText={project.description}
            />
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-mute mt-5">
              Scope · {project.scope}
            </p>
          </div>
        </header>

        <div className="relative overflow-hidden rounded-[var(--radius-card)] aspect-[16/9] mb-16">
          <img
            src={project.image}
            alt={project.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </div>

        {project.has3D && project.modelUrl && (
          <section className="mb-20">
            <p className="chrome-pill mb-4 inline-flex">Spatial study</p>
            <h2 className="text-3xl md:text-5xl tracking-tighter mb-6">
              3D walkthrough
            </h2>
            <div className="surface-elevated p-3 rounded-[var(--radius-card)]">
              <Model3DViewer
                modelUrl={project.modelUrl}
                posterUrl={project.posterUrl}
              />
            </div>
          </section>
        )}

        {project.gallery && project.gallery.length > 0 && (
          <section>
            <p className="chrome-pill mb-4 inline-flex">Gallery</p>
            <h2 className="text-3xl md:text-5xl tracking-tighter mb-8">
              Selected photographs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
              {(project.gallery || []).map((g: string, i: number) => (
                <div
                  key={i}
                  className={`overflow-hidden rounded-[var(--radius-card)] relative ${
                    i === 0
                      ? "md:col-span-8 aspect-[16/10]"
                      : i === 1
                      ? "md:col-span-4 aspect-[16/12]"
                      : "md:col-span-6 aspect-[16/9]"
                  }`}
                >
                  <img
                    src={g}
                    alt={`${project.title} — frame ${i + 1}`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
