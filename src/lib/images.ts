/**
 * Central image catalog - Studio OS v2.
 *
 * Every curated photo resolves to images.unsplash.com (all IDs below were
 * HTTP-verified on 2026-08-15). next.config.mjs already allows the
 * images.unsplash.com remote pattern, so next/image optimizes these.
 * Uploaded tenant media (Supabase storage / /uploads) keeps priority:
 * these URLs are the demo and empty-state fallbacks only.
 */

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Room and site photography by slot. */
export const IMAGES = {
  /** Hero / living room / generic interior fallback. */
  living: u("1600585154526-990dced4db0d", 1600),
  livingAlt: u("1600210492486-724fe5c67fb0", 1600),
  kitchen: u("1556911220-bff31c812dba", 1200),
  kitchenAlt: u("1600489000022-c2086d79f9d4", 1200),
  bedroom: u("1560185007-cde436f6a4d0", 1200),
  bedroomAlt: u("1616594039964-ae9021a400a0", 1200),
  bathroom: u("1552321554-5fefe8c9ef14", 1200),
  bathroomAlt: u("1620626011761-996317b8d101", 1200),
  entry: u("1600121848594-d8644e57abab", 1200),
  stair: u("1519710164239-da123dc03ef4", 1200),
  outdoor: u("1600607687939-ce8a6c25118c", 1200),
  /** Construction / site work, used for diary and snag empty states. */
  process: u("1504307651254-35680f356dfd", 1200),
  /** Neutral premium material detail (marble), generic material fallback. */
  detail: u("1599661046289-e31897846e41", 1200),
} as const;

/** One curated photo per kanban column empty state. */
export const KANBAN_ART: Record<string, string> = {
  new: IMAGES.entry,
  qualified: IMAGES.living,
  site_visit: IMAGES.bathroom,
  quote_sent: IMAGES.kitchen,
  won: IMAGES.bedroom,
  lost: IMAGES.outdoor,
};

/** Category-aware material fallback (materials table categories). */
const MATERIAL_ART: Record<string, string> = {
  stone: u("1599661046289-e31897846e41"),
  wood: u("1519947486511-46149fa0a254"),
  textile: u("1528459801416-a9e53bbf4e17"),
  hardware: u("1503736334956-4c8f8e92946d"),
  lighting: u("1507473885765-e6ed057f782c"),
  furniture: u("1555041469-a586c61ea9bc"),
  paint: u("1562259949-e8e7689d7828"),
  civil: u("1541888946425-d81bb19240f5"),
  electrical: u("1513506003901-1e6a229e2d15"),
  plumbing: u("1504307651254-35680f356dfd"),
};

/**
 * Pick the image to render for a material: the uploaded image wins,
 * otherwise a curated Unsplash photo for its category.
 */
export function materialImageUrl(m: {
  imageUrl?: string | null;
  category?: string | null;
}): string {
  if (m.imageUrl) return m.imageUrl;
  return MATERIAL_ART[m.category ?? "other"] ?? IMAGES.detail;
}
