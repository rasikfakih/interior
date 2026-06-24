import AdminShell from "@/components/admin/AdminShell";
import LoginCard from "./LoginCard";
import { checkLicense } from "@/lib/license";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Admin", robots: { index: false } };

async function safeGetServerSession() {
  try {
    const mod = await import("next-auth/next");
    const authMod = await import("@/lib/auth");
    return await mod.getServerSession(authMod.authOptions);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin/page] getServerSession failed:", (e as Error)?.message ?? e);
    }
    return null;
  }
}

async function safeCheckLicense() {
  try {
    return await checkLicense();
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin/page] checkLicense failed:", (e as Error)?.message ?? e);
    }
    return { ok: false as const, reason: "missing" as const };
  }
}

export default async function AdminPage() {
  const [session, license] = await Promise.all([safeGetServerSession(), safeCheckLicense()]);

  if (!license.ok || !session) {
    return <LoginCard />;
  }

  return <AdminShell email={session.user?.email || "operator@local"} />;
}
