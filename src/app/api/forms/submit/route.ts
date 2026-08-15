import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { recordUsage } from "@/lib/usage";
import {
  FormField,
  sanitizePayload,
  validateSubmission,
} from "@/lib/forms";

/**
 * Pull the first present value among the given payload keys
 * (case-insensitive). Used to map free-form form fields onto the
 * lead columns: name / email / phone.
 */
function pick(values: Record<string, string>, keys: string[]): string {
  const lower = new Map<string, string>();
  for (const [k, v] of Object.entries(values)) lower.set(k.toLowerCase(), v);
  for (const key of keys) {
    const v = lower.get(key.toLowerCase());
    if (v && v.trim()) return v.trim();
  }
  return "";
}

const NAME_KEYS = ["name", "full_name", "fullname", "your_name", "contact_name"];
const EMAIL_KEYS = ["email", "email_address", "emailaddress"];
const PHONE_KEYS = ["phone", "phone_number", "phonenumber", "mobile", "tel", "whatsapp"];

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
    // Module 1 lead inbox: a submitted contact form also lands a lead
    // row with source='website'. Both inserts share one transaction so
    // a submission can never exist without its lead (or vice versa).
    const leadName =
      pick(payload, NAME_KEYS) ||
      pick(payload, EMAIL_KEYS) ||
      pick(payload, PHONE_KEYS);
    const leadEmail = pick(payload, EMAIL_KEYS) || null;
    const leadPhone = pick(payload, PHONE_KEYS) || null;
    const hasLeadIdentity = Boolean(leadName || leadEmail || leadPhone);

    const inserted = await withPgTx(async (client) => {
      const res = await client.query(
        `INSERT INTO form_submissions (form_id, payload)
         VALUES ($1, $2::jsonb)
         RETURNING id`,
        [def.id, JSON.stringify(payload)]
      );
      if (hasLeadIdentity) {
        await client.query(
          `INSERT INTO leads (name, phone, email, source, status, score)
           VALUES ($1, $2, $3, 'website', 'new', 0)`,
          [leadName || "Website enquiry", leadPhone, leadEmail]
        );
      }
      return res.rows?.[0];
    });
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
