import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NewTenantForm } from "@/components/operator/NewTenantForm";

export const metadata = { title: "New tenant", robots: { index: false } };

export default async function NewTenantPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  return (
    <section>
      <h1 className="text-3xl tracking-tight text-zinc-900">New tenant</h1>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Onboard a buyer from /install, an Envato ping, or a manual operator entry.
      </p>
      <div className="mt-8">
        <NewTenantForm />
      </div>
    </section>
  );
}
