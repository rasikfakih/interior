import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HealthBoard } from "@/components/operator/HealthBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Tenant health", robots: { index: false } };

export default async function HealthPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  return (
    <section>
      <h1 className="text-3xl tracking-tight text-zinc-900">Tenant health</h1>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Uptime board — reuses the same /api/health contract as the uptime checker.
      </p>
      <div className="mt-8">
        <HealthBoard />
      </div>
    </section>
  );
}
