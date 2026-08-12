import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listTenants } from "@/lib/operator-store";
import { LicenseWizard } from "@/components/operator/LicenseWizard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "License wizard", robots: { index: false } };

export default async function IssuePage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  const tenants = await listTenants();
  return (
    <section>
      <h1 className="text-3xl tracking-tight text-zinc-900">License wizard</h1>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Issue, extend, or revoke a tenant license — with email handoff and install code.
      </p>
      <div className="mt-8">
        <LicenseWizard tenants={tenants} />
      </div>
    </section>
  );
}
