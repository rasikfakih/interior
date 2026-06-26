import { cookies, headers } from "next/headers";
import { getCsrfToken } from "next-auth/react";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Step 1: forward to NextAuth's csrf endpoint at the same origin so
  // that handler runs and sets the csrf cookie via the Set-Cookie header
  // on its Response. We re-emit those Set-Cookie headers onto OUR response
  // so the client (and cookies()) sees them after the round-trip.
  const headersList = await headers();
  const cookieHeader = headersList.get("cookie") ?? "";
  const internalUrl = new URL("/api/auth/csrf", req.url);

  const upstream = await fetch(internalUrl.toString(), {
    method: "GET",
    headers: { cookie: cookieHeader },
  });
  const upstreamBody = await upstream.json();
  const upstreamSetCookie = upstream.headers.get("set-cookie") ?? "";

  // Step 2: try to read the cookie from THIS request's cookie jar. If
  // NextAuth set it on the upstream call and we forwarded the Set-Cookie
  // back, the browser next request will have the cookie; THIS request
  // might not have the response cookie applied server-side because we
  // are not on the same request context. So we do a defensive read of
  // cookies() now and ALSO ship the body for graceful fallback.
  await getCsrfToken();
  const jar = await cookies();
  const cs =
    jar.get("next-auth.csrf-token")
    || jar.get("__Host-next-auth.csrf-token")
    || jar.get("__Secure-next-auth.csrf-token");

  // Step 3: respond with cookie value (preferred) and raw token (fallback).
  const out = new Response(
    JSON.stringify({
      csrfToken: upstreamBody?.csrfToken ?? "",
      cookieValue: cs?.value ?? null,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        ...(upstreamSetCookie ? { "set-cookie": upstreamSetCookie } : {}),
      },
    }
  );
  return out;
}
