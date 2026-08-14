import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HealthBoard } from "@/components/operator/HealthBoard";
import { AdminPageHeader } from "@/components/AdminPageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Tenant health", robots: { index: false } };

export default async function HealthPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  return (
    <section>
      <AdminPageHeader
        eyebrow="Operations"
        title="Tenant health"
        desc="Uptime board - reuses the same /api/health contract as the uptime checker."
      />
      <HealthBoard />
    </section>
  );
}
