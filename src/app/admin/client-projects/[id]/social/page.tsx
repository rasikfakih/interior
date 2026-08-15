import AdminSocial from "@/components/admin/AdminSocial";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "Social Autopilot",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSocialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireAdminSession();
  if (!gate.ok) return null;
  const { id } = await params;
  return (
    <div className="container-page py-6 md:py-10">
      <AdminSocial projectId={id} />
    </div>
  );
}
