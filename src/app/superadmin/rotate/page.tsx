import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listTenants } from "@/lib/operator-store";
import { RotateForm } from "@/components/operator/RotateForm";

export const metadata = { title: "Rotate HMAC", robots: { index: false } };

export default async function RotatePage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  const tenants = listTenants();
  return (
    <section>
      <h1 className="text-3xl tracking-tight text-zinc-900">Rotate HMAC key</h1>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Re-stamp a tenant's HMAC key. Buyers must re-stamp their license at /install after a rotation.
      </p>
      <div className="mt-8">
        <RotateForm tenants={tenants as any[]} />
      </div>
    </section>
  );
}
