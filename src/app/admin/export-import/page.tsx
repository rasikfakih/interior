import AdminExportImport from "@/components/admin/AdminExportImport";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Export / Import", robots: { index: false } };

export default function ExportImportPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Export / Import
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-mute">
        JSON backup of every content table and full restore — the
        WordPress-parity import/export surface.
      </p>
      <div className="mt-6">
        <AdminExportImport />
      </div>
    </section>
  );
}
