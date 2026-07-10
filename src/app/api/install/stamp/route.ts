import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { appendAudit } from "@/lib/license";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const LICENSE_FILE = path.join(process.cwd(), "data", "license.json");
const HMAC_KEY_ENV = process.env.LICENSE_HMAC_KEY || "";

type License = {
  purchaseCode: string;
  domain: string;
  tier: "personal" | "business" | string;
  installedAt: string;
  expiresAt: string;
  features: Record<string, boolean>;
  signature: string;
  issuedBy?: string;
};

function readLicense(): License | null {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;
    const raw = fs.readFileSync(LICENSE_FILE, "utf8");
    return JSON.parse(raw) as License;
  } catch {
    return null;
  }
}

function writeLicense(license: License) {
  fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true });
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(license, null, 2), "utf8");
}

function reSign(license: License): License {
  if (!HMAC_KEY_ENV) {
    return { ...license, signature: license.signature };
  }
  const canonicalBody = [
    license.purchaseCode,
    license.domain,
    license.tier,
    license.installedAt,
    license.expiresAt,
    Object.entries(license.features)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(","),
  ].join("|");
  const signature = crypto
    .createHmac("sha256", HMAC_KEY_ENV)
    .update(canonicalBody)
    .digest("hex");
  return { ...license, signature };
}

/**
 * GET /api/install/stamp            -> admin session, returns the
 *                                       current license.json shape
 *                                       with an `available` flag
 *                                       telling the editor whether
 *                                       the env can issue / advance.
 * DELETE /api/install/stamp         -> 405 (preserves the install
 *                                       surface; no operator path)
 * PUT /api/install/stamp            -> admin session. Advance stamp
 *                                       semantics: re-stamp the
 *                                       installedAt forward to
 *                                       `Date.now()` while preserving
 *                                       purchaseCode, domain, tier,
 *                                       features, and expiresAt.
 *                                       Re-signs the HMAC so the next
 *                                       /api/install/stamp POST
 *                                       matches. Audit-log entry.
 *
 * POST is preserved as the original first-install / re-install path
 * from /install/InstallForm. POST remains gated only by LICENSE_HMAC_KEY.
 *
 * The cryptographic HMAC rotation (rotate-hmac) is intentionally NOT
 * reachable from this route. That path stays on /superadmin via
 * /api/admin/license POST + /api/operator/rotate-hmac so a stolen
 * admin session cannot rotate the buyer's HMAC.
 */

export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  const license = readLicense();
  return NextResponse.json({
    license,
    rotatedAt: license?.installedAt ?? null,
    available: Boolean(license),
    canAdvance: Boolean(license),
    canRotate: Boolean(HMAC_KEY_ENV),
  });
}

export async function PUT() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  if (!HMAC_KEY_ENV) {
    return NextResponse.json(
      {
        error: "license_stamp_unavailable",
        detail: "this server has no LICENSE_HMAC_KEY configured",
      },
      { status: 503 }
    );
  }
  const license = readLicense();
  if (!license) {
    return NextResponse.json(
      { error: "no_license_present", detail: "POST /api/install/stamp must run first" },
      { status: 404 }
    );
  }

  const previousInstalledAt = license.installedAt;
  const advanced: License = {
    ...license,
    installedAt: new Date().toISOString(),
    issuedBy: `${license.issuedBy ?? "api-install-route"}|advancing-admin`,
  };
  const signed = reSign(advanced);
  writeLicense(signed);

  await appendAudit(
    "install.stamp_advance",
    `install stamp advanced from ${previousInstalledAt} to ${signed.installedAt}`,
    {
      previousInstalledAt,
      newInstalledAt: signed.installedAt,
      purchaseCode: signed.purchaseCode,
      domain: signed.domain,
      tier: signed.tier,
      role: gate.role,
    }
  );

  return NextResponse.json({ success: true, license: signed });
}
