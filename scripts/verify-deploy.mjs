#!/usr/bin/env node
/**
 * verify-deploy.mjs - pre-flight checks for Vercel deploy.
 * Pure Node so it runs on Windows + macOS + Linux.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { createRequire } from "module";

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
    const r = spawnSync("node", ["scripts/seed-pages.mjs"], { cwd: process.cwd(), stdio: "inherit" });
    if (r.status !== 0) throw new Error("seed failed");
  }
  return true;
});

check("tenants table present with at least one row", () => {
  const Database = require_mem("better-sqlite3");
  const db = new Database(path.join(process.cwd(), "data", "etihad.db"), { readonly: true });
  try {
    const c = db.prepare("SELECT COUNT(*) AS c FROM tenants").get();
    if (c.c === 0) throw new Error("tenants empty - run migrate then apply-distro");
    return `tenants=${c.c}`;
  } finally {
    db.close();
  }
});

function require_mem(name) {
  // Inline CommonJS require because this file is ESM. Used only for better-sqlite3.
  const mod = createRequire(import.meta.url);
  return mod(name);
}

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

check("CONTEXT.md present (session continuity)", () =>
  fs.existsSync(path.join(process.cwd(), "docs", "CONTEXT.md"))
);

check("theme.distro.json present", () =>
  fs.existsSync(path.join(process.cwd(), "data", "theme.distro.json"))
);

check("studio-brand.json present (white-label override)", () =>
  fs.existsSync(path.join(process.cwd(), "data", "studio-brand.json"))
);

check("operator console page present", () =>
  fs.existsSync(path.join(process.cwd(), "src", "app", "superadmin", "page.tsx"))
);

check("envato webhook present", () =>
  fs.existsSync(path.join(process.cwd(), "src", "app", "api", "envato", "webhook", "route.ts"))
);

check("models seed (reception-room.glb) present", () => {
  const f = path.join(process.cwd(), "public", "models", "seed", "reception-room.glb");
  if (!fs.existsSync(f)) return false;
  const size = fs.statSync(f).size;
  if (size < 1000) throw new Error(`stub file (${size} bytes); real model needs >1 KB`);
  return `${(size / 1024).toFixed(1)} KB`;
});

check("demo JPGs (>= 8 in public/demo)", () => {
  const dir = path.join(process.cwd(), "public", "demo");
  if (!fs.existsSync(dir)) throw new Error("public/demo missing");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg"));
  if (files.length < 8) throw new Error(`only ${files.length} JPGs found; need >= 8`);
  return `${files.length} files`;
});

check("upload JPGs present for block-registry defaults", () => {
  const dir = path.join(process.cwd(), "public", "uploads", "images");
  const required = [
    "hero.jpg", "services-1.jpg", "services-2.jpg", "services-3.jpg", "services-4.jpg",
    "grid-1.jpg", "grid-2.jpg", "grid-3.jpg", "placeholder.jpg",
  ];
  const missing = required.filter((f) => !fs.existsSync(path.join(dir, f)));
  if (missing.length > 0) throw new Error(`missing: ${missing.join(", ")}`);
  return `${required.length} files`;
});

check("stamp-demo-license script present", () =>
  fs.existsSync(path.join(process.cwd(), "scripts", "stamp-demo-license.mjs"))
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
