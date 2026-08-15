#!/usr/bin/env node
/**
 * scripts/seed-plans.mjs
 *
 * Module 10: freemium plan catalog. Inserts or updates the four plans
 * (free / starter / pro / studio) so billing gates have limits to read.
 * Idempotent: existing rows are updated to the values below, so edits
 * here propagate on re-run.
 *
 *   node scripts/seed-plans.mjs
 *
 * Branches at runtime like seed-content.mjs:
 *   - DATABASE_URL set  ->  Postgres
 *   - DATABASE_URL unset ->  SQLite (data/etihad.db)
 */
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// [id, name, usd, inr, project, lead, board, boq, ai, features]
const PLANS = [
  [
    "free",
    "Free",
    0,
    0,
    1,
    25,
    2,
    1,
    20,
    {
      white_label: false,
      custom_domain: false,
      client_subdomain: false,
      portal_approvals: true,
      export_pdf: false,
      social_autopilot: false,
      team_members: 1,
    },
  ],
  [
    "starter",
    "Starter",
    29,
    2499,
    3,
    200,
    10,
    5,
    100,
    {
      white_label: false,
      custom_domain: false,
      client_subdomain: true,
      portal_approvals: true,
      export_pdf: true,
      social_autopilot: true,
      team_members: 2,
    },
  ],
  [
    "pro",
    "Pro",
    99,
    8499,
    15,
    1000,
    50,
    20,
    500,
    {
      white_label: true,
      custom_domain: false,
      client_subdomain: true,
      portal_approvals: true,
      export_pdf: true,
      social_autopilot: true,
      team_members: 5,
    },
  ],
  [
    "studio",
    "Studio",
    249,
    19999,
    -1,
    -1,
    -1,
    -1,
    2000,
    {
      white_label: true,
      custom_domain: true,
      client_subdomain: true,
      portal_approvals: true,
      export_pdf: true,
      social_autopilot: true,
      team_members: 15,
    },
  ],
];

function planSqlArgs(p) {
  const [id, name, usd, inr, project, lead, board, boq, ai, features] = p;
  return {
    id,
    name,
    usd,
    inr,
    project,
    lead,
    board,
    boq,
    ai,
    featuresJson: JSON.stringify(features),
  };
}

async function seedPostgres() {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  for (const p of PLANS) {
    const a = planSqlArgs(p);
    await pool.query(
      `INSERT INTO plans
         (id, name, price_usd, price_inr, project_limit, lead_limit,
          board_limit, boq_version_limit, ai_credits_limit,
          features_json, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,TRUE)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         price_usd = EXCLUDED.price_usd,
         price_inr = EXCLUDED.price_inr,
         project_limit = EXCLUDED.project_limit,
         lead_limit = EXCLUDED.lead_limit,
         board_limit = EXCLUDED.board_limit,
         boq_version_limit = EXCLUDED.boq_version_limit,
         ai_credits_limit = EXCLUDED.ai_credits_limit,
         features_json = EXCLUDED.features_json,
         is_active = TRUE`,
      [a.id, a.name, a.usd, a.inr, a.project, a.lead, a.board, a.boq, a.ai, a.featuresJson]
    );
  }
  await pool.end();
  console.log(`plans seeded (postgres): ${PLANS.map((p) => p[0]).join(", ")}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Studio OS v2.0 is Supabase-only; " +
        "set DATABASE_URL in .env.local or the environment."
    );
    process.exit(2);
  }
  await seedPostgres();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
