import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import {
  readLicense,
  writeLicense,
  appendAudit,
  type License,
} from "@/lib/license";
import { bump } from "@/lib/revalidate";
import crypto from "crypto";

const HMAC_KEY_ENV = process.env.LICENSE_HMAC_KEY || "";

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
 * License stamp surface.
 *
 * POST /api/install/stamp     -> first install / re-install from the
 *                                /install form. Gated only by
 *                                LICENSE_HMAC_KEY. Writes the signed
 *                                license to the durable Postgres store
 *                                (license_doc) so it persists on
 *                                serverless hosts.
 * GET  /api/install/stamp     -> admin session. Returns the active
 *                                license shape plus availability
 *                                flags. canAdvance is true whenever a
 *                                license exists and LICENSE_HMAC_KEY
 *                                is configured - the store is durable,
 *                                so there is no filesystem gate.
 * PUT  /api/install/stamp     -> admin session. Advance stamp
 *                                semantics: re-stamp installedAt
 *                                forward to `Date.now()` while
 *                                preserving purchaseCode, domain,
 *                                tier, features, and expiresAt.
 *                                Re-signs the HMAC and persists to
 *                                the durable store. Audit-log entry.
 *
 * The cryptographic HMAC rotation (rotate-hmac) is intentionally NOT
 * reachable from this route. That path stays on /superadmin via
 * /api/admin/license POST + /api/operator/rotate-hmac so a stolen
 * admin session cannot rotate the buyer's HMAC.
 */

export async function POST(req: Request) {
  if (!HMAC_KEY_ENV) {
    return NextResponse.json(
      {
        error: "license_stamp_unavailable",
        detail: "this server has no LICENSE_HMAC_KEY configured",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const purchaseCode = (body.purchaseCode || "").toString().trim();
  const domain = (body.domain || "").toString().trim().toLowerCase();
  const tier = body.tier === "personal" ? "personal" : "business";
  const daysValid = Number(body.daysValid || process.env.STAMP_DAYS_VALID || 365);

  if (!purchaseCode || !domain) {
    return NextResponse.json(
      { error: "missing_fields", detail: "purchaseCode and domain required" },
      { status: 400 }
    );
  }

  const features =
    tier === "business"
      ? {
          "feature.3d-viewer": true,
          "feature.multilingual": true,
          "feature.unlimited-pages": true,
          "feature.unlimited-media": true,
          "feature.multi-domain": true,
        }
      : {
          "feature.3d-viewer": false,
          "feature.multilingual": false,
          "feature.unlimited-pages": false,
          "feature.unlimited-media": false,
          "feature.multi-domain": false,
        };

  const installedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + daysValid * 86400e3).toISOString();
  const canonicalBody = [
    purchaseCode,
    domain,
    tier,
    installedAt,
    expiresAt,
    Object.entries(features)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(","),
  ].join("|");

  const signature = crypto
    .createHmac("sha256", HMAC_KEY_ENV)
    .update(canonicalBody)
    .digest("hex");

  const license: License = {
    purchaseCode,
    domain,
    tier,
    installedAt,
    expiresAt,
    features,
    signature,
    issuedBy: "api-install-route",
  };

  try {
    await writeLicense(license);
  } catch (err) {
    return NextResponse.json(
      {
        error: "license_stamp_write_failed",
        detail: `could not persist license: ${(err as Error)?.message ?? err}`,
      },
      { status: 503 }
    );
  }

  await appendAudit(
    "install.first_install",
    `License installed on ${domain}, tier=${tier}`,
    { purchaseCode, domain, tier, role: "install-form" }
  );
  bump({ kind: "install" });

  return NextResponse.json({ ok: true, license });
}

export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  const license = await readLicense();
  return NextResponse.json({
    license,
    rotatedAt: license?.installedAt ?? null,
    available: Boolean(license),
    // Storage is Postgres-backed (durable on serverless), so advance
    // is available whenever a license exists and the HMAC key is
    // configured - there is no read-only filesystem gate anymore.
    canAdvance: Boolean(license) && Boolean(HMAC_KEY_ENV),
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
  const license = await readLicense();
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
  try {
    await writeLicense(signed);
  } catch (err) {
    // Defense in depth: fail structured, never raw 500.
    await appendAudit(
      "install.stamp_advance_failed",
      `install stamp advance write failed: ${(err as Error)?.message ?? err}`,
      { role: gate.role }
    );
    return NextResponse.json(
      {
        error: "license_stamp_write_failed",
        detail: `could not persist license: ${(err as Error)?.message ?? err}`,
      },
      { status: 503 }
    );
  }

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

  bump({ kind: "install" });

  return NextResponse.json({ success: true, license: signed });
}
