import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listTenants } from "@/lib/operator-store";
import { IssueForm } from "@/components/operator/IssueForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Issue license", robots: { index: false } };

export default async function IssuePage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  const tenants = await listTenants();
  return (
    <section>
      <h1 className="text-3xl tracking-tight text-zinc-900">Issue license</h1>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Re-stamp or issue a fresh license for any tenant.
      </p>
      <div className="mt-8">
        <IssueForm tenants={tenants as any[]} />
      </div>
    </section>
  );
}
