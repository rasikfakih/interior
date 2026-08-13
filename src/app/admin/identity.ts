import { authOptions } from "@/lib/auth";

/** Resolve the signed-in tenant admin's identity for the console
 *  topbar. Falls back to local defaults when NextAuth is unavailable
 *  (e.g. dev without a session) so the chrome never hard-fails. */
export async function getAdminIdentity(): Promise<{ email: string; role: string }> {
  try {
    const mod = await import("next-auth/next");
    const session = await mod.getServerSession(authOptions);
    return {
      email: session?.user?.email || "operator@local",
      role: (session?.user as { role?: string } | undefined)?.role || "admin",
    };
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin/identity] getServerSession failed:", (e as Error)?.message ?? e);
    }
    return { email: "operator@local", role: "admin" };
  }
}
