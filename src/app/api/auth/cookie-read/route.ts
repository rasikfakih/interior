import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const cs =
    jar.get("next-auth.csrf-token")
    || jar.get("__Host-next-auth.csrf-token")
    || jar.get("__Secure-next-auth.csrf-token");
  return Response.json({
    csrfToken: "",
    cookieValue: cs?.value ?? null,
  });
}
