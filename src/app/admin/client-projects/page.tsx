import AdminClientProjects from "@/components/admin/AdminClientProjects";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "Client Projects",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminClientProjectsPage() {
  const gate = await requireAdminSession();
  if (!gate.ok) return null;
  return <AdminClientProjects role={gate.role} />;
}
