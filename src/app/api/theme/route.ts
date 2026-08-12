import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/license-gate";
import { appendAudit } from "@/lib/license";
import { ensureMigrated, pgOne, pgQuery } from "@/lib/pg";
import { bump } from "@/lib/revalidate";
import {
  resolveThemeFull,
  resolveAdminTenantId,
  parseCustomizer,
  isHex,
  contrast,
  DEFAULT_PALETTE,
  FONT_TOKENS,
  type ThemePalette,
  type ThemeCustomizer,
} from "@/lib/theme";
import { THEME_PRESETS } from "@/lib/theme-presets";

/**
 * /api/theme - tenant theme customizer (StudioOS Phase 1).
 *
 * GET  -> current effective palette + customizer tokens + preset
 *         catalog (for the admin "Theme" tab).
 * PUT  -> validate and merge a partial palette/customizer patch into
 *         the tenant's distro row, preserving every other distro key
 *         (brand_name, hero, footer_credit, ...). Mirrors the
 *         validation rules in scripts/apply-distro.mjs so a value the
 *         CLI rejects is also rejected here.
 *
 * Auth: requireAdminSession (admin + superadmin both edit).
 */

type PalettePatch = Partial<Pick<ThemePalette, "ink" | "paper" | "accent" | "muted">>;
type CustomizerPatch = ThemeCustomizer;

const RADIUS_SCALES = ["sharp", "soft", "pill"] as const;
const DENSITIES = [1, 2, 3] as const;

export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return new NextResponse(gate.response.body, gate.response);
  }
  await ensureMigrated();
  const full = await resolveThemeFull();
  const p = full.palette;
  return NextResponse.json({
    customizer: full.customizer,
    paletteEditable: {
      ink: p.ink,
      paper: p.paper,
      accent: p.accent,
      muted: p.muted || DEFAULT_PALETTE.muted,
    },
    presets: THEME_PRESETS.map((preset) => ({
      slug: preset.slug,
      name: preset.name,
      family: preset.family,
      description: preset.description,
      palette: preset.palette,
    })),
  });
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

  const palette = body.palette && typeof body.palette === "object" ? (body.palette as PalettePatch) : {};
  const customizer = body.customizer && typeof body.customizer === "object" ? (body.customizer as CustomizerPatch) : {};

  const errors = validatePatch(palette, customizer);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  }

  await ensureMigrated();
  const tenantId = await resolveAdminTenantId();
  if (tenantId == null) {
    return NextResponse.json(
      { error: "No tenant row exists yet. Run the migration seed first." },
      { status: 409 }
    );
  }

  // Read the current distro row (JSONB on Postgres, TEXT on SQLite).
  const distroRow = await pgOne<{ id: number; data: unknown }>(
    `SELECT id, data FROM tenant_data
     WHERE tenant_id = $1 AND kind = 'distro'
     ORDER BY updated_at DESC LIMIT 1`,
    [tenantId]
  );

  let merged: Record<string, unknown> = {};
  const current = parseDistroData(distroRow?.data);
  if (current) merged = { ...current };

  // Merge palette keys that were supplied.
  if (Object.keys(palette).length > 0) {
    const currentPalette =
      current && typeof current.palette === "object" && current.palette != null
        ? { ...(current.palette as Record<string, unknown>) }
        : {};
    merged.palette = { ...currentPalette, ...palette };
  }

  // Merge customizer keys that were supplied (fonts merge per role).
  if (Object.keys(customizer).length > 0) {
    const currentCustom = parseCustomizer(current);
    const nextCustom = { ...currentCustom };
    if (customizer.fonts) {
      nextCustom.fonts = { ...(currentCustom.fonts ?? {}), ...customizer.fonts };
    }
    if (customizer.spacing_density != null) nextCustom.spacing_density = customizer.spacing_density;
    if (customizer.motion_intensity != null) nextCustom.motion_intensity = customizer.motion_intensity;
    if (customizer.radius_scale != null) nextCustom.radius_scale = customizer.radius_scale;
    if (Object.keys(nextCustom).length > 0) merged.customizer = nextCustom;
  }

  const serialized = JSON.stringify(merged);
  if (distroRow) {
    await pgQuery(
      `UPDATE tenant_data SET data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [serialized, distroRow.id]
    );
  } else {
    await pgQuery(
      `INSERT INTO tenant_data (tenant_id, kind, data) VALUES ($1, 'distro', $2)`,
      [tenantId, serialized]
    );
  }

  await appendAudit("theme.update", "tenant theme updated from admin customizer", {
    tenantId,
    patch: { palette, customizer },
    role: gate.role,
  });
  bump({ kind: "pages" });

  return NextResponse.json({
    success: true,
    customizer: parseCustomizer(merged),
    paletteEditable: {
      ink: (merged.palette as ThemePalette)?.ink ?? DEFAULT_PALETTE.ink,
      paper: (merged.palette as ThemePalette)?.paper ?? DEFAULT_PALETTE.paper,
      accent: (merged.palette as ThemePalette)?.accent ?? DEFAULT_PALETTE.accent,
      muted: (merged.palette as ThemePalette)?.muted ?? DEFAULT_PALETTE.muted,
    },
  });
}

function parseDistroData(data: unknown): Record<string, unknown> | null {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      return typeof parsed === "object" && parsed != null ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof data === "object" && data != null) return data as Record<string, unknown>;
  return null;
}

function validatePatch(
  palette: PalettePatch,
  customizer: CustomizerPatch
): string[] {
  const errors: string[] = [];
  const paletteKeys = ["ink", "paper", "accent", "muted"] as const;
  for (const k of paletteKeys) {
    const v = palette[k];
    if (v != null && !isHex(v)) {
      errors.push(`palette.${k} is not a 6-digit hex: ${v}`);
    }
  }
  if (palette.ink && palette.paper) {
    const c = contrast(palette.ink, palette.paper);
    if (c < 4.5) errors.push(`palette.ink vs paper fails AA contrast (${c.toFixed(2)}:1)`);
  }
  if (palette.muted && palette.paper) {
    const c = contrast(palette.muted, palette.paper);
    if (c < 4.5) errors.push(`palette.muted vs paper fails AA contrast (${c.toFixed(2)}:1)`);
  }
  if (customizer.fonts && typeof customizer.fonts === "object") {
    for (const role of ["display", "body"] as const) {
      const v = customizer.fonts[role];
      if (v != null && !(FONT_TOKENS as string[]).includes(v)) {
        errors.push(`customizer.fonts.${role} not in allowed set: ${v}`);
      }
    }
  }
  if (customizer.spacing_density != null && !(DENSITIES as readonly number[]).includes(customizer.spacing_density)) {
    errors.push(`customizer.spacing_density must be 1|2|3 (got: ${customizer.spacing_density})`);
  }
  if (customizer.motion_intensity != null) {
    const m = customizer.motion_intensity;
    if (!Number.isInteger(m) || m < 1 || m > 10) {
      errors.push(`customizer.motion_intensity must be an integer 1..10 (got: ${m})`);
    }
  }
  if (customizer.radius_scale != null && !(RADIUS_SCALES as readonly string[]).includes(customizer.radius_scale)) {
    errors.push(`customizer.radius_scale must be sharp|soft|pill (got: ${customizer.radius_scale})`);
  }
  return errors;
}
