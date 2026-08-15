import type { Metadata } from "next";
import HomeV2 from "@/components/home/HomeV2";
import { getFrontPage } from "@/lib/pages";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { parseJsonCell } from "@/lib/json-cell";

// WordPress-grade live update: every page that depends on
// admin-edited data renders dynamically. Admin writes call
// revalidatePath() in src/lib/revalidate.ts to bust the
// public cache so the next request sees the new state.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Per-page SEO (StudioOS Phase 1): the SEO panel in the page editor
// writes seo_title / seo_description / robots; this page serves them.
export async function generateMetadata(): Promise<Metadata> {
  const { page } = await getFrontPage();
  if (!page) return {};
  const title = page.seo_title || page.title || undefined;
  const description = page.seo_description || undefined;
  const noindex = page.robots ? page.robots.includes("noindex") : false;
  return {
    title: title || undefined,
    description,
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

type DbProjectRow = {
  slug: string;
  title: string;
  category: string | null;
  location: string | null;
  year: string | null;
  before_image: string | null;
  after_image: string | null;
};

export type HomeProject = {
  slug: string;
  title: string;
  category: string;
  location: string;
  year: string;
  image: string;
};

type DbPlanRow = {
  id: string;
  name: string;
  price_usd: number;
  price_inr: number;
  project_limit: number;
  lead_limit: number;
  board_limit: number;
  boq_version_limit: number;
  ai_credits_limit: number;
  features_json: string;
};

export type HomePlan = {
  id: string;
  name: string;
  priceUsd: number;
  priceInr: number;
  projectLimit: number;
  leadLimit: number;
  boardLimit: number;
  boqVersionLimit: number;
  aiCreditsLimit: number;
  features: Record<string, unknown>;
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
      image: r.before_image || r.after_image || "",
    }));
  } catch {
    return [];
  }
}

async function getPlans(): Promise<HomePlan[]> {
  try {
    await ensureMigrated();
    const rows = await pgMany<DbPlanRow>(
      `SELECT id, name, price_usd, price_inr, project_limit, lead_limit,
              board_limit, boq_version_limit, ai_credits_limit, features_json
       FROM plans WHERE is_active = TRUE ORDER BY price_usd ASC`
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      priceUsd: Number(r.price_usd ?? 0),
      priceInr: Number(r.price_inr ?? 0),
      projectLimit: Number(r.project_limit ?? 0),
      leadLimit: Number(r.lead_limit ?? 0),
      boardLimit: Number(r.board_limit ?? 0),
      boqVersionLimit: Number(r.boq_version_limit ?? 0),
      aiCreditsLimit: Number(r.ai_credits_limit ?? 0),
      features: parseJsonCell<Record<string, unknown>>(r.features_json, {}),
    }));
  } catch {
    return [];
  }
}

const DEMO_PROJECTS: HomeProject[] = [
  {
    slug: "demo-living",
    title: "Living Room",
    category: "Apartment",
    location: "Kalyan",
    year: "2026",
    image: "/demo/living-room-1.jpg",
  },
  {
    slug: "demo-bedroom",
    title: "Master Bedroom",
    category: "Apartment",
    location: "Kalyan",
    year: "2026",
    image: "/demo/bedroom-1.jpg",
  },
  {
    slug: "demo-kitchen",
    title: "Kitchen",
    category: "Apartment",
    location: "Kalyan",
    year: "2026",
    image: "/demo/kitchen-1.jpg",
  },
  {
    slug: "demo-entry",
    title: "Entry",
    category: "Villa",
    location: "Kalyan",
    year: "2025",
    image: "/demo/entry-1.jpg",
  },
];

export default async function Home() {
  await getFrontPage();
  const [projects, plans] = await Promise.all([getProjects(), getPlans()]);
  const homeProjects = projects.length > 0 ? projects : DEMO_PROJECTS;

  return <HomeV2 projects={homeProjects} plans={plans} />;
}
