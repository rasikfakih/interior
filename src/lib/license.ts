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

function readLicenseFile(): License | null {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;
    const raw = fs.readFileSync(LICENSE_FILE, "utf8");
    const parsed = JSON.parse(raw) as License;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Durable license store. Postgres `license_doc` (singleton row id=1)
 * is canonical: stamp-advance and re-issue persist on serverless hosts
 * where the deployed bundle is read-only. The legacy
 * data/license.json remains (a) a localhost authoring surface and
 * (b) a first-read import source, so a build-time stamped file
 * migrates into the DB automatically on the first read. A DB failure
 * degrades to the file rather than taking the license down.
 */
export async function readLicense(): Promise<License | null> {
  let fromDb: License | null = null;
  try {
    const { ensureMigrated, pgOne } = await import("@/lib/pg");
    await ensureMigrated();
    const row = await pgOne<{ data: string }>(
      "SELECT data FROM license_doc WHERE id = 1"
    );
    if (row && typeof row.data === "string" && row.data) {
      fromDb = JSON.parse(row.data) as License;
    }
  } catch (err) {
    console.error(
      "[license] DB read failed, falling back to file:",
      (err as Error)?.message ?? err
    );
  }
  if (fromDb) return fromDb;

  const fileLicense = readLicenseFile();
  if (fileLicense) {
    // One-time migration: seed the durable store from the legacy file
    // so advance / re-issue persist from here on. Best-effort; a
    // failed import never masks the file license.
    try {
      await writeLicense(fileLicense);
    } catch (err) {
      console.error(
        "[license] DB import from file failed:",
        (err as Error)?.message ?? err
      );
    }
  }
  return fileLicense;
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
  const license = await readLicense();
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

export async function writeLicense(license: License) {
  const { ensureMigrated, pgQuery } = await import("@/lib/pg");
  await ensureMigrated();
  await pgQuery(
    `INSERT INTO license_doc (id, data, updated_at)
     VALUES (1, $1, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(license)]
  );
  // Best-effort file mirror keeps localhost tooling (and humans
  // inspecting data/) in sync. Serverless read-only mounts throw;
  // the DB write above is the source of truth there, so swallow.
  try {
    fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(license, null, 2), "utf8");
  } catch {
    // ignore - DB is canonical on read-only hosts
  }
}

export async function appendAudit(
  kind: string,
  message: string,
  meta?: Record<string, unknown>
) {
  try {
    const { ensureMigrated, pgQuery } = await import("@/lib/pg");
    await ensureMigrated();
    await pgQuery(
      `INSERT INTO audit_log (kind, message, meta)
       VALUES ($1, $2, $3::jsonb)`,
      [kind, message, meta ? JSON.stringify(meta) : null]
    );
  } catch {
    // audit is best-effort - never block the caller
  }
}

export const LICENSE_SERVER_URL = SERVER_URL;
