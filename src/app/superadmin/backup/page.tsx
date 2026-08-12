import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BackupBoard } from "@/components/operator/BackupBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Backups", robots: { index: false } };

export default async function BackupPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  return (
    <section>
      <h1 className="text-3xl tracking-tight text-zinc-900">Backups</h1>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Full-table snapshots — same contract as scripts/export-postgres.mjs.
      </p>
      <div className="mt-8">
        <BackupBoard />
      </div>
    </section>
  );
}
