import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listTenants } from "@/lib/operator-store";
import { LicenseWizard } from "@/components/operator/LicenseWizard";
import { AdminPageHeader } from "@/components/AdminPageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "License wizard", robots: { index: false } };

export default async function IssuePage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  const tenants = await listTenants();
  return (
    <section>
      <AdminPageHeader
        eyebrow="Operations"
        title="License wizard"
        desc="Issue, extend, or revoke a tenant license - with email handoff and install code."
      />
      <LicenseWizard tenants={tenants} />
    </section>
  );
}
