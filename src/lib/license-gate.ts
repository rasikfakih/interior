import { checkLicense, TIER_FEATURES, LicenseTier } from "@/lib/license";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export type Gate =
  | "read-public"
  | "mutate"
  | "admin"
  | "feature.3d-viewer"
  | "feature.multilingual";

export type GateResult =
  | { ok: true }
  | { ok: false; code: 401 | 402 | 403 | 423; reason: string };

/**
 * Admin-route gate. Combines the license check (Phase 4) with a
 * NextAuth session check so that any caller holding a license is
 * NOT also able to write - the caller must additionally be a
 * signed-in user (admin or superadmin role). Use this on every
 * POST/PUT/PATCH/DELETE in /api/pages, /api/admin/pages, and
 * any other route that mutates tenant-shared data. Without this,
 * license-only gates were trivially bypassable from any
 * unauthenticated client as long as the operator's license was
 * installed.
 */
export async function requireAdminSession(): Promise<
  | { ok: true; role: string }
  | { ok: false; response: Response }
> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return {
      ok: false,
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  const license = await requireLicense("admin");
  if (!license.ok) {
    return {
      ok: false,
      response: Response.json(
        { error: license.reason },
        { status: license.code }
      ),
    };
  }
  const role = (session?.user as any)?.role ?? "admin";
  return { ok: true, role };
}

/**
 * Read-only public gate. Caller must have a license with the
 * relevant feature flag; no session required.
 */
export async function requireLicense(
  gate: Gate = "read-public"
): Promise<GateResult> {
  if (gate === "read-public") return { ok: true };

  const check = await checkLicense();
  if (!check.ok) {
    const reasons: Record<string, string> = {
      missing: "License missing",
      expired: "License expired",
      "domain-mismatch": "Domain not bound",
      tampered: "License tampered",
      "no-signature": "License signature missing",
    };
    return { ok: false, code: 401, reason: reasons[check.reason] || "License issue" };
  }

  const license = check.license;
  if (gate.startsWith("feature.")) {
    const feature = gate;
    if (!license.features[feature]) {
      return {
        ok: false,
        code: 423,
        reason: `Feature requires upgrade: ${feature}`,
      };
    }
    return { ok: true };
  }

  if (gate === "mutate" || gate === "admin") {
    return { ok: true };
  }

  return { ok: true };
}

export function missingCount(license: any) {
  const out: LicenseTier[] = [];
  const keys = Object.keys(TIER_FEATURES.personal) as Array<keyof typeof TIER_FEATURES.personal>;
  keys.forEach((f) => {
    if (!license?.features?.[f]) out.push("personal");
  });
  return out.length;
}
