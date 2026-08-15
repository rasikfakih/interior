import Link from "next/link";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { getStudioBrand } from "@/lib/studio-brand";
import { IMAGES } from "@/lib/images";
import HorizontalProjects from "@/components/home/HorizontalProjects";
import type { HomeProject } from "@/app/(public)/page";

export const dynamic = "force-dynamic";

type DbProjectRow = {
  slug: string;
  title: string;
  category: string | null;
  location: string | null;
  year: string | null;
  before_image: string | null;
  after_image: string | null;
};

async function getProjects(): Promise<HomeProject[]> {
  try {
    await ensureMigrated();
    const rows = await pgMany<DbProjectRow>(
      `SELECT slug, title, category, location, year, before_image, after_image
       FROM projects WHERE is_published = TRUE
       ORDER BY order_index ASC, id ASC`
    );
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      category: r.category || "Residential",
      location: r.location || "Maharashtra",
      year: r.year || "",
      image: r.before_image || r.after_image || IMAGES.living,
    }));
  } catch {
    return [];
  }
}

export default async function DemoHome() {
  const [projects] = await Promise.all([getProjects()]);
  const brand = getStudioBrand();

  return (
    <main>
      {/* Agency hero */}
      <section className="grid min-h-dvh grid-cols-1 md:grid-cols-10 items-end md:items-center overflow-hidden bg-canvas">
        <div className="md:col-span-6 container-page pb-10 md:pb-0 z-10 relative">
          <p className="eyebrow">{brand.hero?.eyebrow ?? "Residential Studio · Kalyan"}</p>
          <h1 className="font-hero mt-6 text-[13vw] md:text-[7vw] leading-[0.92] tracking-tight">
            {brand.hero?.headline ?? "Homes drawn, built, and lived in"}
          </h1>
          <p className="mt-6 max-w-[48ch] font-serif text-lg md:text-xl leading-relaxed text-ink-mute">
            {brand.hero?.subtext ??
              "A residential studio in Kalyan. Twenty-four weeks. One team. Drawings, materials, and on-site direction from the same hands."}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/demo/work"
              className="inline-flex items-center gap-2 rounded-lg bg-[#C0964F] px-6 py-4 text-sm font-medium text-[#122A20] dark:text-[#122A20] transition-colors hover:bg-[#D2B06A]"
            >
              View selected work
            </Link>
            <Link
              href="/demo/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--ink)] px-6 py-4 text-sm font-medium text-ink hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
            >
              Start a project
            </Link>
          </div>
        </div>
        <div className="md:col-span-4 h-[46dvh] md:h-full relative overflow-hidden md:border-l border-[var(--line-soft)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={projects[0]?.image ?? IMAGES.living} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#122A20]/10" />
        </div>
      </section>

      {/* Selected work - the same horizontal scroll the product sells */}
      {projects.length > 0 && (
        <HorizontalProjects projects={projects} />
      )}

      {/* Studio OS teaser */}
      <section className="bg-[var(--paper-soft)]">
        <div className="container-page grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 py-20 md:py-28">
          <div className="md:sticky md:top-28 self-start">
            <p className="eyebrow">The system</p>
            <h2 className="font-hero mt-4 text-4xl md:text-[4rem] leading-[0.95] tracking-tight">
              Every project in this studio runs on one console.
            </h2>
          </div>
          <div className="space-y-6 font-serif text-lg md:text-xl leading-relaxed max-w-[52ch]">
            <p>
              Drawings, material rates, the BOQ, site photos, and client
              approvals all live in Studio OS - the same system this demo
              agency is built on. A rate change in the material library
              flows to every project bill. Site logs work offline, because
              sites do not have wifi.
            </p>
            <p>
              This is a live tenant: the contact form feeds a real lead,
              the boards are drag-built, the BOQ is versioned, and the
              client portal shows approvals without a login.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--ink)] px-5 py-3 text-sm font-medium text-ink hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
            >
              See how Studio OS works
            </Link>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-[#122A20] text-[#ECECE6]">
        <div className="container-page py-20 md:py-28 text-center">
          <p className="eyebrow !text-[#D6CBB3]">Start a project</p>
          <h2 className="font-hero mx-auto mt-5 max-w-[18ch] text-4xl md:text-[4.5rem] leading-[0.95] tracking-tight">
            One home at a time, drawn and built by the same hands.
          </h2>
          <Link
            href="/demo/contact"
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-[#C0964F] px-8 py-4 text-sm font-medium text-[#122A20] dark:text-[#122A20] hover:bg-[#D2B06A] transition-colors"
          >
            Talk to the studio
          </Link>
        </div>
      </section>
    </main>
  );
}
