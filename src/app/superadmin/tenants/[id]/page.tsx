import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTenant } from "@/lib/operator-store";
import { TenantDetailClient } from "@/components/operator/TenantDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Tenant", robots: { index: false } };

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) redirect("/superadmin/tenants");

  const data = getTenant(numericId);
  if (!data.tenant) redirect("/superadmin/tenants");

  return (
    <TenantDetailClient
      tenant={data.tenant as any}
      distro={data.distro}
    />
  );
}
