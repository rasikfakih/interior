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
             installed_at, expires_at, revoked_at
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
      return true;
    });
  } catch {
    return false;
  }
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
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE state = 'active')::int AS active,
        COUNT(*) FILTER (WHERE state = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE state = 'revoked')::int AS revoked,
        COUNT(*) FILTER (WHERE tier = 'business')::int AS business,
        COUNT(*) FILTER (WHERE tier = 'personal')::int AS personal,
        COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < $1)::int
          AS expiring_soon
      FROM tenants
    `, [
      new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
    ]);
    const base = baseCounts[0] as Record<string, number | string> | undefined;
    const auditRow = await pgOne<{ c: number | string }>(
      `SELECT COUNT(*)::int AS c FROM audit_log
       WHERE created_at > $1`,
      [new Date(Date.now() - 7 * 86400 * 1000).toISOString()]
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
    };
  }
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
