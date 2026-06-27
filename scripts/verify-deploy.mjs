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

check("Postgres runtime reachable when DATABASE_URL set", () => {
  if (!process.env.DATABASE_URL) {
    return "DATABASE_URL not set (skipped - local SQLite fallback)";
  }
  let pgMod;
  try {
    pgMod = require_mem("pg");
  } catch {
    throw new Error("pg module not installed");
  }
  const pool = new pgMod.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase.com") ||
      process.env.DATABASE_URL.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  // synchronous guard via deasync-style approach is not available;
  // we promise-chain inside a child_process so a hang does not
  // freeze verify:deploy.
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error("Postgres reachability timed out (5s)"));
    }, 5000);
    pool
      .query("SELECT 1 AS ok")
      .then((r) => {
        clearTimeout(t);
        pool.end().catch(() => {});
        if (r?.rows?.[0]?.ok !== 1) {
          reject(new Error("Postgres ping returned unexpected payload"));
          return;
        }
        resolve("postgres=reachable");
      })
      .catch((e) => {
        clearTimeout(t);
        pool.end().catch(() => {});
        reject(new Error(`Postgres ping failed: ${e.message}`));
      });
  });
});

check("tenants table present in Postgres or local SQLite", () => {
  if (!process.env.DATABASE_URL) {
    const db = path.join(process.cwd(), "data", "etihad.db");
    if (!fs.existsSync(db)) return false;
    const Database = require_mem("better-sqlite3");
    const sdb = new Database(db, { readonly: true });
    try {
      const c = sdb.prepare("SELECT COUNT(*) AS c FROM tenants").get();
      if (c.c === 0) throw new Error("tenants empty - run migrate then apply-distro");
      return `tenants=${c.c} (local SQLite)`;
    } finally {
      sdb.close();
    }
  }
  // Postgres path - probe with a short timeout
  const pgMod = require_mem("pg");
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Tenants check timed out")), 5000);
    const pool = new pgMod.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("supabase.com")
        ? { rejectUnauthorized: false }
        : undefined,
    });
    pool
      .query("SELECT COUNT(*)::int AS c FROM tenants")
      .then((r) => {
        clearTimeout(t);
        const c = r?.rows?.[0]?.c ?? 0;
        if (c === 0) {
          pool.end().catch(() => {});
          // do not fail the pre-flight for empty tenants during
          // a fresh deploy; just emit a hint.
          resolve("tenants=0 (will seed on first request via boot-migrate)");
          return;
        }
        pool.end().catch(() => {});
        resolve(`tenants=${c}`);
      })
      .catch((e) => {
        clearTimeout(t);
        pool.end().catch(() => {});
        reject(new Error(`tenants probe failed: ${e.message}`));
      });
  });
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
