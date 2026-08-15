import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { checkPlan, planBlockedBody } from "@/lib/billing";
import { ensureMigrated, pgQuery, pgOne } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";

export const dynamic = "force-dynamic";

const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;
const DOMAIN_RE = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;

/**
 * PATCH /api/tenants/[id]/domains {client_subdomain?, custom_domain?}
 *
 * Sets the white-label hostnames. Gated by the plan: client_subdomain
 * is a Starter feature, custom_domain is a Studio feature. Empty value
 * clears the field. Admin session must belong to the tenant.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  if (String(tenantId) !== id) {
    return NextResponse.json({ error: "Not your tenant." }, { status: 403 });
  }

  let body: Record<string, unknown> | undefined;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  await ensureMigrated();
  const updates: string[] = [];
  const values: unknown[] = [];

  const subdomainRaw = body?.client_subdomain;
  if (subdomainRaw !== undefined) {
    const sub = String(subdomainRaw).trim();
    if (sub && !SUBDOMAIN_RE.test(sub)) {
      return NextResponse.json(
        { error: "client_subdomain must be lowercase letters, digits and hyphens (e.g. client-mystudio)." },
        { status: 400 }
      );
    }
    if (sub) {
      const taken = await pgOne<{ id: number }>(
        `SELECT id FROM tenants WHERE client_subdomain = $1 AND id <> $2 LIMIT 1`,
        [sub, tenantId]
      );
      if (taken) {
        return NextResponse.json({ error: "That subdomain is already taken." }, { status: 409 });
      }
      const gateRes = await checkPlan(tenantId, "client_subdomain");
      if (!gateRes.allowed) {
        return NextResponse.json(planBlockedBody(gateRes), { status: gateRes.status });
      }
    }
    updates.push("client_subdomain = ?");
    values.push(sub || null);
  }

  const domainRaw = body?.custom_domain;
  if (domainRaw !== undefined) {
    const domain = String(domainRaw).trim();
    if (domain && !DOMAIN_RE.test(domain)) {
      return NextResponse.json(
        { error: "custom_domain must be a valid hostname (e.g. projects.mystudio.com)." },
        { status: 400 }
      );
    }
    if (domain) {
      const gateRes = await checkPlan(tenantId, "custom_domain");
      if (!gateRes.allowed) {
        return NextResponse.json(planBlockedBody(gateRes), { status: gateRes.status });
      }
    }
    updates.push("custom_domain = ?");
    values.push(domain || null);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const placeholders = updates.map((u) => u.replace("?", `$${updates.indexOf(u) + 1}`));
  values.push(tenantId);
  await pgQuery(
    `UPDATE tenants SET ${placeholders.join(", ")} WHERE id = $${values.length}`,
    values
  );
  const row = await pgOne<{ client_subdomain: string | null; custom_domain: string | null }>(
    `SELECT client_subdomain, custom_domain FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  return NextResponse.json({
    ok: true,
    clientSubdomain: row?.client_subdomain ?? null,
    customDomain: row?.custom_domain ?? null,
  });
}
