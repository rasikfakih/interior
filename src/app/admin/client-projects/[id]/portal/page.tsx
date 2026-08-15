import AdminPortal from "@/components/admin/AdminPortal";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "Client Portal",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireAdminSession();
  if (!gate.ok) return null;
  const { id } = await params;
  return (
    <div className="container-page py-6 md:py-10">
      <AdminPortal projectId={id} role={gate.role} />
    </div>
  );
}
