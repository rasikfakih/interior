import "server-only";
import crypto from "crypto";

const HMAC_KEY = process.env.LICENSE_HMAC_KEY || "etihad-interiors-license-fallback-2026";

export function testVerify<T extends { signature: string }>(license: T): boolean {
  try {
    const body = canonicalBody(license as any);
    const expected = crypto
      .createHmac("sha256", HMAC_KEY)
      .update(body)
      .digest("hex");
    return expected === license.signature;
  } catch {
    return false;
  }
}

function canonicalBody(l: any) {
  return `${l.purchaseCode ?? ""}|${l.domain ?? ""}|${l.tier ?? ""}|${
    l.installedAt ?? ""
  }|${l.expiresAt ?? "null"}|${Object.entries(l.features ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",")}`;
}

export function signLicense<T extends { signature: string }>(license: T): string {
  const body = canonicalBody(license as any);
  return crypto.createHmac("sha256", HMAC_KEY).update(body).digest("hex");
}
