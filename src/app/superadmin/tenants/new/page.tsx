import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NewTenantForm } from "@/components/operator/NewTenantForm";
import { AdminPageHeader } from "@/components/AdminPageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "New tenant", robots: { index: false } };

export default async function NewTenantPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  return (
    <section>
      <AdminPageHeader
        eyebrow="Platform"
        title="New tenant"
        desc="Onboard a buyer from /install, an Envato ping, or a manual operator entry."
      />
      <NewTenantForm />
    </section>
  );
}
