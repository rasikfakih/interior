#!/usr/bin/env node
/**
 * scripts/rerun-journal-covers.mjs
 *
 * One-shot data fix: the journal_posts seed landed with
 * cover_image values pointing at local-mode uploads
 * (`/api/uploads/local?path=image%2Fmr0fseke-...png`). Those
 * paths live in /tmp on Vercel and are reaped on cold start,
 * so live URL probes on any journal entry that uses one are
 * 5xx.
 *
 * Swap every journal_posts.cover_image whose value starts
 * with `/api/uploads/local` to a stable remote Unsplash URL
 * tied to that journal entry's slug. Idempotent: only writes
 * rows whose cover_image still starts with `/api/uploads/local`.
 *
 * Run from a host that has DATABASE_URL set:
 *   DATABASE_URL=postgres://... node scripts/rerun-journal-covers.mjs
 */

const pg = (await import("pg")).default;
const Database = (await import("better-sqlite3")).default;
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
  }
}
loadEnvLocal();

const BASE_BY_SLUG = {
  "why-the-kitchen-table":
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
  "material-honesty":
    "https://images.unsplash.com/photo-1565538810643-b5bdb714032a",
  "spatial-design-vs-interior":
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d",
};
const FALLBACK =
  "https://images.unsplash.com/photo-1565538810643-b5bdb714032a";

function imgURL(slug, w = 1600) {
  const base = BASE_BY_SLUG[slug] || FALLBACK;
  return `${base}?q=80&w=${w}&auto=format&fit=crop`;
}

async function run() {
  if (process.env.DATABASE_URL) {
    console.log("rerun-journal-covers -> Postgres");
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    const all = await pool.query(
      `SELECT id, slug FROM journal_posts WHERE cover_image LIKE '/api/uploads/%'`
    );
    for (const row of all.rows) {
      const before = `/api/uploads/local?path=image%2Fmr0fseke-...`;
      const after = imgURL(row.slug);
      const r = await pool.query(
        `UPDATE journal_posts SET cover_image = $2 WHERE id = $1 AND cover_image LIKE '/api/uploads/%'`,
        [row.id, after]
      );
      console.log(
        `  ${row.slug}: ${r.rowCount} row(s) updated (${before} -> ${after.slice(0, 80)}...)`
      );
    }
    await pool.end();
  } else {
    console.log("rerun-journal-covers -> SQLite (data/etihad.db)");
    const dbPath =
      process.env.SQLITE_PATH || path.join(repoRoot, "data", "etihad.db");
    if (!fs.existsSync(dbPath)) {
      console.error("SQLite database not found at " + dbPath);
      process.exit(2);
    }
    const db = new Database(dbPath);
    const stmt = db.prepare(
      `UPDATE journal_posts SET cover_image = ? WHERE id = ? AND cover_image LIKE '/api/uploads/%'`
    );
    const all = db
      .prepare(`SELECT id, slug FROM journal_posts WHERE cover_image LIKE '/api/uploads/%'`)
      .all();
    for (const row of all) {
      const after = imgURL(row.slug);
      const info = stmt.run(after, row.id);
      console.log(`  ${row.slug}: ${info.changes} row(s) updated`);
    }
    db.close();
  }
  console.log("-- done");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
