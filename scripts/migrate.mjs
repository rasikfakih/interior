#!/usr/bin/env node
/**
 * scripts/migrate.mjs - Supabase-only migration runner.
 *
 * Studio OS v2.0 uses Supabase (Postgres) as the single database.
 * There is no SQLite fallback. This script:
 *
 *   1. Reads DATABASE_URL from .env.local (or the process env).
 *   2. Applies supabase-bootstrap.sql statement by statement with a
 *      dependency-retry loop (FK references may appear before the
 *      referenced table's CREATE, so statements are re-passed until
 *      the graph converges). All CREATEs are IF NOT EXISTS and all
 *      ALTERs are ADD COLUMN IF NOT EXISTS, so re-runs are safe.
 *   3. Seeds a default tenant (slug "studio") when tenants is empty.
 *   4. Seeds a default admin user (admin@etihadinteriors.com /
 *      admin123, the ADMIN_PASSWORD documented in .env.local.example)
 *      only when users is empty, so existing credentials are kept.
 *   5. Seeds the four freemium plans via seed-plans.mjs so billing
 *      gates have limits to read.
 *
 * Run from repo root:
 *   node scripts/migrate.mjs
 *
 * Invoked by `npm install` (postinstall). Re-runnable and safe to run
 * repeatedly.
 */
import fs from "fs";
import path from "path";
import url from "url";
import pg from "pg";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Load .env.local so the script works without shelling the env around.
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
    "DATABASE_URL is not set. Studio OS v2.0 is Supabase-only; " +
      "provide DATABASE_URL in .env.local or the environment."
  );
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes("supabase.com") || dbUrl.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
  max: 1,
});

let allOk = true;

/**
 * Split DDL into statements. Tracks dollar-quoted blocks (the one
 * `DO $$ ... $$;` realtime publication block) so their internal
 * semicolons are not treated as statement terminators.
 */
function countDollars(line) {
  const m = line.match(/\$\$/g);
  return m ? m.length : 0;
}

function splitStatements(sql) {
  const stmts = [];
  let cur = "";
  let inDollar = false;
  const lines = sql.split(/\r?\n/);
  for (const line of lines) {
    cur += line + "\n";
    const n = countDollars(line);
    if (n > 0) {
      if (inDollar) {
        // Inside a dollar-quoted block: an odd count closes it.
        if (n % 2 === 1) inDollar = false;
      } else if (n % 2 === 1) {
        // Outside: an odd count opens a block that stays open.
        inDollar = true;
      }
    }
    if (!inDollar && /;\s*$/.test(line)) {
      const s = cur.trim();
      if (s) stmts.push(s);
      cur = "";
    }
  }
  const rest = cur.trim();
  if (rest) stmts.push(rest);
  return stmts;
}

function isIdempotentOk(e) {
  const msg = String(e?.message || "");
  return /already exists|duplicate key/i.test(msg);
}

async function main() {
  console.log("Supabase migration start");

  // 1. Full bootstrap DDL, statement by statement with retry passes.
  const ddlPath = path.join(repoRoot, "supabase-bootstrap.sql");
  const ddl = fs.readFileSync(ddlPath, "utf8");
  const statements = splitStatements(ddl);
  const remaining = new Map();
  statements.forEach((s, i) => remaining.set(i, s));

  let applied = 0;
  let skips = 0;
  for (let pass = 1; pass <= 12 && remaining.size > 0; pass++) {
    let progressed = false;
    for (const [i, s] of remaining) {
      try {
        await pool.query(s);
        remaining.delete(i);
        applied++;
        progressed = true;
      } catch (e) {
        if (isIdempotentOk(e)) {
          remaining.delete(i);
          skips++;
          progressed = true;
        }
      }
    }
    if (!progressed) break;
  }
  console.log(`+ bootstrap DDL: ${applied} applied, ${skips} already in place`);
  if (remaining.size > 0) {
    for (const [i, s] of remaining) {
      console.log(`- statement ${i} failed: ${s.slice(0, 90).replace(/\s+/g, " ")}...`);
      allOk = false;
    }
  }

  // 2. Default tenant when empty (v1 data may already carry one).
  const tenant = await pool.query(
    `SELECT id, slug FROM tenants ORDER BY id LIMIT 1`
  );
  if (tenant.rows.length === 0) {
    try {
      await pool.query(
        `INSERT INTO tenants (slug, studio_name, owner_email, state, plan_id, subscription_status)
         VALUES ($1, $2, $3, 'active', 'free', 'active')
         ON CONFLICT (slug) DO NOTHING`,
        ["studio", "Etihad Interiors", "admin@etihadinteriors.com"]
      );
      console.log("+ default tenant (studio)");
    } catch (e) {
      console.log(`- default tenant: ${e.message}`);
      allOk = false;
    }
  } else {
    console.log(`= tenant present: ${tenant.rows[0].slug} (id ${tenant.rows[0].id})`);
  }

  // 3. Default admin user when users is empty (keeps existing creds).
  const user = await pool.query(`SELECT id FROM users ORDER BY id LIMIT 1`);
  if (user.rows.length === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    try {
      await pool.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, 'admin')
         ON CONFLICT (email) DO NOTHING`,
        ["admin@etihadinteriors.com", hash]
      );
      console.log("+ default admin user (admin@etihadinteriors.com / admin123)");
    } catch (e) {
      console.log(`- default admin user: ${e.message}`);
      allOk = false;
    }
  } else {
    console.log("= users present, keeping existing credentials");
  }

  // 4. Freemium plans.
  try {
    await import("./seed-plans.mjs");
    console.log("+ plans seeded");
  } catch (e) {
    console.log(`- plans seed: ${e.message}`);
    allOk = false;
  }

  const count = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = 'public'`
  );
  console.log(`Supabase migration done (${count.rows[0].c} tables).`);

  if (!allOk) {
    console.log("");
    console.log("WARNING: one or more statements did not apply cleanly.");
    console.log("Check the logs above; re-running is safe.");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
