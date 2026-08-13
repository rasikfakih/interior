import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminAnnouncements } from "@/components/operator/AdminAnnouncements";
import { AdminPageHeader } from "@/components/AdminPageHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Announcements", robots: { index: false } };

export default async function AnnouncementsPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("superadmin_session")?.value !== "1") redirect("/superadmin");
  return (
    <section>
      <AdminPageHeader
        eyebrow="Platform"
        title="Announcements"
        desc="Platform notices — rendered as a dismissible bar on public pages."
      />
      <AdminAnnouncements />
    </section>
  );
}
