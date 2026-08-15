#!/usr/bin/env node
/**
 * scripts/smoke/run-all.mjs - run the Module 2-10 smoke suite against
 * the Supabase backend.
 *
 * Requirements:
 *   - A dev/prod server running on BASE_URL (default http://localhost:3000)
 *     with .env.local pointing at Supabase (DATABASE_URL set).
 *   - cwd = repo root.
 *
 * Sequencing:
 *   - Modules 2-9 run with tenant 1 on the starter plan so the BOQ
 *     smoke can create two versions (free caps boq_version_limit at 1).
 *   - Module 10 runs on the free baseline: it tests free limits, the
 *     upgrade ladder (starter -> pro -> studio), and resets itself.
 *   - The state is reset to a pristine baseline before every module
 *     and once more at the end (tenant 1 back on free, module tables
 *     empty), so re-runs are safe and the operator's real content
 *     tables are never touched.
 *
 * Run: npm run smoke:modules
 */
import { spawn } from "node:child_process";
import path from "node:path";
import url from "node:url";
import { resetForSmokes, setTenantPlan } from "./db.mjs";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function serverUp() {
  try {
    const res = await fetch(`${BASE}/api/auth/csrf`);
    return res.status === 200;
  } catch {
    return false;
  }
}

function runModule(n) {
  const file = path.join(__dirname, `module-${String(n).padStart(2, "0")}.mjs`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], {
      cwd: path.resolve(__dirname, "..", ".."),
      stdio: "inherit",
      env: { ...process.env, BASE_URL: BASE },
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      console.error(`failed to spawn module ${n}:`, err.message);
      resolve(1);
    });
  });
}

async function main() {
  console.log(`Supabase smoke suite -> ${BASE}`);
  if (!(await serverUp())) {
    console.error(
      `No server answering at ${BASE}. Start the dev server (Supabase mode) first:\n  npm run dev`
    );
    process.exit(2);
  }
  console.log("server reachable\n");

  let failed = [];

  // Modules 2-9: pristine state + starter plan (BOQ needs version_limit >= 2).
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9]) {
    await resetForSmokes();
    await setTenantPlan("starter");
    console.log(`\n=== Module ${n} ===`);
    const code = await runModule(n);
    if (code !== 0) failed.push(n);
  }

  // Module 10: free baseline (it also resets itself at start/end).
  await resetForSmokes();
  console.log(`\n=== Module 10 ===`);
  const code10 = await runModule(10);
  if (code10 !== 0) failed.push(10);

  // Final pristine state: tenant 1 back on free, module tables empty.
  await resetForSmokes();
  const tenant = await (await import("./db.mjs")).qOne(
    "SELECT plan_id, subscription_status, ai_credits_used FROM tenants WHERE id = 1"
  );
  console.log("\nfinal state: tenant 1 plan:", tenant?.plan_id, "| credits used:", tenant?.ai_credits_used);

  if (failed.length > 0) {
    console.error(`\nSUITE FAILED: modules ${failed.join(", ")}`);
    process.exit(1);
  }
  console.log("\nSUITE PASS: modules 2-10 all green on Supabase");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
