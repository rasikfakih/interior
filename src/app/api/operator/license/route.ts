import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";
import {
  issueLicense,
  extendLicense,
  revokeTenant,
  getTenant,
} from "@/lib/operator-store";
import { bump } from "@/lib/revalidate";

/**
 * POST /api/operator/license - Phase 5 license wizard.
 * Body: { action: "issue" | "extend" | "revoke", tenant_id, expires_at?, amount? }
 *
 * - issue:   (re-)sign a license for the tenant, defaulting expiry to
 *            +1 year from install.
 * - extend:  move expires_at forward, re-sign, and log license.extend.
 * - revoke:  flip the tenant to revoked state and log license.revoke.
 *
 * Response always carries the tenant's install code (slug + hmac_key)
 * and owner email so the operator can email the payload to the buyer.
 */
export async function POST(req: Request) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const tenantId = Number(body.tenant_id);
  const amount = Number(body.amount ?? 0);

  if (!["issue", "extend", "revoke"].includes(action)) {
    return NextResponse.json({ error: "action must be issue|extend|revoke" }, { status: 400 });
  }
  if (!Number.isFinite(tenantId)) {
    return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
  }

  try {
    const tenant = await getTenant(tenantId);
    if (!tenant.tenant) {
      return NextResponse.json({ error: "tenant not found" }, { status: 404 });
    }

    let license: unknown = null;
    if (action === "issue") {
      license = await issueLicense(tenantId, body.expires_at || null, amount);
    } else if (action === "extend") {
      if (!body.expires_at) {
        return NextResponse.json({ error: "expires_at required for extend" }, { status: 400 });
      }
      license = await extendLicense(tenantId, String(body.expires_at), amount);
    } else {
      await revokeTenant(tenantId, "license-wizard");
      license = null;
    }

    bump({ kind: "install" });
    const t = tenant.tenant as {
      slug?: string;
      hmac_key?: string | null;
      owner_email?: string | null;
      domain?: string | null;
    };
    return NextResponse.json({
      ok: true,
      action,
      license,
      installCode: {
        slug: t.slug ?? null,
        hmac_key: t.hmac_key ?? null,
      },
      owner_email: t.owner_email ?? null,
      domain: t.domain ?? null,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
