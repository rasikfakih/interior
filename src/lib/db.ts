/**
 * Driver-branch DB access (Phase 1 of v1.1.2).
 *
 *   DATABASE_URL unset: identical to v1.1.1. SQLite hot copy, /tmp on
 *     Vercel. `db` proxies the sqlite-drizzle handle.
 *
 *   DATABASE_URL set:    Postgres path. `db` proxies the postgres-js
 *     drizzle handle. `openDb`/`openReadonlyDb` continue to serve the
 *     SQLite handle so the 91 raw-sqlite call sites keep working
 *     against a local data/etihad.db. Phase 2 will port those sites.
 *
 * Until Phase 2 lands, the Postgres path only drives the routes that
 * use the drizzle `db` proxy. Writes from admin/superadmin still hit
 * the SQLite copy on Vercel and will continue to evaporate across
 * cold starts - this is Phase 2 work, not Phase 1.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as sqliteSchema from './schema';

const SOURCE_DB = path.join(process.cwd(), 'data', 'etihad.db');

function isVercel(): boolean {
  return Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
}

function pickTargetPath(): string {
  if (process.env.ETIHAD_DB_PATH) return process.env.ETIHAD_DB_PATH;
  if (isVercel()) {
    const id = process.env.VERCEL_REGION || 'global';
    return `/tmp/etihad-${id}.db`;
  }
  return SOURCE_DB;
}

function ensureCopied(): void {
  if (!isVercel()) return;
  try {
    if (!fs.existsSync(SOURCE_DB)) return;
    const target = pickTargetPath();
    if (fs.existsSync(target)) return;
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(SOURCE_DB, target);
  } catch {
    // best-effort; open path will surface the failure if it can't recover
  }
}

export type DbHandle = Database.Database;

let _sqlite: DbHandle | null = null;
let _sqliteDrizzle: BetterSQLite3Database<typeof sqliteSchema> | null = null;

export function isPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function openDb(): DbHandle {
  ensureCopied();
  const target = pickTargetPath();

  let db: Database.Database;
  try {
    db = new Database(target);
  } catch (e: any) {
    if (e?.code === 'SQLITE_CANTOPEN' && isVercel()) {
      try {
        fs.writeFileSync('/tmp/etihad-empty.db', '');
      } catch { /* ignore */ }
      try {
        db = new Database('/tmp/etihad-empty.db');
      } catch {
        db = new Database(target, { readonly: true, fileMustExist: false });
      }
    } else {
      db = new Database(target, { readonly: true, fileMustExist: false });
    }
  }

  try {
    db.pragma('journal_mode = DELETE');
    db.pragma('synchronous = NORMAL');
  } catch {
    // readonly mode - ignore pragma errors
  }
  _sqlite = db;
  return db;
}

export function openReadonlyDb(): DbHandle {
  ensureCopied();
  return new Database(pickTargetPath(), { readonly: true, fileMustExist: false });
}

export function getSqliteDrizzle() {
  if (_sqliteDrizzle) return _sqliteDrizzle;
  return (_sqliteDrizzle = drizzle(openDb() as DbHandle, { schema: sqliteSchema }));
}

export function openPostgres(): any {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }
  // Lazy require so module evaluation never inits pg.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pg = require('pg') as typeof import('pg');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzlePostgres } = require('./db-postgres') as typeof import('./db-postgres');
  const pool = new pg.Pool({
    connectionString: url,
    ssl: url.includes('supabase.com') || url.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  return drizzlePostgres(pool);
}

export function getDrizzle(): any {
  // Default: SQLite. Postgres arrives once Phase 2 ports the raw-sqlite
  // sites; until then the SQLite handle is the one consistent surface.
  return getSqliteDrizzle();
}

export const db: any = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return Reflect.get(getDrizzle(), prop);
  },
});

export function resetSqliteHandle(): void {
  if (_sqlite) {
    try { _sqlite.close(); } catch { /* ignore */ }
  }
  _sqlite = null;
  _sqliteDrizzle = null;
}

export const DB_PATH_HINT = pickTargetPath();
