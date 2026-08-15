#!/usr/bin/env node
/**
 * scripts/smoke/db.mjs - Supabase access for the Module 2-10 smoke suite.
 *
 * Studio OS v2.0 is Supabase-only (no SQLite fallback), so the smokes
 * reach the database directly through pg, the same way the runtime does.
 * Run with cwd = repo root: DATABASE_URL is read from .env.local.
 *
 * The smoke suite only touches module tables (leads, client_projects,
 * proposals, materials, vendors, boards, board_items, boq_*,
 * site_logs, snags, portal approvals/comments, ai_generations,
 * social_posts, subscriptions) plus a throwaway second tenant. On the
 * operator's Supabase these tables start empty, so resetForSmokes()
 * wiping them is safe for this suite. It never touches the v1 content
 * tables (projects, pages, settings, media, ...) or the seeded plans.
 */
import fs from "fs";
import path from "path";
import url from "url";
import pg from "pg";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

function loadEnvLocal() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(
    "DATABASE_URL is not set. The smoke suite is Supabase-only; " +
      "provide DATABASE_URL in .env.local or the environment."
  );
  process.exit(2);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes("supabase.com") || dbUrl.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
  max: 2,
});

/** Run a query and return the rows. */
export async function q(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

/** Run a query and return the first row (or null). */
export async function qOne(text, params = []) {
  const rows = await q(text, params);
  return rows[0] ?? null;
}

/** Run a write and return rowCount. */
export async function qRun(text, params = []) {
  const res = await pool.query(text, params);
  return res.rowCount ?? 0;
}

/** Module tables the smoke suite owns; wiped by resetForSmokes. */
const MODULE_TABLES = [
  "subscriptions",
  "social_posts",
  "ai_generations",
  "client_portal_approvals",
  "client_comments",
  "snags",
  "site_logs",
  "boq_items",
  "boq_versions",
  "board_items",
  "boards",
  "materials",
  "vendors",
  "proposals",
  "client_projects",
  "leads",
];

/**
 * Reset to a pristine smoke baseline:
 *  - wipe the module tables (all rows; the operator's DB has none),
 *  - delete throwaway test tenants (id 2 / slug starting with "other"),
 *  - return tenant 1 to the free plan with clean credits + hostnames.
 * Never touches plans, users, or the v1 content tables.
 */
export async function resetForSmokes() {
  for (const t of MODULE_TABLES) {
    await qRun(`DELETE FROM ${t}`);
  }
  await qRun(
    `DELETE FROM tenants WHERE id <> 1 OR slug LIKE 'other%' OR slug LIKE '%other%'`
  );
  await qRun(
    `UPDATE tenants SET
       plan_id = 'free',
       subscription_status = 'trialing',
       subscription_id = NULL,
       customer_id = NULL,
       ai_credits = 100,
       ai_credits_used = 0,
       client_subdomain = NULL,
       custom_domain = NULL,
       billing_cycle = 'monthly',
       plan_started_at = NULL,
       plan_ends_at = NULL
     WHERE id = 1`
  );
}

/** Put tenant 1 on a plan (used to lift gates for modules 2-9). */
export async function setTenantPlan(planId) {
  await qRun(
    `UPDATE tenants SET plan_id = $1, subscription_status = 'active' WHERE id = 1`,
    [planId]
  );
}

/** Ensure the throwaway "other" tenant (id 2) exists for cross-tenant checks. */
export async function ensureTenant2(slug = "other") {
  await qRun(
    `INSERT INTO tenants (id, slug, studio_name, domain, state)
     VALUES (2, $1, 'Other Studio', 'other.local', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [slug]
  );
}
