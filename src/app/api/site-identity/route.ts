import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { appendAudit } from "@/lib/license";
import { ensureMigrated, pgOne, pgQuery } from "@/lib/pg";

/**
 * TS-006 Phase B - site-identity editor.
 *
 * /api/site-identity is the admin read/write surface for the single
 * row in `site_identity`. Public reads stay on /api/health/db or
 * direct pg consumer (themes table shape is mirrored in
 * data/theme.distro.json as the override).
 *
 * Auth: requireAdminSession -> 401 anon, 200 admin/superadmin.
 * Both roles can read+write (the editor publishes through this API).
 *
 * Allowed fields (TS-006 plan amendment #4, operator override):
 *   brand_name, tagline, accent_mode, footer_credit
 *   + logo_url, favicon_url (added by operator override).
 *
 * accent_mode is restricted to ('light' | 'dark' | 'auto') to keep
 * the surrounding app's mirror logic stable.
 *
 * Each PUT emits an appendAudit entry with kind `site_identity.update`
 * and a meta payload containing the previous value of every changed
 * field.
 */

const ALLOWED_FIELDS = [
  "brand_name",
  "tagline",
  "accent_mode",
  "footer_credit",
  "logo_url",
  "favicon_url",
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

const ALLOWED_ACCENT = new Set(["light", "dark", "auto"]);

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

function shape(row: SiteIdentity) {
  return {
    id: row.id,
    brand_name: row.brand_name,
    tagline: row.tagline,
    logo_media_id: row.logo_media_id,
    favicon_media_id: row.favicon_media_id,
    logo_url: row.logo_url,
    favicon_url: row.favicon_url,
    accent_mode: row.accent_mode,
    footer_credit: row.footer_credit,
  };
}

export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  await ensureMigrated();
  const row = (await pgOne(
    `SELECT id, brand_name, tagline, logo_media_id, favicon_media_id,
            logo_url, favicon_url, accent_mode, footer_credit
       FROM site_identity
      ORDER BY id ASC
      LIMIT 1`
  )) as SiteIdentity | null;
  if (!row) {
    return NextResponse.json(
      {
        id: 0,
        brand_name: "Etihad Interiors",
        tagline: null,
        logo_media_id: null,
        favicon_media_id: null,
        logo_url: null,
        favicon_url: null,
        accent_mode: "auto",
        footer_credit: null,
      },
      { status: 200 }
    );
  }
  return NextResponse.json(shape(row));
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON object required" }, { status: 400 });
  }

  const patch: Partial<Record<AllowedField, string | null>> = {};
  for (const key of ALLOWED_FIELDS) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value == null) {
      patch[key] = null;
      continue;
    }
    if (typeof value !== "string") {
      return NextResponse.json(
        { error: `Field "${key}" must be a string or null`, key },
        { status: 400 }
      );
    }
    const trimmed = value.trim();
    if (trimmed.length > 2000) {
      return NextResponse.json(
        { error: `Field "${key}" exceeds 2000 chars`, key },
        { status: 400 }
      );
    }
    patch[key] = trimmed;
  }

  if (patch.accent_mode != null && !ALLOWED_ACCENT.has(patch.accent_mode)) {
    return NextResponse.json(
      {
        error: `accent_mode must be one of: ${Array.from(ALLOWED_ACCENT).join(", ")}`,
        got: patch.accent_mode,
      },
      { status: 400 }
    );
  }

  if (patch.logo_url != null && patch.logo_url.length > 0) {
    try {
      const u = new URL(patch.logo_url);
      if (!(u.protocol === "http:" || u.protocol === "https:")) {
        return NextResponse.json(
          { error: "logo_url must start with http:// or https://" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "logo_url is not a valid URL" },
        { status: 400 }
      );
    }
  }
  if (patch.favicon_url != null && patch.favicon_url.length > 0) {
    try {
      const u = new URL(patch.favicon_url);
      if (!(u.protocol === "http:" || u.protocol === "https:")) {
        return NextResponse.json(
          { error: "favicon_url must start with http:// or https://" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "favicon_url is not a valid URL" },
        { status: 400 }
      );
    }
  }

  const keys = Object.keys(patch) as AllowedField[];
  if (keys.length === 0) {
    return NextResponse.json(
      { error: "No editable fields supplied", allowed: ALLOWED_FIELDS },
      { status: 400 }
    );
  }

  await ensureMigrated();
  const existing = (await pgOne(
    `SELECT id, brand_name, tagline, logo_media_id, favicon_media_id,
            logo_url, favicon_url, accent_mode, footer_credit
       FROM site_identity ORDER BY id ASC LIMIT 1`
  )) as SiteIdentity | null;

  const baseline: SiteIdentity = existing ?? {
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

  const next: SiteIdentity = { ...baseline };
  for (const k of keys) {
    (next as unknown as Record<AllowedField, string | null>)[k] = patch[k] ?? null;
  }

  let row: SiteIdentity | null = null;
  if (existing) {
    const setSql = keys
      .map((k, i) => `${k} = $${i + 1}`)
      .join(", ");
    const params: Array<string | null> = keys.map((k) => patch[k] ?? null);
    const rr = await pgQuery(
      `UPDATE site_identity SET ${setSql} WHERE id = ${existing.id}
       RETURNING id, brand_name, tagline, logo_media_id, favicon_media_id,
                 logo_url, favicon_url, accent_mode, footer_credit`,
      params
    );
    row = (rr.rows?.[0] as SiteIdentity | undefined) ?? null;
  } else {
    const insertCols = [
      "brand_name",
      "tagline",
      "logo_media_id",
      "favicon_media_id",
      "logo_url",
      "favicon_url",
      "accent_mode",
      "footer_credit",
    ];
    const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(", ");
    const params: Array<string | null> = insertCols.map((c) => {
      const v = (next as unknown as Record<string, string | null>)[c] ?? null;
      return v;
    });
    const rr = await pgQuery(
      `INSERT INTO site_identity (${insertCols.join(", ")})
       VALUES (${placeholders})
       RETURNING id, brand_name, tagline, logo_media_id, favicon_media_id,
                 logo_url, favicon_url, accent_mode, footer_credit`,
      params
    );
    row = (rr.rows?.[0] as SiteIdentity | undefined) ?? null;
  }

  const changed: Record<string, { before: string | null; after: string | null }> = {};
  for (const k of keys) {
    const before = (baseline as unknown as Record<string, string | null>)[k] ?? null;
    const after = (next as unknown as Record<string, string | null>)[k] ?? null;
    if (before !== after) {
      changed[k] = { before: before ?? null, after: after ?? null };
    }
  }

  await appendAudit(
    "site_identity.update",
    `site_identity updated (${keys.length} fields touched)`,
    {
      fields: keys,
      changed,
      role: gate.role,
    }
  );

  return NextResponse.json({ success: true, item: row ? shape(row) : null });
}
