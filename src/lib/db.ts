/**
 * db.ts - v1.1.2 runtime is Postgres-only.
 *
 * This file used to expose openDb/openReadonlyDb/getDrizzle/...
 * SQLite call surfaces. From v1.1.2 onward those surfaces are
 * unsupported.
 *
 * Three categories of consumer:
 *
 * 1. Server-only call sites that still call openDb/openReadonlyDb
 *    directly throw at runtime. They need to be ported to
 *    '@/lib/pg' pg.* helpers. Loud failure is the goal: silent
 *    SQLite reads inside a Postgres schema would corrupt data.
 *
 * 2. Server-only call sites that pass `db` (the legacy proxy)
 *    into drizzle-style queries also throw at runtime. The Proxy
 *    intentionally returns any-typed values so typecheckers
 *    remain quiet on the still-ported call sites, but at runtime
 *    every property access throws. Port sites that use the proxy
 *    will surface immediately when run.
 *
 * 3. Type-only imports (schema symbols) stay routed via the
 *    sqlite-core schema file. Postgres-side use drizzle-orm/pg-core
 *    pin from src/lib/db-postgres.ts instead.
 */

import { isPostgres as isPostgresRaw } from '@/lib/pg';

export const isPostgres = (): boolean => isPostgresRaw();

// openDb/openReadonlyDb/Drizzle return `any` instead of `never` so
// typecheckers remain quiet on the still-unported call sites.
// At runtime every property access throws.
export function openDb(): any {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          'db.ts is the legacy SQLite surface; v1.1.2 is Postgres-only. ' +
            "Import { pgQuery, pgOne, pgMany, ensureMigrated } from '@/lib/pg' instead."
        );
      },
    }
  );
}

export function openReadonlyDb(): any {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          'db.ts is the legacy SQLite surface; v1.1.2 is Postgres-only. ' +
            "Import { pgQuery, pgOne, pgMany, ensureMigrated } from '@/lib/pg' instead."
        );
      },
    }
  );
}

export function getDrizzle(): any {
  throw new Error(
    'db.ts is the legacy SQLite surface; v1.1.2 is Postgres-only. Use pg.* helpers.'
  );
}

export function getSqliteDrizzle(): any {
  throw new Error(
    'db.ts is the legacy SQLite surface; v1.1.2 is Postgres-only. Use pg.* helpers.'
  );
}

export function resetSqliteHandle(): void {
  // no-op - there is no sqlite handle to reset.
}

export function openPostgres(): any {
  throw new Error(
    "openPostgres is removed in v1.1.2; import { getPool } from '@/lib/pg'."
  );
}

export const db: any = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'db.ts is the legacy SQLite surface; v1.1.2 is Postgres-only. Use pg.* helpers.'
      );
    },
  }
);

export const DB_PATH_HINT = '/postgres-only-no-local-sqlite';
