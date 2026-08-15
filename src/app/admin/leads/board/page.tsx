import LeadKanban from "@/components/admin/LeadKanban";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "Leads board",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLeadsBoardPage() {
  const gate = await requireAdminSession();
  if (!gate.ok) return null;
  return <LeadKanban role={gate.role} />;
}
