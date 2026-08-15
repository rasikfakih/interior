import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 8 - admin portal config. Returns the current token (if any),
 * access count, created_at, and every portal URL (default host,
 * client subdomain, custom domain when configured) for the share UI.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json({ error: "No tenant configured." }, { status: 400 });
  }
  const { id } = await ctx.params;
  await ensureMigrated();
  const project = await pgOne<{
    id: string;
    tenant_id: number;
    portal_token: string | null;
    portal_access_count: number | null;
    portal_token_created_at: string | null;
  }>(
    `SELECT id, tenant_id, portal_token, portal_access_count, portal_token_created_at
     FROM client_projects WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!project || Number(project.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const tenant = await pgOne<{
    client_subdomain: string | null;
    custom_domain: string | null;
  }>(
    `SELECT client_subdomain, custom_domain FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  const token = project.portal_token;
  const origin = req.nextUrl.origin;
  return NextResponse.json({
    portal: {
      token,
      accessCount: Number(project.portal_access_count ?? 0),
      createdAt: project.portal_token_created_at,
      urls: token
        ? {
            default: `${origin}/portal/${token}`,
            subdomain: tenant?.client_subdomain
              ? `https://${tenant.client_subdomain}.ethinterior.vercel.app/portal/${token}`
              : null,
            customDomain: tenant?.custom_domain
              ? `https://${tenant.custom_domain}/portal/${token}`
              : null,
          }
        : null,
    },
  });
}
