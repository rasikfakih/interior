import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/whoami
 *
 * Operator-confirmed role split (v1.1.3 plan). Both admin and
 * superadmin roles pass NextAuth `getServerSession`, but only
 * superadmin returns 200 from this route. Admins receive
 * 403 with `role: "admin"` so the AdminShell can render the
 * "Superadmin" tile only when role === "superadmin".
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session?.user as any)?.role || "admin";
  if (role !== "superadmin") {
    return NextResponse.json(
      {
        error: "Forbidden",
        role,
        reason: "This route is superadmin-only.",
      },
      { status: 403 }
    );
  }
  return NextResponse.json({
    role,
    email: (session?.user as any)?.email || "",
    ok: true,
  });
}
