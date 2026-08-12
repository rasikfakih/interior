import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne } from "@/lib/pg";
import { recordUsage } from "@/lib/usage";
import {
  FormField,
  sanitizePayload,
  validateSubmission,
} from "@/lib/forms";

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
 * Public, unauthenticated submit. Only published definitions accept
 * submissions. The body is { slug, values }. This is intentionally
 * separate from /api/forms (which is admin-gated) so the public
 * form block never needs credentials.
 */
export async function POST(req: NextRequest) {
  let body: { slug?: unknown; values?: unknown } | undefined;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const slug = String(body?.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug is required." }, { status: 400 });
  }
  await ensureMigrated();
  const def = await pgOne(
    `SELECT * FROM form_definitions WHERE slug = $1 AND is_published = TRUE LIMIT 1`,
    [slug]
  );
  if (!def) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 });
  }
  const fields = parseFields(def.fields);
  const check = validateSubmission(fields, body?.values);
  if (!check.ok || !check.values) {
    return NextResponse.json({ error: check.error }, { status: 422 });
  }
  const payload = sanitizePayload(check.values);
  try {
    const inserted = await pgOne(
      `INSERT INTO form_submissions (form_id, payload)
       VALUES ($1, $2::jsonb)
       RETURNING id`,
      [def.id, JSON.stringify(payload)]
    );
    if (!inserted) {
      return NextResponse.json({ error: "Submission failed" }, { status: 400 });
    }
    // Phase 6 usage analytics: fire-and-forget form_submit event. The
    // host comes from the request so the event lands on the right
    // tenant; a failed record never fails the submission.
    void recordUsage(
      "form_submit",
      `/forms/${slug}`,
      req.headers.get("host") ? { host: req.headers.get("host") } : undefined
    );
    return NextResponse.json({
      success: true,
      message: def.success_message || "Thanks - we received your message.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Submission failed" },
      { status: 400 }
    );
  }
}
