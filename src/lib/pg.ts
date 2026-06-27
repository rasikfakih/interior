/**
 * Postgres access surface for the v1.1.2 runtime.
 *
 * Single-driver repo from this version onward. db.ts is the public
 * surface; pg.ts is its implementation. Boot migrate runs the
 * statements in supabase-bootstrap.sql on first request and latches
 * the result behind a Postgres advisory lock so concurrent cold
 * starts do not race on DDL.
 *
 * Raw-SQL preferred for the port sites that came from SQLite - the
 * 46 operators' familiar prepared-statement shape stays readable
 * and there is no value in porting a one-table scan through a
 * drizzle query builder.
 */

import path from 'path';
import fs from 'fs';
import pg from 'pg';

let _pool: pg.Pool | null = null;
let _ensureMigrated: Promise<void> | null = null;

function poolUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. v1.1.2 requires Postgres for runtime. ' +
        'Stand up a Postgres instance and set DATABASE_URL.'
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

export async function pgQuery<Row = any>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<{ rows: Row[]; rowCount: number }> {
  const pool = getPool();
  const res = await pool.query(text, params as unknown[]);
  return { rows: res.rows as Row[], rowCount: res.rowCount ?? 0 };
}

export async function pgOne<Row = any>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<Row | null> {
  const { rows } = await pgQuery<Row>(text, params);
  return rows[0] ?? null;
}

export async function pgMany<Row = any>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<Row[]> {
  const { rows } = await pgQuery<Row>(text, params);
  return rows;
}

export async function withPgTx<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
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
}

function loadBootstrapDdl(): string {
  const p = path.join(process.cwd(), 'supabase-bootstrap.sql');
  return fs.readFileSync(p, 'utf8');
}

export async function ensureMigrated(): Promise<void> {
  if (_ensureMigrated) return _ensureMigrated;
  _ensureMigrated = (async () => {
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

/**
 * Internal escape helper. Use parameterized queries with $1/$2/...
 * placeholders via pgQuery / pgOne. This helper is intentionally
 * not exported - if a port site needs ad-hoc string interpolation
 * the port itself is wrong.
 */
