/**
 * src/lib/forms.ts
 *
 * Shared types + validation for the Phase 2 forms builder.
 * A form definition is a row in form_definitions whose `fields`
 * column (JSONB on Postgres, TEXT on SQLite) holds an array of
 * FormField. Submissions store the flat values object keyed by
 * field.key in form_submissions.payload.
 */

export type FormFieldType =
  | "text"
  | "email"
  | "tel"
  | "textarea"
  | "select";

export type FormField = {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  /** select only: allowed options */
  options?: string[];
};

export type FormDefinition = {
  id: number;
  slug: string;
  title: string;
  fields: FormField[];
  submit_label: string | null;
  success_message: string | null;
  is_published: boolean;
  created_at: string | null;
  submission_count?: number;
};

export const FIELD_TYPES: FormFieldType[] = [
  "text",
  "email",
  "tel",
  "textarea",
  "select",
];

const KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;

export function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Admin-side validation of a field array (called on definition save). */
export function validateFields(fields: unknown): {
  ok: boolean;
  error?: string;
  fields?: FormField[];
} {
  if (!Array.isArray(fields) || fields.length === 0) {
    return { ok: false, error: "A form needs at least one field." };
  }
  const seen = new Set<string>();
  const out: FormField[] = [];
  for (const f of fields) {
    const raw = (f ?? {}) as Record<string, unknown>;
    const key = String(raw.key ?? "").trim();
    const label = String(raw.label ?? "").trim();
    const type = String(raw.type ?? "text") as FormFieldType;
    if (!key || !KEY_RE.test(key)) {
      return {
        ok: false,
        error:
          "Field keys must be lowercase a-z, digits or underscore (e.g. full_name).",
      };
    }
    if (seen.has(key)) {
      return { ok: false, error: `Duplicate field key: ${key}` };
    }
    seen.add(key);
    if (!label) {
      return { ok: false, error: `Field "${key}" needs a label.` };
    }
    if (!FIELD_TYPES.includes(type)) {
      return { ok: false, error: `Field "${key}" has an unknown type.` };
    }
    if (type === "select") {
      const options = Array.isArray(raw.options)
        ? raw.options.map((o) => String(o)).filter(Boolean)
        : [];
      if (options.length === 0) {
        return {
          ok: false,
          error: `Select field "${key}" needs at least one option.`,
        };
      }
      out.push({ key, label, type, required: Boolean(raw.required), options });
      continue;
    }
    out.push({ key, label, type, required: Boolean(raw.required) });
  }
  return { ok: true, fields: out };
}

/** Public-side validation of a submitted values object (called on submit). */
export function validateSubmission(
  fields: FormField[],
  values: unknown
): { ok: boolean; error?: string; values?: Record<string, string> } {
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    return { ok: false, error: "Invalid submission payload." };
  }
  const v = values as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const f of fields) {
    const val = v[f.key];
    const str = val === undefined || val === null ? "" : String(val).trim();
    if (f.required && !str) {
      return { ok: false, error: `${f.label} is required.` };
    }
    if (str && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str)) {
      return { ok: false, error: `${f.label} looks like an invalid email.` };
    }
    if (str && f.type === "select" && f.options && !f.options.includes(str)) {
      return { ok: false, error: `${f.label} has an invalid option.` };
    }
    out[f.key] = str;
  }
  return { ok: true, values: out };
}

/** Max length guard for submission values (keeps payloads sane). */
export const MAX_FIELD_LENGTH = 5000;

export function sanitizePayload(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(values)) {
    out[k] = String(val).slice(0, MAX_FIELD_LENGTH);
  }
  return out;
}
