import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { getOperatorSession } from "@/lib/operator-auth";
import { getLoginAsTarget } from "@/lib/operator-store";

/**
 * POST /api/operator/login-as - Phase 5 audited impersonation.
 *
 * Superadmin picks a tenant admin user; this route verifies the user
 * is active, records an admin.login-as audit entry, and mints a real
 * NextAuth JWT session cookie for that user (same mechanism the
 * credentials sign-in uses, so /admin sees a fully valid session).
 * The operator's own superadmin session cookie is untouched.
 */
export async function POST(req: Request) {
  const ok = await getOperatorSession();
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = Number(body.user_id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  try {
    const user = await getLoginAsTarget(userId);
    const secret =
      process.env.NEXTAUTH_SECRET || "etihad-interiors-secret-key-2026";
    const maxAge = 30 * 86400;
    const sessionToken = await encode({
      token: {
        sub: String(user.id),
        email: user.email,
        name: user.email,
        role: user.role,
      },
      secret,
      maxAge,
    });

    const https =
      (process.env.NEXTAUTH_URL || "").startsWith("https://") ||
      Boolean(process.env.VERCEL);
    const cookieStore = await cookies();
    cookieStore.set(
      https ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      sessionToken,
      {
        httpOnly: true,
        secure: https,
        sameSite: "lax",
        path: "/",
        maxAge,
      }
    );

    return NextResponse.json({ ok: true, email: user.email, role: user.role });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 400 }
    );
  }
}
