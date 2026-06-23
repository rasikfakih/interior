#!/usr/bin/env node
/**
 * Apply a theme.distro.json to a tenant.
 *
 * Usage:
 *   node scripts/apply-distro.mjs --tenant=<slug> --file=<theme.distro.json>
 *
 * Validates against docs/theme-distro.schema.md before writing.
 * Idempotent: re-running replaces the row.
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const args = parseArgs(process.argv.slice(2));
const tenantSlug = args.tenant;
const file = args.file || "./data/theme.distro.json";

if (!tenantSlug) {
  console.error("usage: apply-distro.mjs --tenant=<slug> --file=<theme.distro.json>");
  process.exit(1);
}

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");
const FILE = path.isAbsolute(file) ? file : path.join(process.cwd(), file);

if (!fs.existsSync(FILE)) {
  console.error(`file not found: ${FILE}`);
  process.exit(1);
}

const distro = JSON.parse(fs.readFileSync(FILE, "utf8"));
const errors = validate(distro);
if (errors.length > 0) {
  console.error("distro failed validation:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const t = db.prepare("SELECT id FROM tenants WHERE slug = ?").get(tenantSlug);
if (!t) {
  console.error(`tenant not found: ${tenantSlug}`);
  process.exit(1);
}

const existing = db
  .prepare("SELECT id FROM tenant_data WHERE tenant_id = ? AND kind = 'distro'")
  .get(t.id);

if (existing) {
  db.prepare("UPDATE tenant_data SET payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(JSON.stringify(distro), existing.id);
  console.log(`= distro replaced for tenant=${tenantSlug} (id=${t.id})`);
} else {
  db.prepare("INSERT INTO tenant_data (tenant_id, kind, payload) VALUES (?, 'distro', ?)")
    .run(t.id, JSON.stringify(distro));
  console.log(`+ distro applied to tenant=${tenantSlug} (id=${t.id})`);
}

db.prepare("INSERT INTO audit_log (kind, message, meta) VALUES (?, ?, ?)")
  .run("distro.apply", `theme.distro applied to tenant=${tenantSlug}`, JSON.stringify({ file: FILE }));
db.close();

function validate(distro) {
  const errors = [];
  const required = ["brand_name", "palette"];
  for (const k of required) {
    if (distro[k] === undefined) errors.push(`missing required key: ${k}`);
  }
  if (typeof distro.brand_name === "string" && distro.brand_name.length === 0) {
    errors.push("brand_name is empty");
  }
  if (distro.palette) {
    for (const ck of ["ink", "paper", "accent"]) {
      if (!isHex(distro.palette[ck])) errors.push(`palette.${ck} is not a 6-digit hex: ${distro.palette[ck]}`);
    }
    if (distro.palette.muted && !isHex(distro.palette.muted)) {
      errors.push(`palette.muted is not a 6-digit hex: ${distro.palette.muted}`);
    }
    if (distro.palette.ink && distro.palette.paper) {
      const c = contrast(distro.palette.ink, distro.palette.paper);
      if (c < 4.5) errors.push(`palette.ink vs paper fails AA contrast (${c.toFixed(2)}:1)`);
    }
    if (distro.palette.muted && distro.palette.paper) {
      const c = contrast(distro.palette.muted, distro.palette.paper);
      if (c < 4.5) errors.push(`palette.muted vs paper fails AA contrast (${c.toFixed(2)}:1)`);
    }
  }
  if (distro.tier && !["personal", "business"].includes(distro.tier)) {
    errors.push(`tier must be personal|business (got: ${distro.tier})`);
  }
  if (Array.isArray(distro.default_locales)) {
    const allowed = new Set(["en", "hi", "mr"]);
    for (const l of distro.default_locales) {
      if (!allowed.has(l)) errors.push(`default_locales entry not supported: ${l}`);
    }
  } else if (distro.default_locales !== undefined) {
    errors.push("default_locales must be an array");
  }
  for (const urlKey of ["calendly_url", "instagram_url"]) {
    if (distro[urlKey] !== undefined && !/^https:\/\//.test(distro[urlKey])) {
      errors.push(`${urlKey} must be https://`);
    }
  }
  if (typeof distro.hero?.headline === "string" && /[—–]/.test(distro.hero.headline)) {
    errors.push("hero.headline contains em-dash or en-dash (use regular hyphen)");
  }
  if (typeof distro.hero?.subtext === "string" && distro.hero.subtext.split(/\s+/).length > 25) {
    errors.push("hero.subtext exceeds 25 words (cap is 25)");
  }
  for (const forbidden of ["block_overrides", "secret", "hmac_key", "purchase_code", "x-"]) {
    if (dirtyPath(distro, forbidden)) errors.push(`distro contains forbidden prefix: ${forbidden}`);
  }
  return errors;
}

function dirtyPath(obj, key) {
  if (obj === null || obj === undefined) return false;
  if (Array.isArray(obj)) return obj.some((v) => dirtyPath(v, key));
  if (typeof obj !== "object") return false;
  for (const k of Object.keys(obj)) {
    if (k === key || k.startsWith(key + ".") || k.includes("secret")) return true;
    if (k.toLowerCase().includes(key.toLowerCase())) return true;
    if (k.startsWith(key)) return true;
    if (dirtyPath(obj[k], key)) return true;
  }
  return false;
}

function isHex(s) {
  return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);
}

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
