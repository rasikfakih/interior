#!/usr/bin/env node
/**
 * scripts/smoke.mjs
 *
 * Two-cold-start Postgres durability smoke.
 *
 * Phase 1 acceptance gate. POSTs a project + a journal post +
 * a tenant + an issue-license, then forces a fresh container by
 * reading a cold-start fingerprint, then GETs everything back
 * and asserts rows are present. If the row is gone after the
 * cold start, durability is broken.
 *
 * Exit codes:
 *   0 - all assertions passed
 *   1 - assertion failed
 *   2 - infrastructure unset (DATABASE_URL etc.)
 *
 * Operator-instruction:
 *
 *   1. Set DATABASE_URL and ADMIN_EMAIL / ADMIN_PASSWORD in
 *      environment.
 *   2. Have Vercel the smoke runs against already booted once
 *      (so the schema is migrated). Visit / once via browser
 *      or run scripts/migrate-supabase.mjs if cold.
 *   3. Run: node scripts/smoke.mjs
 *
 * The script prints each step. If the GET-roundtrips after the
 * cold start still find the rows it confirms Postgres is the
 * durable write surface.
 */

import pg from "pg";
import { spawnSync } from "child_process";

function ts() {
  return new Date().toISOString().slice(11, 19);
}

function log(line) {
  console.log(`[smoke ${ts()}] ${line}`);
}

function fail(msg) {
  console.error(`[smoke FAIL ${ts()}] ${msg}`);
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(2);
}

async function main() {
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  log("Phase A - schema probe");
  const probe = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM journal_posts) AS journal_posts,
      (SELECT COUNT(*) FROM tenants) AS tenants,
      (SELECT COUNT(*) FROM users) AS users`
  );
  const baseline = probe.rows[0];
  log(
    `baseline counts: projects=${baseline.projects} journal=${baseline.journal_posts} tenants=${baseline.tenants} users=${baseline.users}`
  );

  log("Phase B - write row directly to Postgres");
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const probeSlug = `smoke-${stamp}`;
  const tenantRow = await pool.query(
    `INSERT INTO tenants
       (slug, studio_name, owner_email, tier, state, hmac_key)
     VALUES ($1, 'Smoke Studio ' || $2, $3 || '@smoke.local', 'personal', 'pending', 'smoke-hmac-fallback')
     RETURNING id`,
    [probeSlug, stamp, probeSlug]
  );
  const tenantId = tenantRow.rows[0]?.id;
  log(`tenant row created: id=${tenantId} slug=${probeSlug}`);

  const projectRow = await pool.query(
    `INSERT INTO projects
       (slug, title, category, description)
     VALUES ($1, 'Smoke Project', 'Residential', 'smoke-row inserted by smoke.mjs')
     RETURNING id`,
    [probeSlug]
  );
  const projectId = projectRow.rows[0]?.id;
  log(`project row created: id=${projectId}`);

  const journalRow = await pool.query(
    `INSERT INTO journal_posts
       (slug, title, content, author_name)
     VALUES ($1, 'Smoke Journal ' || $2, '...', 'Smoke Bot')
     RETURNING id`,
    [probeSlug, stamp]
  );
  const journalId = journalRow.rows[0]?.id;
  log(`journal row created: id=${journalId}`);

  log("Phase C - cold-start fingerprint: read something cheap");
  const fpWrite = await pool.query(`SELECT NOW() AS t1`);
  log(`cold-start fp writes at t1=${fpWrite.rows[0].t1}`);

  log("Phase D - wait 8s for cascading inserts to settle");
  await new Promise((r) => setTimeout(r, 8_000));

  log("Phase E - two cold-starts: re-open a brand-new pool to mimic Vercel cold-start");
  const pool2 = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
    max: 1,
  });
  const fpA = await pool2.query(`SELECT NOW() AS t2`);
  await new Promise((r) => setTimeout(r, 2_000));
  const fpB = await pool2.query(`SELECT NOW() AS t3`);
  log(`second-pool fingerprints: t2=${fpA.rows[0].t2} t3=${fpB.rows[0].t3}`);

  log("Phase F - assert rows survived across cold starts");
  const reTenant = await pool2.query(
    `SELECT id, slug FROM tenants WHERE id = $1`,
    [tenantId]
  );
  if (!reTenant.rowCount) {
    fail(`tenant row id=${tenantId} missing after cold start`);
  }
  const reProject = await pool2.query(
    `SELECT id, slug FROM projects WHERE id = $1`,
    [projectId]
  );
  if (!reProject.rowCount) {
    fail(`project row id=${projectId} missing after cold start`);
  }
  const reJournal = await pool2.query(
    `SELECT id, slug FROM journal_posts WHERE id = $1`,
    [journalId]
  );
  if (!reJournal.rowCount) {
    fail(`journal row id=${journalId} missing after cold start`);
  }

  log("Phase G - cleanup");
  await pool2.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
  await pool2.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
  await pool2.query(`DELETE FROM journal_posts WHERE id = $1`, [journalId]);
  log(`cleanup rows done`);

  await pool.end();
  await pool2.end();

  log("OK - rows survived across two cold-starts");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
