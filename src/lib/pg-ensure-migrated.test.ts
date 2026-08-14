import { afterEach, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";
import { _resetForHotReload, ensureMigrated } from "@/lib/pg";

/**
 * Regression test for TS-ID-021.
 *
 * ensureMigrated must NOT cache a rejected migration promise. A transient
 * DB blip (cold-start connect, pooler turbulence during a deploy rollout)
 * used to poison the lambda: _ensureMigrated stayed rejected forever, so
 * /api/health reported db=error (ms=0) until the lambda was recycled. The
 * fix resets the cache on failure so the next caller retries.
 *
 * The tests drive the Postgres path only: DATABASE_URL is set, and
 * pg.Pool.prototype.connect is patched to count attempts. No real network
 * or database is touched, and no local SQLite file is created.
 */

const FAILING_URL = "postgres://u:p@127.0.0.1:1/nope";

const ORIG_CONNECT = pg.Pool.prototype.connect;

type StubClient = {
  query: () => Promise<{ rows: unknown[] }>;
  release: () => void;
};

let connects = 0;

function stubClient(): StubClient {
  return {
    query: () => Promise.resolve({ rows: [] }),
    release: () => undefined,
  };
}

function setConnect(impl: () => Promise<StubClient>): void {
  pg.Pool.prototype.connect = impl as unknown as typeof ORIG_CONNECT;
}

beforeEach(() => {
  connects = 0;
  _resetForHotReload();
  process.env.DATABASE_URL = FAILING_URL;
  setConnect(async () => {
    connects += 1;
    throw new Error("ECONNREFUSED (test)");
  });
});

afterEach(() => {
  pg.Pool.prototype.connect = ORIG_CONNECT;
  delete process.env.DATABASE_URL;
  _resetForHotReload();
});

describe("ensureMigrated retry behavior", () => {
  it("retries after a failed migration instead of caching the rejection", async () => {
    await expect(ensureMigrated()).rejects.toThrow();
    await expect(ensureMigrated()).rejects.toThrow();
    // Two calls must mean two connect attempts. With the cached-rejection
    // bug this was 1: the second call returned the memoized rejection.
    expect(connects).toBe(2);
  });

  it("self-heals: a success after a failure is served to the next caller", async () => {
    await expect(ensureMigrated()).rejects.toThrow();
    setConnect(async () => {
      connects += 1;
      return stubClient();
    });
    await expect(ensureMigrated()).resolves.toBeUndefined();
    expect(connects).toBe(2); // one failed attempt + one successful retry
  });

  it("dedupes concurrent first callers (in-flight promise cached on success)", async () => {
    setConnect(async () => {
      connects += 1;
      return stubClient();
    });
    await Promise.all([ensureMigrated(), ensureMigrated(), ensureMigrated()]);
    expect(connects).toBe(1); // three concurrent callers share one run
  });
});
