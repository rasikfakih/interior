import AdminLeads from "@/components/admin/AdminLeads";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "Leads",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const gate = await requireAdminSession();
  if (!gate.ok) return null;
  return <AdminLeads role={gate.role} />;
}
