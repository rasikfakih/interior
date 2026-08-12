import fs from "node:fs";
import path from "node:path";
import { ensureMigrated, pgMany } from "@/lib/pg";

/**
 * Phase 6: operator backup service.
 *
 * Generates a full-table JSON snapshot through the shared pg layer, so
 * the same code works against live Postgres (operator console) and the
 * local SQLite dev fallback. Mirrors the standalone
 * scripts/export-postgres.mjs contract ({ generated_at, source, tables })
 * without spawning a child process, which is fragile on serverless.
 *
 * Persistence to data/backups/ is best-effort: it works on the
 * operator's own machine / self-hosted deployments, and is ephemeral
 * on Vercel serverless (the POST response carries the snapshot itself
 * when ?download=1 so a backup never depends on disk).
 */

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

// Full known schema surface (both Postgres bootstrap + SQLite DDL).
const TABLES = [
  "projects",
  "testimonials",
  "team_members",
  "journal_posts",
  "settings",
  "users",
  "media",
  "pages",
  "page_blocks",
  "menus",
  "menu_items",
  "site_identity",
  "translations",
  "revisions",
  "audit_log",
  "tenants",
  "tenant_data",
  "newsletter_subscribers",
  "project_rooms",
  "form_definitions",
  "form_submissions",
  "redirects",
  "usage_events",
  "license_log",
  "announcements",
  "license",
  "hmac_audit",
  "distro",
];

export type BackupSnapshot = {
  generated_at: string;
  source: string;
  tables: Record<string, { present: boolean; rows: unknown[] }>;
};

function todayStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}-${p(
    d.getUTCHours()
  )}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

export async function generateBackupSnapshot(): Promise<{
  snapshot: BackupSnapshot;
  rows: number;
  bytes: number;
}> {
  await ensureMigrated();
  const tables: BackupSnapshot["tables"] = {};
  let rows = 0;
  for (const t of TABLES) {
    try {
      const r = await pgMany(`SELECT * FROM "${t}"`);
      tables[t] = { present: true, rows: r };
      rows += r.length;
    } catch {
      // Table absent on this surface (e.g. old SQLite seed) - record
      // as absent rather than aborting the whole backup.
      tables[t] = { present: false, rows: [] };
    }
  }
  const snapshot: BackupSnapshot = {
    generated_at: new Date().toISOString(),
    source: process.env.DATABASE_URL ? "Postgres" : "SQLite fallback",
    tables,
  };
  const bytes = Buffer.byteLength(JSON.stringify(snapshot));
  return { snapshot, rows, bytes };
}

/** Best-effort write to data/backups/. Returns the file name or null. */
export function persistBackup(snapshot: BackupSnapshot): string | null {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const file = `backup-${todayStamp()}.json`;
    fs.writeFileSync(path.join(BACKUP_DIR, file), JSON.stringify(snapshot, null, 2));
    return file;
  } catch {
    return null;
  }
}

export type BackupFile = {
  name: string;
  bytes: number;
  mtime: string;
};

export function listBackupFiles(): BackupFile[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const st = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          bytes: st.size,
          mtime: st.mtime.toISOString(),
        };
      })
      .sort((a, b) => (a.name < b.name ? 1 : -1));
  } catch {
    return [];
  }
}

/** Safe read of a backup file by name. Returns null on missing/traversal. */
export function readBackupFile(name: string): { name: string; data: string } | null {
  if (!/^[A-Za-z0-9._-]+\.json$/.test(name)) return null;
  const p = path.join(BACKUP_DIR, name);
  if (!p.startsWith(BACKUP_DIR)) return null;
  try {
    if (!fs.existsSync(p)) return null;
    return { name, data: fs.readFileSync(p, "utf8") };
  } catch {
    return null;
  }
}
