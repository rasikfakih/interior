import "server-only";
import crypto from "crypto";
import { ensureMigrated, pgMany, pgOne, pgQuery, withPgTx } from "@/lib/pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * revisions.ts - StudioOS Phase 1 page revisioning + draft preview.
 *
 * WordPress-grade history: every page save snapshots the full page
 * (meta + blocks) into `revisions` (entity_type='page'); the editor
 * can list and restore any snapshot. Draft preview issues a short-lived
 * HMAC-signed token so the public /preview route can render a draft
 * page without exposing the admin session.
 */

export type PageSnapshot = {
  meta: Record<string, unknown>;
  blocks: Array<{ type: string; data: unknown }>;
};

export type RevisionRow = {
  id: number;
  entity_type: string;
  entity_id: number;
  payload: unknown;
  saved_by_id: number | null;
  saved_at: string;
};

function parsePayload(payload: unknown): PageSnapshot | null {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as PageSnapshot;
    } catch {
      return null;
    }
  }
  if (typeof payload === "object" && payload != null) return payload as PageSnapshot;
  return null;
}

async function currentUserId(): Promise<number | null> {
  try {
    const session = await getServerSession(authOptions);
    return Number((session?.user as { id?: unknown })?.id) || null;
  } catch {
    return null;
  }
}

/** Snapshot the current page state (meta + blocks) into revisions. */
export async function snapshotPage(pageId: number): Promise<number | null> {
  await ensureMigrated();
  const page = await pgOne<Record<string, unknown>>(
    `SELECT id, slug, title, status, is_front, seo_title, seo_description,
            og_media_id, robots, published_at
     FROM pages WHERE id = $1 LIMIT 1`,
    [pageId]
  );
  if (!page) return null;
  const blocks = await pgMany<{ type: string; data: unknown }>(
    `SELECT type, data FROM page_blocks
     WHERE page_id = $1 ORDER BY order_index ASC, id ASC`,
    [pageId]
  );
  const savedBy = await currentUserId();
  const payload: PageSnapshot = {
    meta: {
      slug: page.slug,
      title: page.title,
      status: page.status,
      is_front: page.is_front,
      seo_title: page.seo_title ?? null,
      seo_description: page.seo_description ?? null,
      og_media_id: page.og_media_id ?? null,
      robots: page.robots ?? null,
      published_at: page.published_at ?? null,
    },
    blocks: blocks.map((b) => ({
      type: b.type,
      data: typeof b.data === "string" ? safeJson(b.data) : b.data,
    })),
  };
  const r = await pgQuery<{ id: number }>(
    `INSERT INTO revisions (entity_type, entity_id, payload, saved_by_id)
     VALUES ('page', $1, $2::jsonb, $3)
     RETURNING id`,
    [pageId, JSON.stringify(payload), savedBy]
  );
  return r.rows?.[0]?.id ?? null;
}

/** List revisions newest-first. */
export async function listPageRevisions(pageId: number): Promise<RevisionRow[]> {
  await ensureMigrated();
  const rows = await pgMany<RevisionRow>(
    `SELECT id, entity_type, entity_id, payload, saved_by_id, saved_at
     FROM revisions
     WHERE entity_type = 'page' AND entity_id = $1
     ORDER BY id DESC LIMIT 50`,
    [pageId]
  );
  return rows.map((r) => ({
    ...r,
    payload: parsePayload(r.payload),
  }));
}

/** Restore a revision: apply its meta + blocks, then snapshot the restored state. */
export async function restorePageRevision(
  pageId: number,
  revId: number
): Promise<{ ok: boolean; error?: string; restored?: PageSnapshot }> {
  await ensureMigrated();
  const rev = await pgOne<RevisionRow>(
    `SELECT id, entity_type, entity_id, payload, saved_by_id, saved_at
     FROM revisions WHERE id = $1 AND entity_type = 'page' AND entity_id = $2 LIMIT 1`,
    [revId, pageId]
  );
  if (!rev) return { ok: false, error: "Revision not found" };
  const snapshot = parsePayload(rev.payload);
  if (!snapshot) return { ok: false, error: "Revision payload unreadable" };

  const meta = snapshot.meta ?? {};
  await withPgTx(async (client) => {
    const setClauses: string[] = [];
    const args: unknown[] = [];
    let i = 1;
    for (const key of [
      "slug",
      "title",
      "status",
      "is_front",
      "seo_title",
      "seo_description",
      "og_media_id",
      "robots",
    ] as const) {
      if (key in meta) {
        setClauses.push(`${key} = $${i++}`);
        args.push(meta[key] ?? null);
      }
    }
    if (setClauses.length > 0) {
      args.push(pageId);
      await client.query(
        `UPDATE pages SET ${setClauses.join(", ")} WHERE id = $${i}`,
        args
      );
    }
    await client.query(`DELETE FROM page_blocks WHERE page_id = $1`, [pageId]);
    const insert =
      "INSERT INTO page_blocks (page_id, type, data, order_index) VALUES ($1, $2, $3::jsonb, $4)";
    for (let i = 0; i < snapshot.blocks.length; i++) {
      const b = snapshot.blocks[i];
      if (!b || typeof b.type !== "string") continue;
      await client.query(insert, [
        pageId,
        b.type,
        JSON.stringify(b.data ?? {}),
        i,
      ]);
    }
  });

  // Record the restored state as the newest revision.
  await snapshotPage(pageId);
  return { ok: true, restored: snapshot };
}

// --- Draft preview tokens ---

const PREVIEW_SECRET =
  process.env.PREVIEW_SECRET || "preview-dev-secret-change-in-prod";
const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

/** Issue a signed preview token for a page. */
export function issuePreviewToken(pageId: number): string {
  const payload = b64url(
    JSON.stringify({ pageId, exp: Date.now() + PREVIEW_TTL_MS })
  );
  const sig = crypto.createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/** Verify a preview token; returns the page id or null. */
export function verifyPreviewToken(token: string): number | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = crypto
      .createHmac("sha256", PREVIEW_SECRET)
      .update(payload)
      .digest("hex");
    if (expected !== sig) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      pageId?: number;
      exp?: number;
    };
    if (typeof parsed.pageId !== "number" || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed.pageId;
  } catch {
    return null;
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
