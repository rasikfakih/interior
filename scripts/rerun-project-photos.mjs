#!/usr/bin/env node
/**
 * scripts/rerun-project-photos.mjs
 *
 * One-shot data fix: the original seed-content run saved the SAME
 * photo URL on before_image and after_image for every demo
 * project, which makes the BeforeAfterSlider render two identical
 * panes (the slider reveal is invisible).
 *
 * This script restores the differentiated pairs that the seed
 * expects:
 *   casa-mira      before = PHOTO_BEFORE_BASE
 *                  after  = PHOTO_AFTER_BASE
 *   nalanda-house  before = PHOTO_AFTER_BASE
 *                  after  = PHOTO_DIFFERENT_BASE
 *   salt-flats     before = PHOTO_DIFFERENT_BASE
 *                  after  = PHOTO_BEFORE_BASE
 *
 * Skips execution when DATABASE_URL is unset (so local SQLite
 * developers still run on whatever seed-content wants). Idempotent:
 * each UPDATE is by slug, only updates rows whose before_image
 * or after_image differs from the new value.
 *
 * Run:
 *   DATABASE_URL=postgres://... node scripts/rerun-project-photos.mjs
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

const PHOTO_BEFORE_BASE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9";
const PHOTO_AFTER_BASE =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d";
const PHOTO_DIFFERENT_BASE =
  "https://images.unsplash.com/photo-1565538810643-b5bdb714032a";

function img(base, w = 1600) {
  return `${base}?q=80&w=${w}&auto=format&fit=crop`;
}

const PROJECTS = [
  { slug: "casa-mira",      before: img(PHOTO_BEFORE_BASE),    after: img(PHOTO_AFTER_BASE) },
  { slug: "nalanda-house",  before: img(PHOTO_AFTER_BASE),     after: img(PHOTO_DIFFERENT_BASE) },
  { slug: "salt-flats",     before: img(PHOTO_DIFFERENT_BASE), after: img(PHOTO_BEFORE_BASE) },
];

async function run() {
  if (process.env.DATABASE_URL) {
    console.log("rerun-project-photos -> Postgres");
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    for (const p of PROJECTS) {
      const r = await pool.query(
        `UPDATE projects
            SET before_image = $2,
                after_image  = $3
          WHERE slug = $1
            AND (before_image IS DISTINCT FROM $2
              OR after_image  IS DISTINCT FROM $3)`,
        [p.slug, p.before, p.after]
      );
      console.log(`  ${p.slug}: ${r.rowCount} row(s) updated`);
    }
    await pool.end();
  } else {
    console.log("rerun-project-photos -> SQLite (data/etihad.db)");
    const dbPath =
      process.env.SQLITE_PATH || path.join(repoRoot, "data", "etihad.db");
    if (!fs.existsSync(dbPath)) {
      console.error("SQLite database not found at " + dbPath);
      process.exit(2);
    }
    const db = new Database(dbPath);
    const stmt = db.prepare(
      `UPDATE projects
          SET before_image = ?, after_image = ?
        WHERE slug = ?
          AND (before_image IS NOT ? OR after_image IS NOT ?)`
    );
    for (const p of PROJECTS) {
      const info = stmt.run(p.before, p.after, p.slug, p.before, p.after);
      console.log(`  ${p.slug}: ${info.changes} row(s) updated`);
    }
    db.close();
  }
  console.log("-- done");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
