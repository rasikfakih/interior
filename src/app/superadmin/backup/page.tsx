import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BackupBoard } from "@/components/operator/BackupBoard";
import { AdminPageHeader } from "@/components/AdminPageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Backups", robots: { index: false } };

export default async function BackupPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  return (
    <section>
      <AdminPageHeader
        eyebrow="Platform"
        title="Backups"
        desc="Full-table snapshots - same contract as scripts/export-postgres.mjs."
      />
      <BackupBoard />
    </section>
  );
}
