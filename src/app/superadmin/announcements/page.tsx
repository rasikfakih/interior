import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminAnnouncements } from "@/components/operator/AdminAnnouncements";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Announcements", robots: { index: false } };

export default async function AnnouncementsPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  return (
    <section>
      <h1 className="text-3xl tracking-tight text-zinc-900">Announcements</h1>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Platform notices — rendered as a dismissible bar on public pages.
      </p>
      <div className="mt-8">
        <AdminAnnouncements />
      </div>
    </section>
  );
}
