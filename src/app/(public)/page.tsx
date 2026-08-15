import type { Metadata } from "next";
import SaasHome from "@/components/saas/SaasHome";
import { ensureMigrated, pgMany } from "@/lib/pg";
import { parseJsonCell } from "@/lib/json-cell";
import { IMAGES } from "@/lib/images";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// M1 (2026-08-15): the root is the Studio OS SaaS marketing site. The
// Etihad Interiors agency showcase lives at /demo (see (demo)/demo).
export const metadata: Metadata = {
  title: "Studio OS - The operating system for interior studios",
  description:
    "Leads, proposals, boards, BOQ with live material costs, an offline site diary, and a client portal. One console for interior studios in India, from first call to handover.",
};

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
      image: r.before_image || r.after_image || IMAGES.living,
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

export default async function Home() {
  const [projects, plans] = await Promise.all([getProjects(), getPlans()]);
  return <SaasHome projects={projects} plans={plans} />;
}
