#!/usr/bin/env node
/**
 * check-uptime.mjs - uptime probe for hosted buyer sites.
 *
 * The studio hosts and supports buyer installs, so this is the
 * operator's "is every site actually up" check. It polls /api/health
 * on each URL and fails when a site does not answer 200 with
 * { ok: true, db: "ok" }.
 *
 * Usage:
 *   node scripts/check-uptime.mjs [url ...]
 *   URLS="https://a.example.com https://b.example.com" node scripts/check-uptime.mjs
 *
 * Default (no args): the first buyer site, ethinterior.vercel.app.
 */
const urls = (
  process.argv.length > 2
    ? process.argv.slice(2)
    : (process.env.URLS || "https://ethinterior.vercel.app").split(/\s+/)
)
  .map((u) => u.trim())
  .filter(Boolean);

async function probe(url) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const body = await r.json().catch(() => null);
    const ms = Date.now() - started;
    const ok = r.ok && body?.ok === true && body?.db === "ok";
    console.log(
      `${ok ? "OK  " : "FAIL"} ${url} status=${r.status} db=${body?.db ?? "?"} ms=${ms}`
    );
    return ok;
  } catch (e) {
    console.log(`FAIL ${url} ${e?.message ?? e}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

if (urls.length === 0) {
  console.error("No URLs to check. Pass URLs as args or set URLS env.");
  process.exit(1);
}

const results = await Promise.all(urls.map(probe));
const up = results.filter(Boolean).length;
console.log(`\n${up}/${urls.length} up`);
process.exit(up === urls.length ? 0 : 1);
