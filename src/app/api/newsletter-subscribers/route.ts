import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany } from "@/lib/pg";

/**
 * TS-006 Phase C - newsletter subscribers viewer.
 *
 * GET /api/newsletter-subscribers returns the subscriber list
 * (id, email, subscribed_at, active). The public POST form
 * lives at /api/newsletter and writes/upserts on email lowercase.
 *
 * DELETE on /api/newsletter-subscribers/[id] flips active=0
 * (soft delete) - hard delete is intentionally not exposed to
 * keep the subscriber history auditable.
 *
 * requireAdminSession -> 401 anon, 200 admin/superadmin.
 */

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

function asBool(v: number | boolean): boolean {
  if (typeof v === "boolean") return v;
  return v === 1 || (v as unknown as boolean) === true;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }

  const url = new URL(req.url);
  const search = (url.searchParams.get("q") || "").trim();
  const includeInactive =
    url.searchParams.get("all") === "1" || url.searchParams.get("active") === "0"
      ? true
      : false;
  const limitRaw = Number(url.searchParams.get("limit") || DEFAULT_LIMIT);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(MAX_LIMIT, Math.floor(limitRaw))
      : DEFAULT_LIMIT;

  await ensureMigrated();
  type Row = {
    id: number;
    email: string;
    subscribed_at: string | null;
    active: number | boolean;
  };
  let rows: Row[];
  if (search) {
    const r = (await pgMany(
      `SELECT id, email, subscribed_at, active
         FROM newsletter_subscribers
        WHERE LOWER(email) LIKE $1
          ${includeInactive ? "" : "AND active = 1"}
        ORDER BY subscribed_at DESC, id DESC
        LIMIT $2`,
      [`%${search.toLowerCase()}%`, limit]
    )) as Row[] | null;
    rows = r ?? [];
  } else {
    const r = (await pgMany(
      `SELECT id, email, subscribed_at, active
         FROM newsletter_subscribers
        ${includeInactive ? "" : "WHERE active = 1"}
        ORDER BY subscribed_at DESC, id DESC
        LIMIT $1`,
      [limit]
    )) as Row[] | null;
    rows = r ?? [];
  }

  return NextResponse.json({
    subscribers: rows.map((r) => ({
      id: r.id,
      email: r.email,
      subscribedAt: r.subscribed_at,
      active: asBool(r.active),
    })),
    count: rows.length,
    includeInactive,
  });
}
