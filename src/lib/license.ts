import "server-only";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { testVerify } from "./license-key.test";

export type LicenseTier = "personal" | "business";

export type License = {
  purchaseCode: string;
  domain: string;
  tier: LicenseTier;
  installedAt: string;
  expiresAt: string | null;
  features: Record<string, boolean>;
  signature: string;
  issuedBy?: string;
};

export type LicenseFeature =
  | "feature.3d-viewer"
  | "feature.multilingual"
  | "feature.unlimited-pages"
  | "feature.unlimited-media"
  | "feature.multi-domain";

const LICENSE_FILE = path.join(process.cwd(), "data", "license.json");
const PUBLIC_KEY = process.env.LICENSE_PUBLIC_KEY || "";
const SERVER_URL = process.env.LICENSE_SERVER_URL || "";

export const TIER_FEATURES: Record<LicenseTier, Record<string, boolean>> = {
  personal: {
    "feature.3d-viewer": false,
    "feature.multilingual": false,
    "feature.unlimited-pages": false,
    "feature.unlimited-media": false,
    "feature.multi-domain": false,
  },
  business: {
    "feature.3d-viewer": true,
    "feature.multilingual": true,
    "feature.unlimited-pages": true,
    "feature.unlimited-media": true,
    "feature.multi-domain": true,
  },
};

export function readLicense(): License | null {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;
    const raw = fs.readFileSync(LICENSE_FILE, "utf8");
    const parsed = JSON.parse(raw) as License;
    return parsed;
  } catch {
    return null;
  }
}

export function isLicenseFresh(license: License | null): boolean {
  if (!license) return false;
  if (!license.signature) return false;
  if (license.expiresAt && Date.parse(license.expiresAt) < Date.now()) return false;
  return true;
}

export function verifySignature(license: License): boolean {
  if (!PUBLIC_KEY) return testVerify(license);
  try {
    const expected = license.signature;
    const body = canonicalBody(license);
    const ok = crypto.verify(
      "RSA-SHA256",
      Buffer.from(body),
      crypto.createPublicKey(PUBLIC_KEY),
      Buffer.from(expected, "base64")
    );
    return ok;
  } catch {
    return false;
  }
}

function canonicalBody(l: License) {
  return `${l.purchaseCode}|${l.domain}|${l.tier}|${l.installedAt}|${l.expiresAt ?? "null"}|${Object.entries(l.features)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",")}`;
}

const DOMAIN_ALIASES = new Set(["localhost", "127.0.0.1"]);
function currentDomain(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  try {
    const url = new URL(env);
    return url.host.toLowerCase();
  } catch {
    return "";
  }
}

function matchesDomain(allowed: string, current: string): boolean {
  if (!allowed) return false;
  const a = allowed.toLowerCase().trim();
  const c = current.toLowerCase().trim();
  if (DOMAIN_ALIASES.has(c)) return Boolean(PUBLIC_KEY);
  if (!c) return false;
  if (a === c) return true;
  if (a.startsWith("*.") && c.endsWith(a.slice(1))) return true;
  return false;
}

export type LicenseCheckResult =
  | { ok: true; license: License }
  | { ok: false; reason: "missing" | "expired" | "domain-mismatch" | "tampered" | "no-signature" };

export async function checkLicense(): Promise<LicenseCheckResult> {
  const license = readLicense();
  if (!license) return { ok: false, reason: "missing" };
  if (!license.signature) return { ok: false, reason: "no-signature" };
  if (!isLicenseFresh(license)) return { ok: false, reason: "expired" };
  if (!verifySignature(license)) return { ok: false, reason: "tampered" };
  const cd = currentDomain();
  if (cd && !matchesDomain(license.domain, cd)) {
    return { ok: false, reason: "domain-mismatch" };
  }
  return { ok: true, license };
}

export function hasFeature(license: License | null, feature: string): boolean {
  if (!license) return false;
  return Boolean((license.features || {})[feature]);
}

export async function assertLicense(opts?: {
  feature?: LicenseFeature;
  fallback?: "mutate" | "admin" | "read-public";
}): Promise<LicenseCheckResult> {
  const check = await checkLicense();
  if (!check.ok) return check;
  if (opts?.feature && !hasFeature(check.license, opts.feature)) {
    return check;
  }
  return check;
}

export function writeLicense(license: License) {
  fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true });
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(license, null, 2), "utf8");
}

export function appendAudit(
  kind: string,
  message: string,
  meta?: Record<string, any>
) {
  try {
    const Database = require("better-sqlite3");
    const DB_PATH = path.join(process.cwd(), "data", "etihad.db");
    const sqlite = new Database(DB_PATH);
    sqlite
      .prepare(
        `INSERT INTO audit_log (kind, message, meta) VALUES (?, ?, ?)`
      )
      .run(kind, message, meta ? JSON.stringify(meta) : null);
    sqlite.close();
  } catch {}
}

export const LICENSE_SERVER_URL = SERVER_URL;
