import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://etihadinteriors.com";

const projectSlugs = [
  "casa-mira",
  "nalanda-house",
  "salt-flats",
  "ashok-villa",
  "banu-residence",
  "lotus-arc",
];

const journalSlugs = [
  "stone-quarries",
  "first-meeting",
  "site-reports",
  "wood-vendors",
  "drawings-on-paper",
  "monsoon-sites",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastmod = new Date();

  return [
    { url: `${base}/`, lastModified: lastmod, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/projects`, lastModified: lastmod, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about`, lastModified: lastmod, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/journal`, lastModified: lastmod, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/contact`, lastModified: lastmod, changeFrequency: "yearly", priority: 0.6 },
    ...projectSlugs.map((slug) => ({
      url: `${base}/projects/${slug}`,
      lastModified: lastmod,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...journalSlugs.map((slug) => ({
      url: `${base}/journal/${slug}`,
      lastModified: lastmod,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
