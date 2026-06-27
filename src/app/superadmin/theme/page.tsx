import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listTenants } from "@/lib/operator-store";
import { DistroForm } from "@/components/operator/DistroForm";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Theme distro", robots: { index: false } };

export default async function ThemePage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");

  const tenants = await listTenants();
  const examplePath = path.join(process.cwd(), "data", "theme.distro.json");
  const example = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, "utf8") : "{}";

  return (
    <section>
      <h1 className="text-3xl tracking-tight text-zinc-900">Theme distributor</h1>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Apply a theme.distro.json to one or more tenants
      </p>
      <div className="mt-8">
        <DistroForm tenants={tenants as any[]} example={example} />
      </div>
    </section>
  );
}
