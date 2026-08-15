import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgMany, pgOne } from "@/lib/pg";
import { checkPlan, planBlockedBody } from "@/lib/billing";
import { resolveAdminTenantId } from "@/lib/theme";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  normalizeLeadSource,
  parseBudgetLakhs,
} from "@/lib/leads";

type LeadRow = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  budget: string | null;
  status: string;
  score: number | string;
  lost_reason: string | null;
  last_status_change_at: string | null;
  created_at: string | null;
  client_project_id: string | null;
};

function rowToDto(row: LeadRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    budget: row.budget,
    status: row.status,
    score: Number(row.score ?? 0),
    lostReason: row.lost_reason,
    lastStatusChangeAt: row.last_status_change_at,
    createdAt: row.created_at,
    // Module 3: set when a client_projects row links this lead, so the
    // board card / table can offer "Create project" or "Proposal".
    clientProjectId: row.client_project_id ?? null,
  };
}

function emptyStats(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of LEAD_STATUSES) out[s] = 0;
  return out;
}

/**
 * GET /api/leads
 *
 * Admin-gated lead inbox read. Supports status / source filters and a
 * name/phone/email substring search. Returns the matching rows plus a
 * status funnel (`stats`) and per-status budget totals (`budgetStats`)
 * computed across the whole table so the board columns and stat cards
 * stay correct under any filter. Budget is free text ("15-20L"), so
 * SUM() cannot run in SQL; amounts are parsed to lakhs in JS.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  await ensureMigrated();

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? "";
  const source = sp.get("source") ?? "";
  const q = (sp.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 200) || 200, 1), 500);

  // Columns are qualified with l. because of the client_projects
  // join (both tables have a `name` column).
  const where: string[] = [];
  const args: unknown[] = [];
  if (status && LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
    where.push(`l.status = $${args.length + 1}`);
    args.push(status);
  }
  if (source && LEAD_SOURCES.includes(source as (typeof LEAD_SOURCES)[number])) {
    where.push(`l.source = $${args.length + 1}`);
    args.push(source);
  }
  if (q) {
    // One distinct param per occurrence: the SQLite fallback shim
    // rewrites each $N to its own `?`, so a reused placeholder would
    // bind too few values. Postgres accepts both shapes.
    const pat = `%${q}%`;
    const n = args.length + 1;
    where.push(
      `(LOWER(l.name) LIKE LOWER($${n})` +
        ` OR LOWER(COALESCE(l.phone, '')) LIKE LOWER($${n + 1})` +
        ` OR LOWER(COALESCE(l.email, '')) LIKE LOWER($${n + 2}))`
    );
    args.push(pat, pat, pat);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await pgMany<LeadRow>(
    `SELECT l.*, cp.id AS client_project_id
     FROM leads l
     LEFT JOIN client_projects cp ON cp.lead_id = l.id
     ${whereSql}
     ORDER BY l.created_at DESC, l.id DESC LIMIT $${args.length + 1}`,
    [...args, limit]
  );

  // Funnel counts + budget totals across the whole table (dialect
  // neutral: COUNT(*) returns bigint-as-string on pg, Number() it).
  const all = await pgMany<{ status: string; budget: string | null }>(
    `SELECT status, budget FROM leads`
  );
  const stats = emptyStats();
  const budgetStats = emptyStats();
  for (const r of all) {
    if (r.status in stats) stats[r.status] += 1;
    if (r.budget) {
      const lakhs = parseBudgetLakhs(r.budget);
      if (lakhs > 0) budgetStats[r.status] = (budgetStats[r.status] ?? 0) + lakhs;
    }
  }
  for (const s of LEAD_STATUSES) {
    budgetStats[s] = Math.round((budgetStats[s] ?? 0) * 10) / 10;
  }

  return NextResponse.json({ leads: rows.map(rowToDto), stats, budgetStats });
}

/**
 * POST /api/leads
 *
 * Admin-gated create from the Add Lead modal. `source` defaults to
 * manual; website leads are written automatically by /api/forms/submit.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  // Module 10: plan gate on the leads limit (leads are not tenant
  // scoped; the single studio's whole inbox counts against the plan).
  const tenantId = await resolveAdminTenantId();
  if (tenantId != null) {
    const gateRes = await checkPlan(tenantId, "leads");
    if (!gateRes.allowed) {
      return NextResponse.json(planBlockedBody(gateRes), { status: gateRes.status });
    }
  }
  try {
    const d = await req.json();
    const name = String(d.name ?? "").trim().slice(0, 255);
    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    const source = normalizeLeadSource(d.source) ?? "manual";
    const inserted = await pgOne<LeadRow>(
      `INSERT INTO leads (name, phone, email, source, budget, last_status_change_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        d.phone ? String(d.phone).trim().slice(0, 64) : null,
        d.email ? String(d.email).trim().slice(0, 255) : null,
        source,
        d.budget ? String(d.budget).trim().slice(0, 128) : null,
        new Date().toISOString(),
      ]
    );
    if (!inserted) {
      return NextResponse.json({ error: "Insert failed" }, { status: 400 });
    }
    return NextResponse.json({ success: true, item: rowToDto(inserted) });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Insert failed" },
      { status: 400 }
    );
  }
}
