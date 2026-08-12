#!/usr/bin/env node
/**
 * export-postgres.mjs - full-table JSON backup of the live Postgres.
 *
 * Mirrors the pre-cutover scripts/export-sqlite.mjs pattern for the
 * Postgres-first runtime. Walks every public-schema table and writes
 * a JSON snapshot to data/backups/postgres-YYYY-MM-DD.json.
 *
 * Run: node scripts/export-postgres.mjs
 *
 * Read-only - no writes to Postgres. Buyer-derived data lands under
 * data/backups/ which is gitignored ("Never commit buyer-derived
 * data"). For a full-fidelity logical dump (schema + sequences),
 * follow the pg_dump runbook in OPERATOR.md instead - this script is
 * the lightweight, dependency-free snapshot the operator can run from
 * any machine with the repo + DATABASE_URL.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function todayStamp() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found in env or .env.local. Nothing to back up.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("supabase.com") || url.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  const tablesRes = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  const tables = tablesRes.rows.map((r) => r.table_name);
  if (tables.length === 0) {
    console.error("No public tables found. Aborting.");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "data", "backups");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `postgres-${todayStamp()}.json`);

  const snapshot = {
    generated_at: new Date().toISOString(),
    source: "live Postgres (" + url.replace(/\/\/[^@]+@/, "//***@") + ")",
    tables: {},
  };
  let totalRows = 0;
  for (const t of tables) {
    const res = await pool.query(`SELECT * FROM "${t}"`);
    snapshot.tables[t] = { present: true, rows: res.rows };
    totalRows += res.rows.length;
    console.log(`  ${t.padEnd(24)} rows=${res.rows.length}`);
  }

  // Self-verify: the snapshot must parse and carry the row counts we saw.
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  const written = fs.statSync(outPath).size;
  const reread = JSON.parse(fs.readFileSync(outPath, "utf8"));
  let rereadRows = 0;
  for (const t of tables) rereadRows += reread.tables[t]?.rows?.length ?? 0;
  if (rereadRows !== totalRows) {
    console.error(`VERIFY FAIL: wrote ${totalRows} rows, re-read ${rereadRows}`);
    process.exit(1);
  }

  console.log("");
  console.log(`Wrote ${outPath} (${written} bytes)`);
  console.log(`Tables: ${tables.length}, rows: ${totalRows}`);
  console.log("Verified: snapshot re-read and row counts match.");
} finally {
  await pool.end();
}
