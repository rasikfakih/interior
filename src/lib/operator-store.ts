import crypto from "crypto";
import { openDb } from "@/lib/db";

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}

export function listTenants() {
  try {
    const db = openDb();
    const rows = db.prepare(`
      SELECT id, slug, studio_name, owner_email, domain, tier, state,
             installed_at, expires_at, revoked_at
      FROM tenants ORDER BY installed_at DESC, id DESC
    `).all();
    db.close();
    return rows;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[operator-store] listTenants failed:", (e as Error)?.message);
    }
    return [];
  }
}

export function getTenant(id: number) {
  try {
    const db = openDb();
    const t = db.prepare(`SELECT * FROM tenants WHERE id = ?`).get(id);
    const distro = db.prepare(`SELECT payload FROM tenant_data WHERE tenant_id = ? AND kind = 'distro' ORDER BY id DESC LIMIT 1`).get(id);
    db.close();
    return { tenant: t, distro: distro ? safeJson((distro as any).payload) : null };
  } catch {
    return { tenant: null, distro: null };
  }
}

export function createTenant(input: {
  slug: string;
  studio_name: string;
  owner_email: string;
  domain?: string;
  tier: "personal" | "business";
  expires_at?: string | null;
}) {
  try {
    const db = openDb();
    const hmac_key = process.env.LICENSE_HMAC_KEY || "etihad-interiors-license-fallback-2026";
    db.prepare(`
      INSERT INTO tenants (slug, studio_name, owner_email, domain, tier, state, hmac_key, expires_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      input.slug,
      input.studio_name,
      input.owner_email,
      input.domain || null,
      input.tier,
      hmac_key,
      input.expires_at || null
    );
    audit(db, "tenant.create", `tenant created: ${input.slug} (${input.studio_name})`, input);
    const id = (db.prepare("SELECT last_insert_rowid() AS id").get() as any).id;
    db.close();
    return id;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[operator-store] createTenant failed:", (e as Error)?.message);
    }
    return null;
  }
}

export function updateTenant(id: number, patch: Record<string, any>) {
  try {
    const db = openDb();
    const allowed = ["studio_name", "owner_email", "domain", "tier", "state", "expires_at", "revoked_at", "hmac_key"];
    const keys = Object.keys(patch).filter((k) => allowed.includes(k));
    if (keys.length === 0) {
      db.close();
      return false;
    }
    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => patch[k]);
    values.push(id);
    db.prepare(`UPDATE tenants SET ${setClause} WHERE id = ?`).run(...values);
    audit(db, "tenant.update", `tenant ${id} updated`, patch);
    db.close();
    return true;
  } catch {
    return false;
  }
}

export function revokeTenant(id: number, reason = "manual") {
  try {
    const db = openDb();
    db.prepare(`UPDATE tenants SET state = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
    audit(db, "tenant.revoke", `tenant ${id} revoked (${reason})`, { reason });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export function applyDistro(tenantId: number, distro: any) {
  try {
    const db = openDb();
    const exists = db.prepare(`SELECT id FROM tenant_data WHERE tenant_id = ? AND kind = 'distro'`).get(tenantId);
    if (exists) {
      db.prepare(`UPDATE tenant_data SET payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(JSON.stringify(distro), (exists as any).id);
    } else {
      db.prepare(`INSERT INTO tenant_data (tenant_id, kind, payload) VALUES (?, 'distro', ?)`)
        .run(tenantId, JSON.stringify(distro));
    }
    audit(db, "distro.apply", `distro applied to tenant ${tenantId}`, { keys: Object.keys(distro) });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export function signLicense(tenantId: number, expiresAt: string | null = null) {
  try {
    const db = openDb();
    const t = db.prepare(`SELECT slug, domain, tier, hmac_key, installed_at FROM tenants WHERE id = ?`).get(tenantId) as any;
    if (!t) {
      db.close();
      throw new Error("tenant not found");
    }
    const features = t.tier === "business"
      ? { "feature.3d-viewer": true, "feature.multilingual": true, "feature.unlimited-pages": true, "feature.unlimited-media": true, "feature.multi-domain": true }
      : { "feature.3d-viewer": false, "feature.multilingual": false, "feature.unlimited-pages": false, "feature.unlimited-media": false, "feature.multi-domain": false };
    const installedAt = t.installed_at || new Date().toISOString();
    const expires = expiresAt || (t.installed_at ? new Date(new Date(t.installed_at).getTime() + 365 * 86400 * 1000).toISOString() : new Date(Date.now() + 365 * 86400 * 1000).toISOString());
    const body = [t.slug || `tenant-${t.id}`, t.domain || "unknown", t.tier, installedAt, expires,
      Object.entries(features).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(","),
    ].join("|");
    const signature = crypto.createHmac("sha256", t.hmac_key || "etihad-interiors-license-fallback-2026").update(body).digest("hex");

    const license = {
      purchaseCode: `OP-${tenantId}-${Date.now()}`,
      domain: t.domain || "unknown",
      tier: t.tier,
      installedAt,
      expiresAt: expires,
      features,
      signature,
      issuedBy: "operator-console",
    };
    audit(db, "license.issue", `tenant ${tenantId} license issued`, license);
    db.close();
    return license;
  } catch (e) {
    throw e;
  }
}

export function rotateHmac(tenantId: number, newKey: string) {
  try {
    const db = openDb();
    db.prepare(`UPDATE tenants SET hmac_key = ? WHERE id = ?`).run(newKey, tenantId);
    audit(db, "hmac.rotate", `tenant ${tenantId} HMAC rotated`);
    db.close();
    return true;
  } catch {
    return false;
  }
}

export function getMetrics() {
  try {
    const db = openDb();
    const total = (db.prepare(`SELECT COUNT(*) AS c FROM tenants`).get() as any).c;
    const active = (db.prepare(`SELECT COUNT(*) AS c FROM tenants WHERE state = 'active'`).get() as any).c;
    const pending = (db.prepare(`SELECT COUNT(*) AS c FROM tenants WHERE state = 'pending'`).get() as any).c;
    const revoked = (db.prepare(`SELECT COUNT(*) AS c FROM tenants WHERE state = 'revoked'`).get() as any).c;
    const business = (db.prepare(`SELECT COUNT(*) AS c FROM tenants WHERE tier = 'business'`).get() as any).c;
    const personal = (db.prepare(`SELECT COUNT(*) AS c FROM tenants WHERE tier = 'personal'`).get() as any).c;
    const expiringSoon = (db.prepare(`SELECT COUNT(*) AS c FROM tenants WHERE expires_at IS NOT NULL AND expires_at < ?`).get(new Date(Date.now() + 14 * 86400 * 1000).toISOString()) as any).c;
    const audit = (db.prepare(`SELECT COUNT(*) AS c FROM audit_log WHERE created_at > ?`).get(new Date(Date.now() - 7 * 86400 * 1000).toISOString()) as any).c;
    db.close();
    return { total, active, pending, revoked, business, personal, expiringSoon, auditLast7d: audit };
  } catch {
    return { total: 0, active: 0, pending: 0, revoked: 0, business: 0, personal: 0, expiringSoon: 0, auditLast7d: 0 };
  }
}

export function getAuditLog(limit = 50) {
  try {
    const db = openDb();
    const rows = db.prepare(`
      SELECT id, kind, message, meta, created_at FROM audit_log
      ORDER BY id DESC LIMIT ?
    `).all(limit);
    db.close();
    return rows;
  } catch {
    return [];
  }
}

function audit(db: any, kind: string, message: string, meta?: Record<string, any>) {
  try {
    db.prepare(`INSERT INTO audit_log (kind, message, meta) VALUES (?, ?, ?)`)
      .run(kind, message, meta ? JSON.stringify(meta) : null);
  } catch {
    /* read-only fallback - audit row simply skipped */
  }
}
