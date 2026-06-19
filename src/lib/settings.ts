import "server-only";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";

export type SiteSettings = {
  contact_email: string;
  contact_phone: string;
  studio_address: string;
  calendly_url: string;
  site_seo_title: string;
};

const defaults: SiteSettings = {
  contact_email: "studio@etihadinteriors.com",
  contact_phone: "+91 99999 99999",
  studio_address: "4F, above ICICI Bank, Kalyan West 421301",
  calendly_url: "https://calendly.com/etihadinteriors/intro",
  site_seo_title: "Etihad Interiors — Residential Design Studio",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await db.select().from(settings);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      contact_email: map.contact_email || defaults.contact_email,
      contact_phone: map.contact_phone || defaults.contact_phone,
      studio_address: map.studio_address || defaults.studio_address,
      calendly_url: map.calendly_url || defaults.calendly_url,
      site_seo_title: map.site_seo_title || defaults.site_seo_title,
    };
  } catch {
    return defaults;
  }
}
