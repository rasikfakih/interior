import LicenseAdmin from "@/components/admin/LicenseAdmin";

export const metadata = { title: "License", robots: { index: false } };

export default function AdminLicensePage() {
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <LicenseAdmin />
      </div>
    </section>
  );
}
