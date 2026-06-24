import AdminShell from "@/components/admin/AdminShell";
import LoginCard from "./LoginCard";
import { checkLicense } from "@/lib/license";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  let session: any;
  let license: any;

  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import("@/lib/auth");
    session = await getServerSession(authOptions);
  } catch (e) {
    session = null;
  }

  try {
    license = await checkLicense();
  } catch (e) {
    license = { ok: false, reason: "missing" };
  }

  if (!license.ok) {
    return <LoginCard />;
  }
  if (!session) {
    return <LoginCard />;
  }

  return (
    <AdminShell
      email={session.user?.email || "operator@local"}
    />
  );
}
