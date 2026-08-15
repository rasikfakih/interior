/**
 * Postgres access surface for Studio OS v2.0.
 *
 * Supabase (Postgres) is the single database. There is no SQLite
 * fallback: DATABASE_URL must be set. On cold start `ensureMigrated`
 * applies supabase-bootstrap.sql (idempotent CREATE TABLE IF NOT
 * EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS) behind a Postgres
 * advisory lock so schema drift self-heals. Scripts/migrate.mjs does
 * the same explicitly at install time.
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';

let _pool: pg.Pool | null = null;
let _ensureMigrated: Promise<void> | null = null;

export function isPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function poolUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Studio OS v2.0 is Supabase-only; ' +
        'provide DATABASE_URL in .env.local or the environment.'
    );
  }
  return url;
}

export function getPool(): pg.Pool {
  if (_pool) return _pool;
  const url = poolUrl();
  _pool = new pg.Pool({
    connectionString: url,
    ssl: url.includes('supabase.com') || url.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
    // max:1 serializes queries within a lambda (requests are effectively
    // sequential) and caps total sessions at the number of warm lambdas,
    // keeping pooled-connection caps (e.g. Neon 15, Supabase pooler)
    // from being blown by concurrent warm lambdas. The connection
    // timeout makes pool exhaustion fail fast and loud instead of
    // hanging a request on an unavailable session.
    max: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return _pool;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic default; call sites pass concrete Row types
export async function pgQuery<Row = any>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<{ rows: Row[]; rowCount: number }> {
  const pool = getPool();
  const res = await pool.query(text, params as unknown[]);
  return { rows: res.rows as Row[], rowCount: res.rowCount ?? 0 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic default; call sites pass concrete Row types
export async function pgOne<Row = any>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<Row | null> {
  const { rows } = await pgQuery<Row>(text, params);
  return rows[0] ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic default; call sites pass concrete Row types
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
}

function loadBootstrapDdl(): string {
  const p = path.join(process.cwd(), 'supabase-bootstrap.sql');
  return fs.readFileSync(p, 'utf8');
}

/**
 * Split DDL into statements, tracking dollar-quoted blocks (the one
 * `DO $$ ... $$;` realtime publication block) so their internal
 * semicolons are not treated as statement terminators.
 */
function splitStatements(sql: string): string[] {
  const stmts: string[] = [];
  let cur = '';
  let inDollar = false;
  for (const line of sql.split(/\r?\n/)) {
    cur += line + '\n';
    const n = (line.match(/\$\$/g) ?? []).length;
    if (n > 0) {
      if (inDollar) {
        if (n % 2 === 1) inDollar = false;
      } else if (n % 2 === 1) {
        inDollar = true;
      }
    }
    if (!inDollar && /;\s*$/.test(line)) {
      const s = cur.trim();
      if (s) stmts.push(s);
      cur = '';
    }
  }
  const rest = cur.trim();
  if (rest) stmts.push(rest);
  return stmts;
}

export async function ensureMigrated(): Promise<void> {
  if (_ensureMigrated) return _ensureMigrated;
  _ensureMigrated = (async () => {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_xact_lock(7421971972240957)');
      await client.query('BEGIN');
      // Statement-by-statement with retry passes: the bootstrap file
      // may reference a table (FK) before its CREATE appears, so a
      // single multi-statement run aborts on fresh databases. Every
      // statement is idempotent (IF NOT EXISTS), so re-runs are safe
      // and "already exists" rows are treated as applied.
      const statements = splitStatements(loadBootstrapDdl());
      const remaining = new Map(statements.map((s, i) => [i, s]));
      for (let pass = 1; pass <= 12 && remaining.size > 0; pass++) {
        let progressed = false;
        for (const [i, s] of remaining) {
          try {
            await client.query(s);
            remaining.delete(i);
            progressed = true;
          } catch (e) {
            if (/already exists|duplicate key/i.test(String((e as Error)?.message ?? ''))) {
              remaining.delete(i);
              progressed = true;
            }
          }
        }
        if (!progressed) break;
      }
      if (remaining.size > 0) {
        const first = remaining.values().next().value as string;
        throw new Error(
          `bootstrap DDL left ${remaining.size} statement(s) unapplied; first: ${first
            .slice(0, 120)
            .replace(/\s+/g, ' ')}`
        );
      }
      await client.query('COMMIT');
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
  })().catch((err) => {
    // Never cache a failed migration: one transient blip (cold-start
    // connect, pooler turbulence) must not poison this lambda for life.
    // A genuinely broken schema fails loud on every call.
    _ensureMigrated = null;
    throw err;
  });
  return _ensureMigrated;
}

/**
 * Reset hook for tests / hot reloads: drop the memoized migration
 * promise and close leaked handles so the next call reconnects.
 */
export function _resetForHotReload(): void {
  _ensureMigrated = null;
  if (_pool) {
    try {
      _pool.end().catch(() => {});
    } catch {
      // ignore
    }
    _pool = null;
  }
}
