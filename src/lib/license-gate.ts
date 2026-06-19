import { checkLicense, TIER_FEATURES, LicenseTier } from "@/lib/license";

export type Gate =
  | "read-public"
  | "mutate"
  | "admin"
  | "feature.3d-viewer"
  | "feature.multilingual";

export type GateResult =
  | { ok: true }
  | { ok: false; code: 401 | 402 | 403 | 423; reason: string };

export async function requireLicense(gate: Gate = "read-public"): Promise<GateResult> {
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
  (Object.keys(TIER_FEATURES.personal) as Array<keyof typeof TIER_FEATURES.personal>).forEach(
    (f) => {
      if (!license?.features?.[f]) out.push("personal");
    }
  );
  return out.length;
}
