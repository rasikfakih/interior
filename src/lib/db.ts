/**
 * Single SQLite open/close helper for the lambda runtime.
 *
 * Vercel serverless filesystem is read-only except /tmp. On first
 * cold-start this helper copies the bundled data/etihad.db to
 * /tmp/etihad-{region}.db, opens it read-write, and pragmas it
 * for short-lived single-process use (no WAL/SHM sidecars).
 *
 * `db` is the standard drizzle-backed handle that the rest of the
 * app uses. Server-side consumers should call `openDb()` directly
 * for write contexts (single open per request, close after).
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

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

let _sqlite: Database.Database | null = null;
let _drizzle: ReturnType<typeof drizzle> | null = null;

export function openDb(): Database.Database {
  if (_sqlite) return _sqlite;
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

export function openReadonlyDb(): Database.Database {
  ensureCopied();
  return new Database(pickTargetPath(), { readonly: true, fileMustExist: false });
}

export function getDrizzle() {
  if (_drizzle) return _drizzle;
  _drizzle = drizzle(openDb(), { schema });
  return _drizzle;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return Reflect.get(getDrizzle(), prop);
  },
});

export function resetSqliteHandle(): void {
  if (_sqlite) {
    try { _sqlite.close(); } catch { /* ignore */ }
  }
  _sqlite = null;
  _drizzle = null;
}

export const DB_PATH_HINT = pickTargetPath();
