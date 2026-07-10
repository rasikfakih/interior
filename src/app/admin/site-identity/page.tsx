import AdminSiteIdentity from "@/components/admin/AdminSiteIdentity";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";

export const metadata = {
  title: "Site identity",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

type SiteIdentity = {
  id: number;
  brand_name: string;
  tagline: string | null;
  logo_media_id: number | null;
  favicon_media_id: number | null;
  logo_url: string | null;
  favicon_url: string | null;
  accent_mode: string;
  footer_credit: string | null;
};

function emptyIdentity(): SiteIdentity {
  return {
    id: 0,
    brand_name: "Etihad Interiors",
    tagline: null,
    logo_media_id: null,
    favicon_media_id: null,
    logo_url: null,
    favicon_url: null,
    accent_mode: "auto",
    footer_credit: null,
  };
}

export default async function AdminSiteIdentityPage() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return (
      <section className="pt-24 md:pt-28 pb-24">
        <div className="container-page">
          <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
            Sign in is required to edit site identity.
          </p>
        </div>
      </section>
    );
  }

  await ensureMigrated();
  const row = (await pgOne(
    `SELECT id, brand_name, tagline, logo_media_id, favicon_media_id,
            logo_url, favicon_url, accent_mode, footer_credit
       FROM site_identity ORDER BY id ASC LIMIT 1`
  )) as SiteIdentity | null;
  const initial = row ?? emptyIdentity();

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminSiteIdentity initial={initial} role={gate.role} />
      </div>
    </section>
  );
}
