import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { generatePortalToken } from "@/lib/portal";
import { resolveAdminTenantId } from "@/lib/theme";

/**
 * Module 8 - admin portal token generation. Creates a unique 10-char
 * portal_token for the client project, stamps created_at, resets the
 * access counter, and returns the token plus every portal URL
 * (default host, client subdomain, custom domain when configured).
 */
export async function POST(
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

  const project = await pgOne<{ id: string; tenant_id: number }>(
    `SELECT id, tenant_id FROM client_projects WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!project || Number(project.tenant_id) !== tenantId) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const token = await withPgTx(async (client) => {
    let candidate = generatePortalToken();
    // Ensure uniqueness against the unique portal_token column.
    for (let i = 0; i < 5; i++) {
      const clash = await client.query<{ id: string }>(
        `SELECT id FROM client_projects WHERE portal_token = $1 LIMIT 1`,
        [candidate]
      );
      if (!clash.rows[0]) break;
      candidate = generatePortalToken();
    }
    await client.query(
      `UPDATE client_projects
       SET portal_token = $1,
           portal_token_created_at = CURRENT_TIMESTAMP,
           portal_access_count = 0
       WHERE id = $2`,
      [candidate, id]
    );
    return candidate;
  });

  const tenant = await pgOne<{
    client_subdomain: string | null;
    custom_domain: string | null;
  }>(
    `SELECT client_subdomain, custom_domain FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  const origin = req.nextUrl.origin;
  const urls = {
    default: `${origin}/portal/${token}`,
    subdomain:
      tenant?.client_subdomain
        ? `https://${tenant.client_subdomain}.ethinterior.vercel.app/portal/${token}`
        : null,
    customDomain: tenant?.custom_domain
      ? `https://${tenant.custom_domain}/portal/${token}`
      : null,
  };
  return NextResponse.json({ ok: true, token, urls });
}
