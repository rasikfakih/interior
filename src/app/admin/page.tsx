import AdminShell from "@/components/admin/AdminShell";
import LoginCard from "./LoginCard";
import { checkLicense } from "@/lib/license";
import { getAdminIdentity } from "./identity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Admin", robots: { index: false } };

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
  const [identity, license] = await Promise.all([getAdminIdentity(), safeCheckLicense()]);

  if (!license.ok || !identity.email || identity.email === "operator@local") {
    return <LoginCard />;
  }

  return <AdminShell email={identity.email} role={identity.role} />;
}
