import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { normalizeSource } from "@/app/api/redirects/route";

export const dynamic = "force-dynamic";

/**
 * DB-driven redirect enforcement. This catch-all only matches paths
 * that no concrete route claims (e.g. /old-page, /renamed-slug), so
 * it never intercepts /, /projects, /admin, /api, etc. A matching
 * active redirect row issues 308 (permanent) or 307 (temporary);
 * anything else falls through to the 404 page.
 */
export default async function RedirectCatchAll({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const source = normalizeSource("/" + slug.join("/"));
  await ensureMigrated();
  const hit = await pgOne<{
    destination: string;
    status_code: number;
  }>(
    `SELECT destination, status_code
     FROM redirects
     WHERE source = $1 AND is_active = TRUE
     LIMIT 1`,
    [source]
  );
  if (!hit) {
    notFound();
  }
  const code = Number(hit.status_code);
  if (code === 302 || code === 307) {
    redirect(hit.destination);
  }
  permanentRedirect(hit.destination);
}
