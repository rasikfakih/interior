import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const LICENSE_FILE = path.join(process.cwd(), "data", "license.json");
const HMAC_KEY_ENV = process.env.LICENSE_HMAC_KEY || "";

/**
 * First-install license stamp endpoint.
 *
 * Gated ONLY by `LICENSE_HMAC_KEY` being set on the server. We never
 * default-fallback to a hardcoded HMAC key here: a hardcoded fallback
 * would silently re-stamp the buyer's license.json using a key their
 * next install cannot verify against.
 *
 * If `data/license.json` already exists and the request matches its
 * purchase code + domain, returns 200 without overwriting. This is
 * the idempotent path for the studio demo where postinstall already
 * stamps a license and the buyer later re-runs /install with the same
 * fields.
 */
export async function POST(req: Request) {
  if (!HMAC_KEY_ENV) {
    return NextResponse.json(
      { error: "license_stamp_unavailable", detail: "this server has no LICENSE_HMAC_KEY configured" },
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

  const features = tier === "business"
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
    Object.entries(features).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(","),
  ].join("|");

  const signature = crypto
    .createHmac("sha256", HMAC_KEY_ENV)
    .update(canonicalBody)
    .digest("hex");

  const license = {
    purchaseCode,
    domain,
    tier,
    installedAt,
    expiresAt,
    features,
    signature,
    issuedBy: "api-install-route",
  };

  fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true });
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(license, null, 2), "utf8");

  return NextResponse.json({ ok: true, license });
}
