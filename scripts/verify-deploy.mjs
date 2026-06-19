#!/usr/bin/env node
/**
 * verify-deploy.mjs — pre-flight checks for Vercel deploy.
 * Pure Node so it runs on Windows + macOS + Linux.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const checks = [];

function check(name, fn) {
  try {
    const r = fn();
    checks.push({ name, ok: !!r, detail: r || "" });
  } catch (e) {
    checks.push({ name, ok: false, detail: e.message });
  }
}

check("node version >= 18", () => {
  const v = process.versions.node;
  const major = Number(v.split(".")[0]);
  return major >= 18 ? `node ${v}` : `node ${v} (requires >=18)`;
});

check("node_modules installed", () =>
  fs.existsSync(path.join(process.cwd(), "node_modules"))
);

check(".next build present", () =>
  fs.existsSync(path.join(process.cwd(), ".next"))
);

check("vercel.json declared with framework `nextjs`", () => {
  const v = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")
  );
  if (v.framework !== "nextjs") throw new Error("framework != nextjs");
  return true;
});

check("Demo SQLite seeded", () => {
  const db = path.join(process.cwd(), "data", "etihad.db");
  if (!fs.existsSync(db)) {
    console.log("  ! running seed-pages.mjs to seed DB");
    const r = spawnSync("node", ["scripts/seed-pages.mjs"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    if (r.status !== 0) throw new Error("seed failed");
  }
  return true;
});

check(".env.example present", () =>
  fs.existsSync(path.join(process.cwd(), ".env.example"))
);

check("AGENT_BEST_PRACTICES.md present", () =>
  fs.existsSync(path.join(process.cwd(), "AGENT_BEST_PRACTICES.md"))
);

check("LICENSE.md present", () =>
  fs.existsSync(path.join(process.cwd(), "LICENSE.md"))
);

check("INSTALL.md present", () =>
  fs.existsSync(path.join(process.cwd(), "INSTALL.md"))
);

check("models seed (reception-room.glb) present", () =>
  fs.existsSync(path.join(process.cwd(), "public", "models", "seed", "reception-room.glb"))
);

let exited0 = true;
for (const c of checks) {
  console.log(`[${c.ok ? "OK" : "FAIL"}] ${c.name}${c.detail ? " - " + c.detail : ""}`);
  if (!c.ok) exited0 = false;
}

if (!exited0) {
  console.log("\nPre-flight failed. Fix the items above before deploying.");
  process.exit(1);
}

console.log("\nReady for Vercel deploy.");
console.log("Next: vercel --prod OR click Deploy in the Vercel dashboard.");
