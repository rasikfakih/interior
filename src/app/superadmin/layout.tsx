import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { OperatorNav } from "@/components/operator/OperatorNav";

export const metadata = { title: "Superadmin", robots: { index: false } };

async function clear() {
  const cookieStore = await cookies();
  cookieStore.delete("superadmin_session");
}

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("superadmin_session");
  const loggedIn = sessionCookie?.value === "1";

  if (!loggedIn) {
    return <div className="min-h-dvh bg-zinc-50 text-zinc-900">{children}</div>;
  }

  const email = process.env.SUPERADMIN_EMAIL || "operator@studio";

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <OperatorNav email={email} />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
