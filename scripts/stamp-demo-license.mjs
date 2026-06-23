#!/usr/bin/env node
/**
 * Stamp a fresh local data/license.json for the studio demo.
 *
 * Idempotent. Re-running rotates installedAt to NOW and recomputes the
 * HMAC over the new body. Run via:
 *
 *   node scripts/stamp-demo-license.mjs
 *
 * Behavior is gated by env:
 *
 *   STAMP_HOST              default: ethinterior.vercel.app
 *   STAMP_TIER              default: business
 *   STAMP_DAYS_VALID        number. default: 365
 *   STAMP_PURCHASE_CODE     default: ELITE-MARCH-2026
 *
 * If a license.json already exists with the SAME host+domain binding and
 * the SAME purchase code, this script is a no-op (so a buyer install that
 * has its own license.json never gets stomped by us).
 *
 * The HMAC key is read from process.env.LICENSE_HMAC_KEY; if absent,
 * the script bails (no fallback write - we never write with a default key).
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";

const DB_LICENSE = path.join(process.cwd(), "data", "license.json");

const HOST = process.env.STAMP_HOST || "ethinterior.vercel.app";
const TIER = process.env.STAMP_TIER === "personal" ? "personal" : "business";
const VALID_DAYS = Number(process.env.STAMP_DAYS_VALID || 365);
const PURCHASE_CODE = process.env.STAMP_PURCHASE_CODE || "ELITE-MARCH-2026";
const HMAC_KEY = process.env.LICENSE_HMAC_KEY || "";

if (!HMAC_KEY) {
  console.error("LICENSE_HMAC_KEY is not set; refusing to stamp with a default key.");
  process.exit(1);
}

if (!fs.existsSync(path.dirname(DB_LICENSE))) {
  fs.mkdirSync(path.dirname(DB_LICENSE), { recursive: true });
}

let existing = null;
try {
  existing = JSON.parse(fs.readFileSync(DB_LICENSE, "utf8"));
} catch {}

if (existing && existing.domain === HOST && existing.purchaseCode !== PURCHASE_CODE) {
  console.log(`= existing license.json for domain=${HOST} preserved (purchase code differs)`);
  process.exit(0);
}

const features = TIER === "business"
  ? { "feature.3d-viewer": true, "feature.multilingual": true, "feature.unlimited-pages": true, "feature.unlimited-media": true, "feature.multi-domain": true }
  : { "feature.3d-viewer": false, "feature.multilingual": false, "feature.unlimited-pages": false, "feature.unlimited-media": false, "feature.multi-domain": false };

const installedAt = new Date().toISOString();
const expiresAt = new Date(Date.now() + VALID_DAYS * 86400e3).toISOString();

const body = [
  PURCHASE_CODE,
  HOST,
  TIER,
  installedAt,
  expiresAt,
  Object.entries(features).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(","),
].join("|");

const signature = crypto.createHmac("sha256", HMAC_KEY).update(body).digest("hex");

const license = {
  purchaseCode: PURCHASE_CODE,
  domain: HOST,
  tier: TIER,
  installedAt,
  expiresAt,
  features,
  signature,
  issuedBy: "stamp-demo-license.mjs",
};

fs.writeFileSync(DB_LICENSE, JSON.stringify(license, null, 2), "utf8");
console.log(`+ stamped license.json domain=${HOST} tier=${TIER} valid=${VALID_DAYS}d signature=${signature.slice(0, 12)}...`);
