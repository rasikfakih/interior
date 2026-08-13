import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listTenants } from "@/lib/operator-store";
import { RotateForm } from "@/components/operator/RotateForm";
import { AdminPageHeader } from "@/components/AdminPageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Rotate HMAC", robots: { index: false } };

export default async function RotatePage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  const tenants = await listTenants();
  return (
    <section>
      <AdminPageHeader
        eyebrow="Platform"
        title="Rotate HMAC key"
        desc="Re-stamp a tenant's HMAC key. Buyers must re-stamp their license at /install after a rotation."
      />
      <RotateForm tenants={tenants} />
    </section>
  );
}
