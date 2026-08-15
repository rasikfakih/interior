import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgQuery } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";

export const dynamic = "force-dynamic";

/** POST /api/billing/cancel — cancel at period end; plan stays active. */
export async function POST() {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  await ensureMigrated();
  await pgQuery(
    `UPDATE tenants SET subscription_status = 'canceled' WHERE id = $1`,
    [tenantId]
  );
  await pgQuery(
    `UPDATE subscriptions SET status = 'canceled'
     WHERE tenant_id = $1 AND status = 'active'`,
    [tenantId]
  );
  return NextResponse.json({ ok: true });
}
