#!/usr/bin/env node
/**
 * Pre-cutover SQLite dump.
 *
 * Walks the SQLite db that ships in the repo (data/etihad.db) and
 * every table in src/lib/schema, plus a roster of rows from the
 * legacy tenants/users/projects/journal/testimonials/team/pages/
 * pages_blocks/settings/site_identity/license/hmac_audit/distro
 * table set. Writes a JSON snapshot to data/etihad-backup-YYYY-MM-DD.json.
 *
 * Run: node scripts/export-sqlite.mjs
 *
 * Intentionally read-only - no Postgres calls. This is the insurance
 * step before Phase 1 of v1.1.2 promotes Postgres-only runtime.
 *
 * After Phase 1 the runtime reads/writes Postgres; this script can
 * also be run against a freshly-pulled SQLite file if a rollback is
 * needed (the script doesn't care, it just reads what it finds).
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const SOURCE = path.join(process.cwd(), 'data', 'etihad.db');
const OUT_DIR = path.join(process.cwd(), 'data');

const TABLES = [
  'users',
  'tenants',
  'tenant_data',
  'projects',
  'journal',
  'testimonials',
  'team',
  'pages',
  'pages_blocks',
  'settings',
  'site_identity',
  'media',
  'license',
  'hmac_audit',
  'distro',
];

function todayStamp() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dumpTable(db, table) {
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(table);
  if (!exists) return { present: false, rows: [] };
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  return { present: true, rows };
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`No SQLite at ${SOURCE}. Nothing to back up.`);
    process.exit(1);
  }
  const db = new Database(SOURCE, { readonly: true });
  const stamp = todayStamp();
  const outPath = path.join(OUT_DIR, `etihad-backup-${stamp}.json`);
  const snapshot = {
    generated_at: new Date().toISOString(),
    source: SOURCE,
    sqlite_version: db.prepare('SELECT sqlite_version() AS v').get()?.v ?? null,
    tables: {},
  };
  let totalRows = 0;
  for (const t of TABLES) {
    const r = dumpTable(db, t);
    snapshot.tables[t] = r;
    totalRows += r.rows.length;
    console.log(`  ${t.padEnd(16)} ${r.present ? 'present' : 'missing'}  rows=${r.rows.length}`);
  }
  db.close();
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log('');
  console.log(`Wrote ${outPath}`);
  console.log(`Total rows: ${totalRows}`);
}

main();
