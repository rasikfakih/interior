/**
 * Client portal route group. Deliberately separate from (public) and
 * (proposal): the portal is a token-authed client surface that must not
 * carry the marketing navbar/footer. The root layout still applies
 * (fonts, theme vars, providers). The share link is the permission, so
 * it works on the default host, a client- subdomain, or a tenant custom
 * domain - src/proxy.ts tags those hosts with x-portal-host, but all
 * resolution happens token-side in the page.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
