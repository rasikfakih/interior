/**
 * src/lib/revalidate.ts
 *
 * Public-side cache invalidation helpers.
 *
 * Every admin / operator write route must call one of these
 * helpers at the tail of the happy path so the next public
 * request sees the new state. Failing to call = stale front
 * end for up to the configured revalidate window (or forever
 * if the page is fully static).
 *
 * Strategy:
 *   - revalidatePath(p) for every public URL that depends
 *     on the row(s) that just changed
 *   - revalidateTag(...) left aside; this codebase keeps the
 *     invalidation explicit per-route so an operator can
 *     audit which writes invalidate which surfaces by
 *     reading this file.
 *
 * Public pages in this project render from these tables:
 *   projects  -> /, /projects, /projects/[slug], /voices
 *   journal   -> /journal, /journal/[slug]
 *   team      -> /about, /voices
 *   testimonials -> /, /voices
 *   media     -> referenced by project + journal detail pages
 *   pages     -> /[slug] (where slug matches) and / for is_front
 *   settings  -> chrome via getSiteSettings()
 *   site_identity -> chrome (logo / favicon / footer_credit)
 *   install   -> /install
 *
 * The set of public URLs is small enough that wholesale
 * invalidation across the public telemetry is cheap. We
 * declare the ironclad list below so any future page-route
 * addition needs a one-line bump here.
 */

import { revalidatePath } from "next/cache";

export type EntityKind =
  | "projects"
  | "journal"
  | "testimonials"
  | "team"
  | "media"
  | "pages"
  | "settings"
  | "site-identity"
  | "install";

export type PublicLocation =
  | "home"
  | "projects"
  | "projects-detail"
  | "journal"
  | "journal-detail"
  | "voices"
  | "about"
  | "contact"
  | "install"
  | "admin-shell";

const PUBLIC_PATHS: Record<PublicLocation, string | string[]> = {
  home: "/",
  projects: "/projects",
  "projects-detail": ["/projects/[slug]"],
  journal: "/journal",
  "journal-detail": ["/journal/[slug]"],
  voices: "/voices",
  about: "/about",
  contact: "/contact",
  install: "/install",
  "admin-shell": ["/admin", "/admin/[...rest]"],
};

function flushLocation(loc: PublicLocation) {
  const p = PUBLIC_PATHS[loc];
  const list = Array.isArray(p) ? p : [p];
  for (const path of list) {
    try {
      revalidatePath(path);
    } catch {
      // Force-dynamic and prerendered paths both accept
      // revalidatePath in Next 16; ignore the rare no-op
      // throw so the call site stays DRY.
    }
  }
}

function flushSlugPaths(slug: string) {
  // revalidatePath does NOT support wildcards in older
  // versions; pass an exact match plus the prefix for
  // safety. Operators /admin pages and the home page are
  // already flushed by entity-aware calls.
  if (!slug) return;
  try {
    revalidatePath(`/${slug}`);
    revalidatePath(`/projects/${slug}`);
    revalidatePath(`/journal/${slug}`);
  } catch {
    // no-op
  }
}

export interface BumpOptions {
  kind: EntityKind;
  slug?: string | null;
  pageSlug?: string | null;
}

/**
 * After a successful admin write, tell Next which public
 * paths must be invalidated. Idempotent. Always safe to
 * call - tolerable failure modes are swallowed.
 */
export function bump(opts: BumpOptions): void {
  switch (opts.kind) {
    case "projects": {
      flushLocation("home");
      flushLocation("projects");
      flushLocation("projects-detail");
      flushSlugPaths(opts.slug || "");
      break;
    }
    case "journal": {
      flushLocation("journal");
      flushLocation("journal-detail");
      flushSlugPaths(opts.slug || "");
      break;
    }
    case "testimonials":
    case "team": {
      flushLocation("home");
      flushLocation("voices");
      flushLocation("about");
      break;
    }
    case "media": {
      // Media rows feed project + journal detail pages via
      // before_image / after_image / cover_image / gallery
      // references. Sweep broadly.
      flushLocation("home");
      flushLocation("projects");
      flushLocation("projects-detail");
      flushLocation("journal");
      flushLocation("journal-detail");
      flushSlugPaths(opts.slug || "");
      break;
    }
    case "pages": {
      flushLocation("home");
      // Newly published / unpublished pages appear or
      // disappear from listing surfaces.
      flushLocation("projects");
      flushLocation("journal");
      flushLocation("voices");
      flushLocation("about");
      flushLocation("contact");
      flushLocation("install");
      // Slug can come from the page row itself. If no
      // slug was supplied, fall back to the home path
      // (already flushed above).
      flushSlugPaths(opts.pageSlug || opts.slug || "");
      break;
    }
    case "settings": {
      flushLocation("home");
      flushLocation("contact");
      flushLocation("about");
      flushLocation("projects");
      flushLocation("journal");
      flushLocation("voices");
      flushLocation("install");
      flushLocation("admin-shell");
      break;
    }
    case "site-identity": {
      // Logo / favicon / footer_credit / brand name touch
      // every page (chrome appears on all).
      flushLocation("home");
      flushLocation("projects");
      flushLocation("projects-detail");
      flushLocation("journal");
      flushLocation("journal-detail");
      flushLocation("voices");
      flushLocation("about");
      flushLocation("contact");
      flushLocation("install");
      flushLocation("admin-shell");
      break;
    }
    case "install": {
      flushLocation("install");
      flushLocation("admin-shell");
      break;
    }
    default: {
      // exhaustive guard
      const _never: never = opts.kind;
      void _never;
    }
  }
}

/**
 * Wipe everything. Used by demo-reset and operator flows
 * that just nuked the database.
 */
export function bumpAll(): void {
  const all: PublicLocation[] = [
    "home",
    "projects",
    "projects-detail",
    "journal",
    "journal-detail",
    "voices",
    "about",
    "contact",
    "install",
    "admin-shell",
  ];
  for (const loc of all) flushLocation(loc);
}
