import { NextResponse } from "next/server";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { FormField } from "@/lib/forms";

type Ctx = { params: Promise<{ slug: string }> };

function parseFields(raw: unknown): FormField[] {
  if (Array.isArray(raw)) return raw as FormField[];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? (p as FormField[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Public read of one published form definition. Only the fields
 * needed to render the form are exposed - never submission data
 * or the admin-only catalog.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  await ensureMigrated();
  const def = await pgOne(
    `SELECT slug, title, fields, submit_label, success_message
     FROM form_definitions
     WHERE slug = $1 AND is_published = TRUE
     LIMIT 1`,
    [slug]
  );
  if (!def) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
  return NextResponse.json({
    slug: def.slug,
    title: def.title,
    fields: parseFields(def.fields),
    submit_label: def.submit_label,
    success_message: def.success_message,
  });
}
