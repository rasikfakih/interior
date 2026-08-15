#!/usr/bin/env node
/**
 * scripts/smoke/ci-license.mjs - stamp a CI-valid license file.
 *
 * The admin API is gated by requireAdminSession, which runs a license
 * check (src/lib/license.ts). In CI there is no LICENSE_PUBLIC_KEY, so
 * verification uses the offline HMAC fallback (license-key.test.ts).
 * This script writes data/license.json signed with that fallback key
 * for the domain the server will run on, so every gated endpoint the
 * smoke suite touches passes the license gate.
 *
 * Domain resolution mirrors license.ts currentDomain():
 * NEXT_PUBLIC_SITE_URL || VERCEL_URL || NEXTAUTH_URL, host only.
 * Defaults to localhost:3000 when nothing is set.
 *
 * Run from repo root (after migrate):
 *   node scripts/smoke/ci-license.mjs
 *
 * Optional env:
 *   NEXTAUTH_URL / NEXT_PUBLIC_SITE_URL - bind a different host
 *   LICENSE_HMAC_KEY                     - must match the runtime key
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

// Must match src/lib/license-key.test.ts (the runtime fallback when
// LICENSE_PUBLIC_KEY is unset). Do not set a different LICENSE_HMAC_KEY
// in the workflow unless it matches here.
const HMAC_KEY =
  process.env.LICENSE_HMAC_KEY || "etihad-interiors-license-fallback-2026";

function currentDomain() {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  try {
    return new URL(env).host.toLowerCase();
  } catch {
    return "localhost:3000";
  }
}

function canonicalBody(l) {
  return `${l.purchaseCode}|${l.domain}|${l.tier}|${l.installedAt}|${
    l.expiresAt ?? "null"
  }|${Object.entries(l.features)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",")}`;
}

const domain = currentDomain();

const license = {
  purchaseCode: "ci-smoke",
  domain,
  tier: "business",
  installedAt: new Date().toISOString(),
  expiresAt: null,
  features: {
    "feature.3d-viewer": true,
    "feature.multilingual": true,
    "feature.unlimited-pages": true,
    "feature.unlimited-media": true,
    "feature.multi-domain": true,
  },
};

license.signature = crypto
  .createHmac("sha256", HMAC_KEY)
  .update(canonicalBody(license))
  .digest("hex");

const target = path.join(repoRoot, "data", "license.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(license, null, 2) + "\n", "utf8");
console.log(`CI license stamped: ${target} (domain ${domain})`);
