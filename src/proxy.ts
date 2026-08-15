import { NextResponse, type NextRequest } from "next/server";

/**
 * Module 8 - client portal host tagging.
 *
 * This Next version renamed the `middleware` convention to `proxy`;
 * the file must export `proxy()` (see node_modules/next/dist/docs/
 * proxy.md). The proxy runs on the edge without shared modules, so it
 * cannot query the database - tenant resolution is always token-based
 * in src/lib/portal.ts (the /portal/{token} page + API look the tenant
 * up through client_projects.tenant_id). The proxy's only job is to
 * tag the request with x-portal-host so the portal page knows which
 * hostname served it, which drives the white-label decision
 * (tenants.custom_domain match, read by the page from the DB).
 *
 * Matcher is scoped to /portal and /proposal only, so /api and every
 * admin route never enter the proxy - NextAuth CSRF/cookie flows are
 * untouched.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();
  const path = request.nextUrl.pathname;

  const isPortalPath = path.startsWith("/portal/");
  const isPortalHost =
    hostname.startsWith("client-") ||
    hostname.startsWith("client.") ||
    hostname.startsWith("portal.");

  // Proposals share via the default host too - no tagging needed
  // there. Only portal paths (which may arrive on a custom domain)
  // and portal-shaped hosts get the header.
  if (!isPortalPath && !isPortalHost) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set("x-portal-host", host);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/portal/:path*", "/proposal/:path*"],
};
