import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

export type StudioBrand = {
  brand_name: string;
  tagline: string;
  contact_email: string;
  contact_phone: string;
  studio_address: string;
  calendly_url: string;
  year_established: string;
  residences_delivered: string;
  instagram_url: string;
  footer_credit: string;
  palette: {
    ink: string;
    paper: string;
    accent: string;
    muted: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    subtext: string;
  };
  default_locales: string[];
};

const DEFAULTS: StudioBrand = {
  brand_name: "Etihad Interiors",
  tagline:
    "A residential interior studio drawing, specifying, and on-site directing homes across Maharashtra.",
  contact_email: "studio@etihadinteriors.com",
  contact_phone: "+91 99999 99999",
  studio_address: "Kalyan, Maharashtra, India",
  calendly_url: "https://calendly.com/etihadinteriors/intro",
  year_established: "2017",
  residences_delivered: "60+",
  instagram_url: "https://instagram.com/etihadinteriors",
  footer_credit: "Powered by Etihad Interiors Theme v1.3.0",
  palette: {
    ink: "#1F3A2D",
    paper: "#F2EFE7",
    accent: "#C28B3C",
    muted: "#5A6B5F",
  },
  hero: {
    eyebrow: "Residential Studio - Maharashtra",
    headline: "Homes drawn, built, and lived in",
    subtext:
      "Etihad Interiors is a residential studio in Kalyan. Twenty-four weeks. One team. Drawings, materials, and on-site direction from the same hands.",
  },
  default_locales: ["en", "hi", "mr"],
};

let cached: StudioBrand | null = null;

export function getStudioBrand(): StudioBrand {
  if (cached) return cached;
  try {
    const p = path.join(process.cwd(), "data", "studio-brand.json");
    const raw = readFileSync(p, "utf-8");
    cached = { ...DEFAULTS, ...JSON.parse(raw) } as StudioBrand;
  } catch {
    cached = DEFAULTS;
  }
  return cached;
}
