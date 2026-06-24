import { openReadonlyDb } from "@/lib/db";

export type TenantBrand = {
  brand_name: string;
  tagline?: string;
  contact_email?: string;
  contact_phone?: string;
  studio_address?: string;
  calendly_url?: string;
  year_established?: string;
  residences_delivered?: string;
  instagram_url?: string;
  footer_credit?: string;
  palette: {
    ink: string;
    paper: string;
    accent: string;
    muted?: string;
  };
  hero?: {
    eyebrow?: string;
    headline?: string;
    subtext?: string;
  };
  default_locales?: string[];
};

const FALLBACK: TenantBrand = {
  brand_name: "Your Studio",
  tagline: "A studio of considered spaces.",
  palette: { ink: "#1a1814", paper: "#efe6d2", accent: "#8a5d3b", muted: "#5a4f3e" },
};

export function readBrandFor(domain?: string | null, slug?: string | null): TenantBrand {
  try {
    if (!domain && !slug) return readDefaultBrand();
    const db = openReadonlyDb();
    const tenant =
      (slug && db.prepare("SELECT id FROM tenants WHERE slug = ?").get(slug)) ||
      (domain && db.prepare("SELECT id FROM tenants WHERE domain = ?").get(domain)) ||
      db.prepare("SELECT id FROM tenants ORDER BY id ASC LIMIT 1").get();
    if (!tenant) return readDefaultBrand();
    const row = db
      .prepare("SELECT payload FROM tenant_data WHERE tenant_id = ? AND kind = 'distro' ORDER BY id DESC LIMIT 1")
      .get((tenant as any).id) as { payload: string } | undefined;
    db.close();
    if (!row) return readDefaultBrand();
    const distro = JSON.parse(row.payload) as TenantBrand;
    return { ...FALLBACK, ...distro };
  } catch {
    return readDefaultBrand();
  }
}

export function listTenants(): Array<{
  id: number;
  slug: string;
  studio_name: string;
  owner_email: string | null;
  domain: string | null;
  tier: string;
  state: string;
  installed_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}> {
  try {
    const db = openReadonlyDb();
    const rows = db.prepare(`
      SELECT id, slug, studio_name, owner_email, domain, tier, state, installed_at, expires_at, revoked_at
      FROM tenants ORDER BY id ASC
    `).all();
    db.close();
    return rows as any;
  } catch {
    return [];
  }
}

export function findTenant(id: number) {
  try {
    const db = openReadonlyDb();
    const t = db.prepare(`SELECT * FROM tenants WHERE id = ?`).get(id);
    const distroRow = db.prepare(`SELECT payload FROM tenant_data WHERE tenant_id = ? AND kind = 'distro' ORDER BY id DESC LIMIT 1`).get(id);
    db.close();
    return { tenant: t, distro: distroRow ? JSON.parse((distroRow as any).payload) : null };
  } catch {
    return { tenant: null, distro: null };
  }
}

function readDefaultBrand(): TenantBrand {
  return FALLBACK;
}
