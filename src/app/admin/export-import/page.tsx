import AdminExportImport from "@/components/admin/AdminExportImport";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../identity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Export / Import", robots: { index: false } };

export default async function ExportImportPage() {
  const { email, role } = await getAdminIdentity();
  return (
    <AdminPageShell email={email} role={role}>
      <AdminPageHeader
        eyebrow="System"
        title="Export / Import"
        desc="JSON backup of every content table and full restore - the WordPress-parity import/export surface."
      />
      <AdminExportImport />
    </AdminPageShell>
  );
}
