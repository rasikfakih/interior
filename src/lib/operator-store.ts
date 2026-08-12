import crypto from "crypto";
import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";

function safeJson(s: unknown) {
  if (s == null) return null;
  if (typeof s === "string") {
    try { return JSON.parse(s); } catch { return null; }
  }
  return s;
}

export async function listTenants() {
  try {
    await ensureMigrated();
    return await pgMany(`
      SELECT id, slug, studio_name, owner_email, domain, tier, state,
             installed_at, expires_at, revoked_at,
             health_status, last_health_at
      FROM tenants
      ORDER BY installed_at DESC NULLS LAST, id DESC
    `);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[operator-store] listTenants failed:", (e as Error)?.message);
    }
    return [];
  }
}

export async function getTenant(id: number) {
  try {
    await ensureMigrated();
    const t = await pgOne(`SELECT * FROM tenants WHERE id = $1`, [id]);
    const distro = await pgOne<{ data: unknown }>(
      `SELECT data FROM tenant_data
       WHERE tenant_id = $1 AND kind = 'distro'
       ORDER BY updated_at DESC LIMIT 1`,
      [id]
    );
    return { tenant: t, distro: distro?.data ?? null };
  } catch {
    return { tenant: null, distro: null };
  }
}

export async function createTenant(input: {
  slug: string;
  studio_name: string;
  owner_email: string;
  domain?: string;
  tier: "personal" | "business";
  expires_at?: string | null;
}) {
  try {
    await ensureMigrated();
    const hmac_key =
      process.env.LICENSE_HMAC_KEY || "etihad-interiors-license-fallback-2026";
    return await withPgTx(async (client) => {
      const r = await client.query(
        `INSERT INTO tenants
           (slug, studio_name, owner_email, domain, tier, state, hmac_key, expires_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
         RETURNING id`,
        [
          input.slug,
          input.studio_name,
          input.owner_email,
          input.domain || null,
          input.tier,
          hmac_key,
          input.expires_at || null,
        ]
      );
      const id = r.rows?.[0]?.id ?? null;
      await auditOn(
        client,
        "tenant.create",
        `tenant created: ${input.slug} (${input.studio_name})`,
        input
      );
      return id;
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[operator-store] createTenant failed:", (e as Error)?.message);
    }
    return null;
  }
}

export async function updateTenant(
  id: number,
  patch: Record<string, unknown>
): Promise<boolean> {
  try {
    await ensureMigrated();
    const allowed = [
      "studio_name",
      "owner_email",
      "domain",
      "tier",
      "state",
      "expires_at",
      "revoked_at",
      "hmac_key",
    ];
    const keys = Object.keys(patch).filter((k) => allowed.includes(k));
    if (keys.length === 0) return false;
    return await withPgTx(async (client) => {
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
      const values = keys.map((k) => (patch as Record<string, unknown>)[k]);
      values.push(id);
      await client.query(
        `UPDATE tenants SET ${setClause} WHERE id = $${values.length}`,
        values
      );
      await auditOn(
        client,
        "tenant.update",
        `tenant ${id} updated`,
        patch as Record<string, unknown>
      );
      return true;
    });
  } catch {
    return false;
  }
}

export async function revokeTenant(
  id: number,
  reason = "manual"
): Promise<boolean> {
  try {
    await ensureMigrated();
    return await withPgTx(async (client) => {
      await client.query(
        `UPDATE tenants
           SET state = 'revoked', revoked_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await auditOn(client, "tenant.revoke", `tenant ${id} revoked (${reason})`, {
        reason,
      });
      const t = await client.query(
        `SELECT tier, seats FROM tenants WHERE id = $1 LIMIT 1`,
        [id]
      );
      await recordLicenseEventOn(
        client,
        "license.revoke",
        id,
        t.rows?.[0]?.tier ?? null,
        Number(t.rows?.[0]?.seats ?? 1),
        null,
        0
      );
      return true;
    });
  } catch {
    return false;
  }
}

async function recordLicenseEventOn(
  client: import("pg").PoolClient,
  action: string,
  tenantId: number,
  tier: string | null,
  seats: number,
  expiresAt: string | null,
  revenueCents: number,
  issuedBy = "operator-console"
) {
  try {
    await client.query(
      `INSERT INTO license_log
         (tenant_id, action, tier, seats, expires_at, issued_by, revenue_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, action, tier, seats, expiresAt, issuedBy, revenueCents]
    );
  } catch {
    /* read-only fallback - license event skipped */
  }
}

/**
 * Phase 5: issue a tenant license with a revenue-ledger entry
 * (license.issue). The plain signLicense() path keeps working for
 * legacy callers; this is what the license wizard uses so amounts
 * land in the ledger.
 */
export async function issueLicense(
  tenantId: number,
  expiresAt: string | null,
  revenueCents = 0,
  issuedBy = "operator-console"
) {
  await ensureMigrated();
  const t = await pgOne<{ tier: string | null; seats: number | null }>(
    `SELECT tier, seats FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  if (!t) throw new Error("tenant not found");
  const license = await signLicense(tenantId, expiresAt);
  await withPgTx(async (client) => {
    await recordLicenseEventOn(
      client,
      "license.issue",
      tenantId,
      t.tier ?? null,
      Number(t.seats ?? 1),
      license.expiresAt,
      revenueCents,
      issuedBy
    );
  });
  return license;
}

/**
 * Phase 5: extend a tenant license. Updates expires_at, logs
 * license.extend, then re-signs so the new expiry is embedded in
 * the payload the buyer installs.
 */
export async function extendLicense(
  tenantId: number,
  expiresAt: string,
  revenueCents = 0,
  issuedBy = "operator-console"
) {
  await ensureMigrated();
  const t = await pgOne<{ tier: string | null; seats: number | null }>(
    `SELECT tier, seats FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  if (!t) throw new Error("tenant not found");
  const expires = new Date(expiresAt).toISOString();
  await withPgTx(async (client) => {
    await client.query(`UPDATE tenants SET expires_at = $1 WHERE id = $2`, [
      expires,
      tenantId,
    ]);
    await recordLicenseEventOn(
      client,
      "license.extend",
      tenantId,
      t.tier ?? null,
      Number(t.seats ?? 1),
      expires,
      revenueCents,
      issuedBy
    );
  });
  return signLicense(tenantId, expires);
}

/**
 * Phase 5: probe one tenant's live health endpoint and persist the
 * result on the tenants row. Reuses the same contract the uptime
 * checker asserts on: GET {base}/api/health -> { ok: boolean }.
 */
export async function probeTenant(tenantId: number): Promise<{
  tenantId: number;
  slug: string | null;
  base: string;
  status: "ok" | "down" | "unknown";
  ms: number | null;
  ts: string;
  reason?: string;
}> {
  await ensureMigrated();
  const t = await pgOne<{
    slug: string | null;
    domain: string | null;
    state: string | null;
  }>(`SELECT slug, domain, state FROM tenants WHERE id = $1 LIMIT 1`, [
    tenantId,
  ]);
  if (!t) throw new Error("tenant not found");

  const studioOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const base = (t.domain || "").trim()
    ? /^https?:\/\//.test(t.domain || "")
      ? (t.domain as string)
      : `https://${t.domain}`
    : studioOrigin;
  const ts = new Date().toISOString();

  let status: "ok" | "down" | "unknown" = "unknown";
  let ms: number | null = null;
  let reason = "no domain configured - probed studio origin";
  if (!(t.domain || "").trim()) reason = "no domain configured - studio origin";

  if (t.state === "revoked") {
    status = "unknown";
    reason = "revoked tenant - not probed";
  } else {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const started = Date.now();
    try {
      const res = await fetch(`${base}/api/health`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      ms = Date.now() - started;
      if (!res.ok) throw new Error(`http ${res.status}`);
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean };
      status = j.ok === true ? "ok" : "down";
      reason = j.ok === true ? "healthy" : "health endpoint reported not-ok";
    } catch (e) {
      ms = Date.now() - started;
      status = "down";
      reason = (e as Error)?.message || "probe failed";
    } finally {
      clearTimeout(timer);
    }
  }

  await withPgTx(async (client) => {
    await client.query(
      `UPDATE tenants SET health_status = $1, last_health_at = $2 WHERE id = $3`,
      [status, ts, tenantId]
    );
  });
  return { tenantId, slug: t.slug ?? null, base, status, ms, ts, reason };
}

export async function applyDistro(
  tenantId: number,
  distro: Record<string, unknown>
) {
  try {
    await ensureMigrated();
    return await withPgTx(async (client) => {
      const exists = await client.query(
        `SELECT id FROM tenant_data WHERE tenant_id = $1 AND kind = 'distro' LIMIT 1`,
        [tenantId]
      );
      if (exists.rows?.[0]?.id) {
        await client.query(
          `UPDATE tenant_data SET data = $1::jsonb, updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(distro), exists.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO tenant_data (tenant_id, kind, data)
           VALUES ($1, 'distro', $2::jsonb)`,
          [tenantId, JSON.stringify(distro)]
        );
      }
      await auditOn(
        client,
        "distro.apply",
        `distro applied to tenant ${tenantId}`,
        { keys: Object.keys(distro) }
      );
      return true;
    });
  } catch {
    return false;
  }
}

type License = {
  purchaseCode: string;
  domain: string;
  tier: string;
  installedAt: string;
  expiresAt: string;
  features: Record<string, boolean>;
  signature: string;
  issuedBy: string;
};

export async function signLicense(
  tenantId: number,
  expiresAt: string | null = null
): Promise<License> {
  await ensureMigrated();
  const t = await pgOne<{
    slug: string | null;
    domain: string | null;
    tier: string | null;
    hmac_key: string | null;
    installed_at: string | Date | null;
  }>(
    `SELECT slug, domain, tier, hmac_key, installed_at
     FROM tenants WHERE id = $1 LIMIT 1`,
    [tenantId]
  );
  if (!t) throw new Error("tenant not found");

  const features =
    t.tier === "business"
      ? {
          "feature.3d-viewer": true,
          "feature.multilingual": true,
          "feature.unlimited-pages": true,
          "feature.unlimited-media": true,
          "feature.multi-domain": true,
        }
      : {
          "feature.3d-viewer": false,
          "feature.multilingual": false,
          "feature.unlimited-pages": false,
          "feature.unlimited-media": false,
          "feature.multi-domain": false,
        };

  const installedAt =
    t.installed_at instanceof Date
      ? t.installed_at.toISOString()
      : typeof t.installed_at === "string"
      ? t.installed_at
      : new Date().toISOString();

  const expires =
    expiresAt ||
    new Date(
      new Date(installedAt).getTime() + 365 * 86400 * 1000
    ).toISOString();

  const body = [
    t.slug || `tenant-${tenantId}`,
    t.domain || "unknown",
    t.tier || "personal",
    installedAt,
    expires,
    Object.entries(features)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(","),
  ].join("|");

  const signature = crypto
    .createHmac(
      "sha256",
      t.hmac_key || "etihad-interiors-license-fallback-2026"
    )
    .update(body)
    .digest("hex");

  const license: License = {
    purchaseCode: `OP-${tenantId}-${Date.now()}`,
    domain: t.domain || "unknown",
    tier: t.tier || "personal",
    installedAt,
    expiresAt: expires,
    features,
    signature,
    issuedBy: "operator-console",
  };

  await withPgTx(async (client) => {
    await auditOn(
      client,
      "license.issue",
      `tenant ${tenantId} license issued`,
      license as unknown as Record<string, unknown>
    );
  });

  return license;
}

export async function rotateHmac(
  tenantId: number,
  newKey: string
): Promise<boolean> {
  try {
    await ensureMigrated();
    return await withPgTx(async (client) => {
      await client.query(`UPDATE tenants SET hmac_key = $1 WHERE id = $2`, [
        newKey,
        tenantId,
      ]);
      await auditOn(
        client,
        "hmac.rotate",
        `tenant ${tenantId} HMAC rotated`
      );
      return true;
    });
  } catch {
    return false;
  }
}

export async function getMetrics() {
  try {
    await ensureMigrated();
    // Dialect-neutral base counts (no FILTER / ::int casts) so the
    // SQLite dev surface returns the same numbers as Postgres.
    const baseCounts = await pgMany<{
      total: number | string;
      active: number | string;
      pending: number | string;
      revoked: number | string;
      business: number | string;
      personal: number | string;
      expiring_soon: number | string;
    }>(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN state = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN state = 'revoked' THEN 1 ELSE 0 END) AS revoked,
        SUM(CASE WHEN tier = 'business' THEN 1 ELSE 0 END) AS business,
        SUM(CASE WHEN tier = 'personal' THEN 1 ELSE 0 END) AS personal,
        SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < $1 THEN 1 ELSE 0 END)
          AS expiring_soon
      FROM tenants
    `, [
      new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
    ]);
    const base = baseCounts[0] as Record<string, number | string> | undefined;
    const auditRow = await pgOne<{ c: number | string }>(
      `SELECT COUNT(*) AS c FROM audit_log
       WHERE created_at > $1`,
      [new Date(Date.now() - 7 * 86400 * 1000).toISOString()]
    );
    // Phase 5: revenue ledger (license_log) + usage (usage_events).
    // Plain WHERE-based queries so the SQLite dev surface behaves
    // identically to Postgres.
    const revTotal = await pgOne<{ total: number | string }>(
      `SELECT COALESCE(SUM(revenue_cents), 0) AS total FROM license_log`
    );
    const rev30 = await pgOne<{ total: number | string }>(
      `SELECT COALESCE(SUM(revenue_cents), 0) AS total FROM license_log
       WHERE created_at > $1`,
      [new Date(Date.now() - 30 * 86400 * 1000).toISOString()]
    );
    const revByTier = await pgMany<{ tier: string; total: number | string }>(
      `SELECT COALESCE(tier, 'unknown') AS tier,
              COALESCE(SUM(revenue_cents), 0) AS total
       FROM license_log GROUP BY tier ORDER BY total DESC`
    );
    const usageTotal = await pgOne<{ c: number | string }>(
      `SELECT COUNT(*) AS c FROM usage_events WHERE kind = 'pageview'`
    );
    const usage7d = await pgOne<{ c: number | string }>(
      `SELECT COUNT(*) AS c FROM usage_events
       WHERE kind = 'pageview' AND created_at > $1`,
      [new Date(Date.now() - 7 * 86400 * 1000).toISOString()]
    );
    // Phase 6: other usage event kinds (3D loads, form submits).
    const modelLoads = await pgOne<{ c: number | string }>(
      `SELECT COUNT(*) AS c FROM usage_events WHERE kind = 'model_3d_load'`
    );
    const formSubmits = await pgOne<{ c: number | string }>(
      `SELECT COUNT(*) AS c FROM usage_events WHERE kind = 'form_submit'`
    );
    const topPaths = await pgMany<{ path: string; c: number | string }>(
      `SELECT COALESCE(path, '/') AS path, COUNT(*) AS c
       FROM usage_events WHERE kind = 'pageview'
       GROUP BY path ORDER BY c DESC LIMIT 10`
    );
    const num = (v: number | string | null | undefined) => Number(v ?? 0);
    return {
      total: num(base?.total),
      active: num(base?.active),
      pending: num(base?.pending),
      revoked: num(base?.revoked),
      business: num(base?.business),
      personal: num(base?.personal),
      expiringSoon: num(base?.expiring_soon),
      auditLast7d: num(auditRow?.c),
      revenueCents: num(revTotal?.total),
      revenue30dCents: num(rev30?.total),
      revenueByTier: (revByTier || []).map((r) => ({
        tier: r.tier,
        cents: num(r.total),
      })),
      pageviews: num(usageTotal?.c),
      pageviews7d: num(usage7d?.c),
      modelLoads: num(modelLoads?.c),
      formSubmits: num(formSubmits?.c),
      topPaths: (topPaths || []).map((r) => ({
        path: r.path,
        count: num(r.c),
      })),
    };
  } catch {
    return {
      total: 0,
      active: 0,
      pending: 0,
      revoked: 0,
      business: 0,
      personal: 0,
      expiringSoon: 0,
      auditLast7d: 0,
      revenueCents: 0,
      revenue30dCents: 0,
      revenueByTier: [],
      pageviews: 0,
      pageviews7d: 0,
      modelLoads: 0,
      formSubmits: 0,
      topPaths: [],
    };
  }
}

/**
 * Phase 5: audited login-as. Verifies the target admin user exists
 * and is active, then records an admin.login-as audit entry. The
 * route mints the NextAuth session cookie for the returned user.
 */
export async function getLoginAsTarget(userId: number) {
  await ensureMigrated();
  const u = await pgOne<{
    id: number;
    email: string;
    role: string;
    is_active: number | boolean;
    tenant_id: number | null;
  }>(
    `SELECT id, email, role, is_active, tenant_id FROM users
     WHERE id = $1 LIMIT 1`,
    [userId]
  );
  if (!u) throw new Error("user not found");
  if (Number(u.is_active) !== 1 && u.is_active !== true) {
    throw new Error("user is deactivated");
  }
  await withPgTx(async (client) => {
    await auditOn(client, "admin.login-as", `superadmin signed in as ${u.email}`, {
      user_id: u.id,
      tenant_id: u.tenant_id,
    });
  });
  return u;
}

export async function listTenantUsers(tenantId: number) {
  try {
    await ensureMigrated();
    return await pgMany(
      `SELECT id, email, role, is_active, created_at
       FROM users WHERE tenant_id = $1
       ORDER BY id DESC`,
      [tenantId]
    );
  } catch {
    return [];
  }
}

export async function listAnnouncements() {
  try {
    await ensureMigrated();
    return await pgMany(
      `SELECT id, title, body, audience, is_active, created_at
       FROM announcements ORDER BY id DESC`
    );
  } catch {
    return [];
  }
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  audience: string;
  is_active: boolean;
}) {
  await ensureMigrated();
  return await withPgTx(async (client) => {
    const r = await client.query(
      `INSERT INTO announcements (title, body, audience, is_active)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [input.title, input.body, input.audience, input.is_active]
    );
    await auditOn(client, "announcement.create", input.title, {
      audience: input.audience,
    });
    return r.rows?.[0]?.id as number | undefined;
  });
}

export async function updateAnnouncement(
  id: number,
  patch: { title?: string; body?: string; audience?: string; is_active?: boolean }
) {
  return await withPgTx(async (client) => {
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      sets.push(`${k} = $${sets.length + 1}`);
      vals.push(v);
    }
    if (sets.length === 0) return false;
    vals.push(id);
    await client.query(
      `UPDATE announcements SET ${sets.join(", ")} WHERE id = $${vals.length}`,
      vals
    );
    await auditOn(client, "announcement.update", `announcement ${id} updated`, {
      patch: Object.keys(patch),
    });
    return true;
  });
}

export async function deleteAnnouncement(id: number) {
  return await withPgTx(async (client) => {
    await client.query(`DELETE FROM announcements WHERE id = $1`, [id]);
    await auditOn(client, "announcement.delete", `announcement ${id} deleted`);
    return true;
  });
}

export async function getAuditLog(limit = 50) {
  try {
    await ensureMigrated();
    return await pgMany(
      `SELECT id, kind, message, meta, created_at FROM audit_log
       ORDER BY id DESC LIMIT $1`,
      [limit]
    );
  } catch {
    return [];
  }
}

async function auditOn(
  client: import("pg").PoolClient,
  kind: string,
  message: string,
  meta?: Record<string, unknown>
) {
  try {
    await client.query(
      `INSERT INTO audit_log (kind, message, meta)
       VALUES ($1, $2, $3::jsonb)`,
      [kind, message, meta ? JSON.stringify(meta) : null]
    );
  } catch {
    /* read-only fallback - audit row simply skipped */
  }
}
