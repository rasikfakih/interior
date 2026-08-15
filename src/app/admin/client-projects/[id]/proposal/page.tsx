import ProposalBuilder from "@/components/admin/ProposalBuilder";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "Proposal Builder",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminProposalBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireAdminSession();
  if (!gate.ok) return null;
  const { id } = await params;
  return <ProposalBuilder projectId={id} role={gate.role} />;
}
