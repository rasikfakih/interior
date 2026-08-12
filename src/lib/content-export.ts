import { ensureMigrated, isPostgres, pgMany, withPgTx } from "@/lib/pg";

/**
 * Phase 6: tenant content export / import.
 *
 * Export produces a versioned envelope of every tenant content table:
 *   { format: "etihad-content-export", version: 1, exportedAt, source, tables }
 *
 * Import validates the envelope, then REPLACES the content of the
 * tables present in it (children deleted first, parents re-inserted
 * first, explicit ids preserved so FKs stay intact) inside one
 * transaction, then resets id sequences per dialect. This is a
 * restore semantic, not a merge: the UI must warn that importing
 * overwrites existing content.
 */

export const CONTENT_FORMAT = "etihad-content-export";
export const CONTENT_VERSION = 1;

// Parents first (their rows are referenced by children).
const PARENT_TABLES = [
  "pages",
  "projects",
  "menus",
  "form_definitions",
  "media",
  "testimonials",
  "team_members",
  "journal_posts",
  "settings",
  "site_identity",
  "redirects",
];

const CHILD_TABLES = ["page_blocks", "project_rooms", "menu_items", "form_submissions"];

const ALL_TABLES = [...PARENT_TABLES, ...CHILD_TABLES];

// Columns that must be JSON-serialized before insert (PG jsonb; SQLite
// stores them as TEXT, and the shim strips `::jsonb`).
const JSONB_COLUMNS: Record<string, string[]> = {
  page_blocks: ["data"],
  projects: ["description_json"],
  testimonials: ["quote_json"],
  team_members: ["bio_json"],
  journal_posts: ["content_json"],
  project_rooms: ["hotspots"],
  form_definitions: ["fields"],
  form_submissions: ["payload"],
};

export type ContentExport = {
  format: string;
  version: number;
  exportedAt: string;
  source: string;
  tables: Record<string, unknown[]>;
};

export async function exportTenantContent(): Promise<ContentExport> {
  await ensureMigrated();
  const tables: Record<string, unknown[]> = {};
  for (const t of ALL_TABLES) {
    try {
      tables[t] = await pgMany(`SELECT * FROM "${t}" ORDER BY id`);
    } catch {
      tables[t] = [];
    }
  }
  return {
    format: CONTENT_FORMAT,
    version: CONTENT_VERSION,
    exportedAt: new Date().toISOString(),
    source: process.env.DATABASE_URL ? "Postgres" : "SQLite fallback",
    tables,
  };
}

export type ImportResult = {
  ok: boolean;
  error?: string;
  tables: { table: string; rows: number }[];
};

function parseEnvelope(raw: unknown): ContentExport | null {
  if (!raw || typeof raw !== "object") return null;
  const env = raw as ContentExport;
  if (env.format !== CONTENT_FORMAT || env.version !== CONTENT_VERSION) return null;
  if (!env.tables || typeof env.tables !== "object") return null;
  // Reject unknown tables (import file is untrusted input).
  const keys = Object.keys(env.tables);
  const unknown = keys.filter((k) => !ALL_TABLES.includes(k));
  if (unknown.length > 0) return null;
  for (const k of keys) {
    if (!Array.isArray(env.tables[k])) return null;
  }
  return env;
}

/**
 * Import content. Replace-all semantics within one transaction:
 * children deleted first, parents inserted first, explicit ids kept so
 * FK columns still point at the right rows. Sequences reset per
 * dialect afterwards so the next auto-insert never collides.
 */
export async function importTenantContent(raw: unknown): Promise<ImportResult> {
  const env = parseEnvelope(raw);
  if (!env) {
    return {
      ok: false,
      error: "invalid export envelope (format/version/tables)",
      tables: [],
    };
  }

  const counts: ImportResult["tables"] = [];
  try {
    await withPgTx(async (client) => {
      // 1. Clear children first (they reference parents), then parents.
      for (const t of [...CHILD_TABLES, ...PARENT_TABLES]) {
        if (!Array.isArray(env.tables[t])) continue;
        await client.query(`DELETE FROM "${t}"`);
      }
      // 2. Insert parents first, then children, preserving explicit ids.
      for (const t of [...PARENT_TABLES, ...CHILD_TABLES]) {
        const rows = env.tables[t];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        for (const row of rows) {
          if (!row || typeof row !== "object" || Array.isArray(row)) {
            throw new Error(`invalid row in ${t}`);
          }
          const r = row as Record<string, unknown>;
          const id = r.id;
          if (typeof id !== "number") throw new Error(`missing numeric id in ${t}`);
          const cols = Object.keys(r).filter((c) => c !== "id");
          if (cols.length === 0) throw new Error(`row in ${t} has no columns`);
          const jsonb = JSONB_COLUMNS[t] ?? [];
          const colSql = cols.map((c) => `"${c}"`).join(", ");
          const ph = cols.map((c) => {
            const cast = jsonb.includes(c) ? "::jsonb" : "";
            return `$${cols.indexOf(c) + 2}${cast}`;
          });
          const values = cols.map((c) => {
            const v = r[c];
            return jsonb.includes(c) && v != null && typeof v === "object"
              ? JSON.stringify(v)
              : v;
          });
          await client.query(
            `INSERT INTO "${t}" ("id", ${colSql}) VALUES ($1, ${ph})`,
            [id, ...values]
          );
        }
        counts.push({ table: t, rows: rows.length });
      }
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message, tables: counts };
  }

  // 3. Reset sequences per dialect (best-effort; a failed reset must
  // not fail the import - next auto-insert is the only casualty).
  try {
    await ensureMigrated();
    if (isPostgres()) {
      for (const t of ALL_TABLES) {
        try {
          await pgMany(
            `SELECT setval(pg_get_serial_sequence('${t}', 'id'),
             COALESCE(MAX(id), 1)) FROM "${t}"`
          );
        } catch {
          /* sequence missing - fine */
        }
      }
    } else {
      for (const t of ALL_TABLES) {
        try {
          await pgMany(
            `UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM "${t}") WHERE name = $1`,
            [t]
          );
        } catch {
          /* sqlite_sequence row missing - fine */
        }
      }
    }
  } catch {
    /* ignore */
  }

  return { ok: true, tables: counts };
}
