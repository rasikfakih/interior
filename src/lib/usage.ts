import { ensureMigrated, pgMany, pgOne, withPgTx } from "@/lib/pg";

/**
 * Phase 5: lightweight usage recording for the superadmin metrics.
 * The public layout's UsageBeacon POSTs { path, host } to
 * /api/usage/record; the tenant is resolved by host so the studio
 * sees pageviews per tenant. Fire-and-forget by design - a failed
 * record never blocks the page it happened on.
 */
export async function recordUsage(kind: string, path: string, meta?: unknown) {
  try {
    await ensureMigrated();
    const host = meta && typeof meta === "object" && "host" in meta
      ? String((meta as { host: unknown }).host ?? "").toLowerCase()
      : "";
    const hostClean = host.replace(/:\d+$/, "");

    // Resolve tenant: exact domain match first, then hostname of the
    // tenant's configured domain (a "www."-prefixed request still maps).
    let tenantId: number | null = null;
    if (hostClean) {
      const row = await pgOne<{ id: number }>(
        `SELECT id FROM tenants
         WHERE LOWER(domain) = $1 OR LOWER(domain) = $2
         LIMIT 1`,
        [hostClean, `www.${hostClean}`]
      );
      tenantId = row?.id ?? null;
    }

    await withPgTx(async (client) => {
      await client.query(
        `INSERT INTO usage_events (tenant_id, kind, path, meta)
         VALUES ($1, $2, $3, $4)`,
        [tenantId, kind, path, JSON.stringify(meta ?? null)]
      );
    });
    return true;
  } catch {
    return false;
  }
}

/** Resolve a hostname to its tenant id, or null for the studio itself. */
export async function tenantIdForHost(host: string) {
  try {
    await ensureMigrated();
    const hostClean = host.replace(/:\d+$/, "").toLowerCase();
    const row = await pgOne<{ id: number }>(
      `SELECT id FROM tenants
       WHERE LOWER(domain) = $1 OR LOWER(domain) = $2
       LIMIT 1`,
      [hostClean, `www.${hostClean}`]
    );
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/** Kept for callers that want the raw recent pageviews directly. */
export async function recentPageviews(limit = 200) {
  try {
    await ensureMigrated();
    return await pgMany(
      `SELECT id, tenant_id, kind, path, meta, created_at
       FROM usage_events WHERE kind = 'pageview'
       ORDER BY id DESC LIMIT $1`,
      [limit]
    );
  } catch {
    return [];
  }
}
