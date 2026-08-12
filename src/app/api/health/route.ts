import { NextResponse } from "next/server";
import { ensureMigrated, pgQuery } from "@/lib/pg";

export const dynamic = "force-dynamic";

/**
 * GET /api/health - liveness + DB reachability for uptime monitors.
 *
 * The studio hosts and supports buyer sites, so a probe needs to see
 * both surfaces: the app answering AND the durable store answering
 * `SELECT 1`. Returns 200 when both are up, 503 when the DB is not,
 * always with a JSON body an uptime checker can assert on.
 *
 * force-dynamic: a health probe must never be served from cache.
 */
export async function GET() {
  const started = Date.now();
  let db: "ok" | "error" = "ok";
  try {
    await ensureMigrated();
    const res = await pgQuery<{ ok: number }>("SELECT 1 AS ok");
    if (res.rows?.[0]?.ok !== 1) db = "error";
  } catch {
    db = "error";
  }
  const healthy = db === "ok";
  return NextResponse.json(
    {
      ok: healthy,
      db,
      ts: new Date().toISOString(),
      ms: Date.now() - started,
    },
    { status: healthy ? 200 : 503 }
  );
}
