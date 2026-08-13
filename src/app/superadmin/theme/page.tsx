import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listTenants } from "@/lib/operator-store";
import { DistroForm } from "@/components/operator/DistroForm";
import { AdminPageHeader } from "@/components/AdminPageHeader";
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
      <AdminPageHeader
        eyebrow="Platform"
        title="Theme distributor"
        desc="Apply a theme.distro.json to one or more tenants."
      />
      <DistroForm tenants={tenants} example={example} />
    </section>
  );
}
