import AdminSiteIdentity from "@/components/admin/AdminSiteIdentity";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { requireAdminSession } from "@/lib/license-gate";
import { getAdminIdentity } from "../identity";

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
  const { email, role } = await getAdminIdentity();
  if (!gate.ok) {
    return (
      <AdminPageShell email={email} role={role}>
        <p className="surface-elevated px-4 py-3 text-sm rounded-[var(--radius-card)]">
          Sign in is required to edit site identity.
        </p>
      </AdminPageShell>
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
    <AdminPageShell email={email} role={gate.role}>
      <AdminSiteIdentity initial={initial} role={gate.role} />
    </AdminPageShell>
  );
}
