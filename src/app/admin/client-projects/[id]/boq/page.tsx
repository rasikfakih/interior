import AdminBOQ from "@/components/admin/AdminBOQ";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "BOQ",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminBOQPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const gate = await requireAdminSession();
  if (!gate.ok) return null;
  const { id } = await params;
  const { v } = await searchParams;
  return (
    <div className="container-page py-6 md:py-10">
      <AdminBOQ projectId={id} role={gate.role} initialVersionId={v} />
    </div>
  );
}
