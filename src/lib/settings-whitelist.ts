import "server-only";

/**
 * Phase A (TS-006) settings whitelist + typed input map.
 *
 * The settings table is generic (key TEXT PRIMARY KEY, value TEXT),
 * but the only keys this codebase actually reads are the nine
 * seeded in scripts/migrate.mjs. To keep Phase A editable without
 * exposing a generic KV surface (which would let an editor break
 * public reads by overwriting a key the schema relies on), we
 * whitelist the editable set here.
 *
 * Shape:
 *   - `kind` controls the input element rendered by AdminSettings:
 *       'email'     -> <input type="email">
 *       'url'       -> <input type="url">
 *       'text'      -> <input type="text">
 *       'longtext'  -> <textarea>
 *   - `label` is human-readable text shown to the editor.
 *   - `placeholder` is the empty-state hint.
 *   - `description` is a single sentence under the input.
 *   - `allowNew` marks a key as one an admin can register a new
 *     value for (PUT on a key not in this list is rejected unless
 *     body.advertise_new === true and the key is extension-eligible;
 *     today no key carries allowNew=true so the hybrid extension
 *     surface ships ready but inert until a later session lights
 *     one up).
 *
 * Maintenance: when scripts/migrate.mjs grows a new seed key,
 * add a corresponding entry here.
 */

export type SettingsKind = "email" | "url" | "text" | "longtext";

export type WhitelistEntry = {
  kind: SettingsKind;
  label: string;
  placeholder?: string;
  description?: string;
  allowNew?: boolean;
};

export const SETTINGS_WHITELIST: Record<string, WhitelistEntry> = {
  contact_email: {
    kind: "email",
    label: "Contact email",
    placeholder: "studio@example.com",
    description: "Public reply-to on the contact form.",
  },
  contact_phone: {
    kind: "text",
    label: "Contact phone",
    placeholder: "+91 99999 99999",
    description: "Optional. Renders under studio address.",
  },
  studio_address: {
    kind: "longtext",
    label: "Studio address",
    placeholder: "1F, building, street, city 000000",
    description: "Multi-line. Renders in the footer and /contact.",
  },
  calendly_url: {
    kind: "url",
    label: "Calendly URL",
    placeholder: "https://calendly.com/your-studio/intro",
    description: "Used by the Begin a project CTA when present.",
  },
  site_seo_title: {
    kind: "text",
    label: "SEO title",
    placeholder: "Studio - Residential Interior Design",
    description: "Default <title>*site_seo_title</title>.",
  },
  site_seo_description: {
    kind: "longtext",
    label: "SEO description",
    placeholder: "A residential studio shaping considered spaces.",
    description: "Default <meta name='description'>.",
  },
  instagram_url: {
    kind: "url",
    label: "Instagram URL",
    placeholder: "https://instagram.com/your-studio",
    description: "Optional. Renders in the footer.",
  },
  year_established: {
    kind: "text",
    label: "Year established",
    placeholder: "2018",
    description: "Optional. Footer + numbers strip.",
  },
  residences_delivered: {
    kind: "text",
    label: "Residences delivered",
    placeholder: "42",
    description: "Optional. Numbers strip counter.",
  },
};

export function isWhitelisted(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(SETTINGS_WHITELIST, key);
}

export function getWhitelistEntry(key: string): WhitelistEntry | null {
  return SETTINGS_WHITELIST[key] ?? null;
}

/**
 * Extension surface: list of keys an admin can register a new
 * value for via POST /api/settings (create-new). Today this is
 * empty; the surface exists so future Phase-A2 work that wants
 * operators to register their own keys does not need another
 * API contract.
 */
export function getCreateableEntries(): Array<{
  key: string;
  entry: WhitelistEntry;
}> {
  return Object.entries(SETTINGS_WHITELIST)
    .filter(([, e]) => e.allowNew === true)
    .map(([key, entry]) => ({ key, entry }));
}

/**
 * Validate that a value matches the kind for a whitelisted key.
 * Empty values pass (the editor lets an operator clear a key
 * to fall back to the seed default).
 */
export function validateValue(
  entry: WhitelistEntry,
  value: string
): { ok: true } | { ok: false; reason: string } {
  if (entry.kind === "email") {
    if (!value) return { ok: true };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { ok: false, reason: "Not a valid email address" };
    }
  } else if (entry.kind === "url") {
    if (!value) return { ok: true };
    try {
      const u = new URL(value);
      if (!(u.protocol === "http:" || u.protocol === "https:")) {
        return { ok: false, reason: "URL must start with http:// or https://" };
      }
    } catch {
      return { ok: false, reason: "Not a valid URL" };
    }
  } else if (entry.kind === "text" || entry.kind === "longtext") {
    if (value.length > 2000) {
      return { ok: false, reason: "Value exceeds 2000 chars" };
    }
  }
  return { ok: true };
}

/**
 * Convert a list of DB rows ({ key, value }, possibly with
 * unknown keys from a stale seed) into the whitelist-shaped
 * array AdminSettings consumes. Unknown keys are filtered out
 * unless `includeUnknown` is set.
 */
export function shapeRowsForEditor(
  rows: Array<{ key: string; value: string }>,
  includeUnknown = false
): Array<{
  key: string;
  value: string;
  entry: WhitelistEntry;
}> {
  const out: Array<{
    key: string;
    value: string;
    entry: WhitelistEntry;
  }> = [];
  for (const row of rows) {
    const entry = getWhitelistEntry(row.key);
    if (!entry) {
      if (includeUnknown) {
        out.push({
          key: row.key,
          value: row.value ?? "",
          entry: {
            kind: "text",
            label: row.key,
            description: "Unknown key - read-only.",
            allowNew: false,
          },
        });
      }
      continue;
    }
    out.push({ key: row.key, value: row.value ?? "", entry });
  }
  return out
    .sort((a, b) =>
      a.entry.label.localeCompare(b.entry.label, "en", { sensitivity: "base" })
    );
}
