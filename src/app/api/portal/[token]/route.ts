import { NextRequest, NextResponse } from "next/server";
import { fetchPortalData } from "@/lib/portal";

/**
 * Module 8 - PUBLIC portal fetch by share token - no auth, by design.
 * The link is the permission (mirrors /api/proposals/[token]). Works
 * on the default host, a client- subdomain, or a tenant custom domain
 * because resolution is token-based. tenant_id is never returned.
 * The GET doubles as the access beacon (portal_access_count++).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) {
    return NextResponse.json({ error: "Portal not found." }, { status: 404 });
  }
  const host = req.headers.get("x-portal-host") ?? req.headers.get("host");
  const data = await fetchPortalData(token, { track: true, host });
  if (!data) {
    return NextResponse.json({ error: "Portal not found." }, { status: 404 });
  }
  return NextResponse.json(data);
}
