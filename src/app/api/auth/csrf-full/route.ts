import { getCsrfToken } from "next-auth/react";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  // Ensure the cookie is set if absent, then read it.
  await getCsrfToken();
  const jar = await cookies();
  const cs = jar.get("next-auth.csrf-token") || jar.get("__Host-next-auth.csrf-token") || jar.get("__Secure-next-auth.csrf-token");
  const token = await getCsrfToken();
  return Response.json({
    csrfToken: token || "",
    cookieValue: cs?.value || null,
  });
}
