#!/usr/bin/env node
/**
 * scripts/verify-brand-v190.mjs
 *
 * Post-deploy acceptance probe for the v1.9.0 brand recalibration.
 * Run against the live URL after the v1.9.0 code deploy lands:
 *
 *   node scripts/verify-brand-v190.mjs
 *   BASE_URL=https://ethinterior.vercel.app node scripts/verify-brand-v190.mjs
 *
 * Checks, in order:
 *   1. Display serif is Newsreader (cormorant absent from the page).
 *   2. The recalibrated palette hexes (ink #122a20 / paper #ecece6 /
 *      accent #c0964f / muted #626d66) appear in the served HTML.
 *   3. The live Postgres distro row (when DATABASE_URL is reachable)
 *      matches the recalibrated palette. The theme engine resolves the
 *      distro row BEFORE studio-brand.json, so a stale distro row keeps
 *      serving the old palette even after the code deploy.
 *
 * Plain node, no deps. No emojis, no em-dashes. Exit 0 = fully live.
 */
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const BASE = process.env.BASE_URL || "https://ethinterior.vercel.app";

// Expected recalibrated palette (must match data/studio-brand.json).
const EXPECTED = { ink: "#122a20", paper: "#ecece6", accent: "#c0964f", muted: "#626d66" };

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

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? " - " + detail : ""}`); }
}

async function main() {
  // 1 + 2: served HTML on home + projects.
  for (const [label, p] of [["home", "/"], ["projects", "/projects"]]) {
    let html = "";
    try {
      const r = await fetch(BASE + p);
      html = await r.text();
      check(`${label} HTTP 200`, r.status === 200, `status ${r.status}`);
    } catch (e) {
      check(`${label} fetch`, false, e.message);
      continue;
    }
    check(`${label} uses Newsreader`, html.includes("newsreader") && !html.includes("cormorant"));
    const lower = html.toLowerCase();
    check(
      `${label} recalibrated ink #122a20`,
      lower.includes("#122a20"),
      "old ink #1f3a2d likely still served"
    );
    check(
      `${label} recalibrated paper #ecece6`,
      lower.includes("#ecece6"),
      "old paper #f2efe7 likely still served"
    );
    check(
      `${label} recalibrated accent #c0964f`,
      lower.includes("#c0964f"),
      "old accent #c28b3c likely still served"
    );
    check(
      `${label} recalibrated muted #626d66`,
      lower.includes("#626d66"),
      "old muted #5a6b5f likely still served"
    );
  }

  // 3: live distro row (optional - needs DATABASE_URL).
  if (process.env.DATABASE_URL) {
    try {
      const { default: pg } = await import("pg");
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("supabase.com")
          ? { rejectUnauthorized: false }
          : undefined,
      });
      const d = await pool.query(
        `SELECT tenant_id, updated_at, data FROM tenant_data WHERE kind = 'distro'`
      );
      await pool.end();
      if (d.rows.length === 0) {
        check("live distro row", true, "none - fallback chain (studio-brand.json) applies");
      } else {
        const row = d.rows[0];
        const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
        const p = (data.palette || {}).ink || "";
        const pPaper = (data.palette || {}).paper || "";
        const inkMatch = p.toLowerCase() === EXPECTED.ink;
        const paperMatch = pPaper.toLowerCase() === EXPECTED.paper;
        check(
          "live distro row recalibrated",
          inkMatch && paperMatch,
          `tenant ${row.tenant_id} updated ${row.updated_at} palette ink=${p} paper=${pPaper}; theme engine prefers this over studio-brand.json`
        );
      }
    } catch (e) {
      check("live distro row read", false, e.message);
    }
  } else {
    console.log("SKIP live distro row - DATABASE_URL not set");
  }

  console.log("---");
  console.log(`pass=${pass} fail=${fail}`);
  if (fail === 0) {
    console.log("v1.9.0 brand fully live: Newsreader + recalibrated palette.");
  } else {
    console.log(
      "v1.9.0 brand NOT fully live. If the code deploy has landed and the palette\n" +
        "check still fails, re-apply the distro (operator console /superadmin/theme\n" +
        "or scripts/apply-distro.mjs to the Postgres tenant) with the recalibrated\n" +
        "data/theme.distro.json palette - the distro row overrides studio-brand.json."
    );
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
