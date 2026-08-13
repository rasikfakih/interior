import { cookies } from "next/headers";
import { OperatorNav } from "@/components/operator/OperatorNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Superadmin", robots: { index: false } };

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("superadmin_session");
  const loggedIn = sessionCookie?.value === "1";

  if (!loggedIn) {
    return <div className="op-console min-h-dvh">{children}</div>;
  }

  const email = process.env.SUPERADMIN_EMAIL || "operator@studio";

  return (
    <div className="op-console min-h-dvh lg:flex">
      <OperatorNav email={email} />
      <main className="min-w-0 flex-1 px-4 py-8 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
