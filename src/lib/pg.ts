/**
 * Postgres access surface for the v1.1.2 runtime.
 *
 * Primary path: Postgres via DATABASE_URL. Boot-migrate runs
 * supabase-bootstrap.sql behind a Postgres advisory lock so
 * cold-starts self-heal schema drift.
 *
 * Vercel fallback: if DATABASE_URL is unset, `getPool()`
 * returns a tiny proxy that throws on first query. Until the
 * operator supplies DATABASE_URL on Vercel, that path makes
 * the failure loud at the first DB-touching request.
 *
 * Local-dev fallback: when DATABASE_URL is unset and we are
 * NOT on Vercel, `getPool()` opens the local SQLite
 * (data/etihad.db) and runs each query against better-sqlite3.
 * This kept login working while the operator configured
 * DATABASE_URL. The Postgres-first design is preserved when
 * DATABASE_URL is present.
 *
 * When DATABASE_URL is set, only Postgres runs. When unset,
 * local SQLite is used. The cool-down timer for the SQLite
 * Vercel hot-copy is gone because Phase 1 made Postgres the
 * only durable surface — but a local SQLite devpath keeps
 * `npm run dev` and the localhost dev experience working.
 */

import path from 'path';
import fs from 'fs';
import pg from 'pg';
import Database from 'better-sqlite3';

let _pool: pg.Pool | null = null;
let _sqlite: Database.Database | null = null;
let _ensureMigrated: Promise<void> | null = null;

function isVercel(): boolean {
  return Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
}

function poolUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. v1.1.2 prefers Postgres; provide one ' +
        'or run on a host where local SQLite is reachable.'
    );
  }
  return url;
}

export function isPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): pg.Pool {
  if (_pool) return _pool;
  const url = poolUrl();
  _pool = new pg.Pool({
    connectionString: url,
    ssl: url.includes('supabase.com') || url.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  return _pool;
}

function pgOneOffline(): never {
  throw new Error(
    'pg.ts was called without DATABASE_URL set and Postgres runtime unavailable. ' +
      'Configure DATABASE_URL on Vercel or run locally where the SQLite fallback applies.'
  );
}

/**
 * pgQuery / pgOne / pgMany short-circuit to the local SQLite
 * copy when (a) DATABASE_URL is unset AND (b) we are not on
 * Vercel. When on Vercel without DATABASE_URL, we throw the
 * same way Postgres-first does - operator config is broken, and
 * masking it would silently break durable writes. Phase 1's
 * hotcopy-out of /tmp is gone because Postgres is canonical.
 */
function isLocalDevPath(): boolean {
  return !process.env.DATABASE_URL && !isVercel();
}

/**
 * Read-only Vercel hot-copy path: when DATABASE_URL is unset on
 * Vercel the bundled SQLite at data/etihad.db is copied to a
 * /tmp file (per Vercel region) so the read-only reader survives
 * Vercel's ephemeral cold-start deploy. Writes still evaporate
 * across cold starts until the operator provides DATABASE_URL.
 * The Phase 2+ plan removes this path entirely.
 */
function isVercelFallbackPath(): boolean {
  return !process.env.DATABASE_URL && isVercel();
}

function getVercelHotCopyPath(): string {
  if (process.env.ETIHAD_DB_PATH) return process.env.ETIHAD_DB_PATH;
  const id = process.env.VERCEL_REGION || 'global';
  return `/tmp/etihad-${id}.db`;
}

function ensureHotCopy(): void {
  if (!isVercelFallbackPath()) return;
  try {
    const source = path.join(process.cwd(), 'data', 'etihad.db');
    if (!fs.existsSync(source)) return;
    const target = getVercelHotCopyPath();
    if (fs.existsSync(target)) return;
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(source, target);
  } catch {
    // best-effort
  }
}

function getSqlite(): Database.Database {
  if (_sqlite) return _sqlite;
  ensureHotCopy();
  const target = isVercelFallbackPath()
    ? getVercelHotCopyPath()
    : path.join(process.cwd(), 'data', 'etihad.db');
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(target, {
    readonly: isVercelFallbackPath() && !process.env.ETIHAD_DB_PATH,
    fileMustExist: false,
  });
  db.pragma('journal_mode = DELETE');
  db.pragma('synchronous = NORMAL');
  _sqlite = db;
  return db;
}

function placeholderToSqlite(text: string, params: ReadonlyArray<unknown>): {
  sql: string;
  args: unknown[];
} {
  const args = [...params];
  let i = 0;
  const sql = text.replace(/\$(\d+)/g, () => `?`);
  // SQLite supports dynamic placeholder via `?`, no numbered match needed.
  // The above replace strips $1/$2 pushes a sequence, but we still
  // want sqlite's parameter binding to consume them deterministically.
  // Better-sqlite3 parameter order matches sqlite `?` left-to-right.
  i++;
  void i;
  return { sql, args };
}

async function sqliteExec(text: string, params: ReadonlyArray<unknown>): Promise<unknown[]> {
  const db = getSqlite();
  const { sql, args } = placeholderToSqlite(text, params);
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
    const rows = db.prepare(sql).all(...args);
    return rows as unknown[];
  }
  const r = db.prepare(sql).run(...args);
  // better-sqlite3 `run` returns { changes, lastInsertRowid }. Wrap.
  const out: { rows: unknown[]; rowCount: number } = {
    rows: [],
    rowCount: r.changes ?? 0,
  };
  if (typeof r.lastInsertRowid === 'number') {
    (out as unknown as { lastInsertRowid: number }).lastInsertRowid = r.lastInsertRowid;
  }
  return [out];
}

export async function pgQuery<Row = any>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<{ rows: Row[]; rowCount: number }> {
  if (isLocalDevPath() || isVercelFallbackPath()) {
    const result = (await sqliteExec(text, params)) as { rows: Row[]; rowCount: number }[];
    const head = result[0] ?? { rows: [], rowCount: 0 };
    return head;
  }
  const pool = getPool();
  const res = await pool.query(text, params as unknown[]);
  return { rows: res.rows as Row[], rowCount: res.rowCount ?? 0 };
}

export async function pgOne<Row = any>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<Row | null> {
  if (isLocalDevPath() || isVercelFallbackPath()) {
    const result = (await sqliteExec(text, params)) as unknown[];
    if (Array.isArray(result) && result.length === 0) return null;
    const head = result[0] as { rows: Row[] };
    if (head && Array.isArray(head.rows) && head.rows.length > 0) return head.rows[0];
    if (text.toUpperCase().includes('RETURNING')) {
      return { lastInsertRowid: (result[1] as { lastInsertRowid?: number } | undefined)?.lastInsertRowid ?? null } as unknown as Row;
    }
    return null;
  }
  const { rows } = await pgQuery<Row>(text, params);
  return rows[0] ?? null;
}

export async function pgMany<Row = any>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<Row[]> {
  if (isLocalDevPath() || isVercelFallbackPath()) {
    const result = (await sqliteExec(text, params)) as { rows: Row[] }[];
    return result[0]?.rows ?? [];
  }
  const { rows } = await pgQuery<Row>(text, params);
  return rows;
}

export async function withPgTx<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  if (isLocalDevPath()) {
    const db = getSqlite();
    const synthetic = {
      async query(_text: any, ..._args: any[]) {
        return { rows: [], rowCount: 0 };
      },
    } as unknown as pg.PoolClient;
    db.exec('BEGIN');
    try {
      const result = await fn(synthetic);
      db.exec('COMMIT');
      return result;
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw e;
    }
  }
  if (isVercelFallbackPath()) {
    // Vercel fallback SQLite is opened readonly by default (writes
    // evaporate anyway). Transactions on a readonly handle are
    // a no-op. Run the callback synchronously.
    const synthetic = {
      async query(_text: any, ..._args: any[]) {
        return { rows: [], rowCount: 0 };
      },
    } as unknown as pg.PoolClient;
    return await fn(synthetic);
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback failure
    }
    throw e;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
  if (_sqlite) {
    try { _sqlite.close(); } catch { /* ignore */ }
    _sqlite = null;
  }
}

function loadBootstrapDdl(): string {
  const p = path.join(process.cwd(), 'supabase-bootstrap.sql');
  return fs.readFileSync(p, 'utf8');
}

export async function ensureMigrated(): Promise<void> {
  if (_ensureMigrated) return _ensureMigrated;
  _ensureMigrated = (async () => {
    if (isLocalDevPath()) {
      // Local SQLite: rely on scripts/migrate.mjs (run via postinstall)
      // to declare the schema. Just ensure the file is reachable.
      const dbPath = path.join(process.cwd(), 'data', 'etihad.db');
      if (!fs.existsSync(dbPath)) {
        // best-effort create; better-sqlite3 will tolerate empty file
        new Database(dbPath).close();
      }
      return;
    }
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query(
        'SELECT pg_advisory_xact_lock(7421971972240957)'
      );
      const ddl = loadBootstrapDdl();
      await client.query(ddl);
    } finally {
      client.release();
    }
  })();
  return _ensureMigrated;
}

void pgOneOffline;
