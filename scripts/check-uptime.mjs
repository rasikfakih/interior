#!/usr/bin/env node
/**
 * check-uptime.mjs - uptime probe for hosted buyer sites.
 *
 * The studio hosts and supports buyer installs, so this is the
 * operator's "is every site actually up" check. It polls /api/health
 * on each URL and fails when a site does not answer 200 with
 * { ok: true, db: "ok" }.
 *
 * Robustness notes (Windows Node):
 *   - The body is read via r.text() + JSON.parse, not r.json() -
 *     response.json() sporadically resolves with an empty body on
 *     some Node-on-Windows builds.
 *   - One retry after 1s covers transient edge hiccups.
 *   - process.exitCode is set instead of process.exit() so undici's
 *     keep-alive sockets close naturally; calling process.exit() while
 *     a socket is still open trips a libuv UV_HANDLE_CLOSING abort on
 *     Windows.
 *
 * Usage:
 *   node scripts/check-uptime.mjs [url ...]
 *   URLS="https://a.example.com https://b.example.com" node scripts/check-uptime.mjs
 *
 * Default (no args): the first buyer site's health endpoint.
 */
const urls = (
  process.argv.length > 2
    ? process.argv.slice(2)
    : (process.env.URLS || "https://ethinterior.vercel.app/api/health").split(/\s+/)
)
  .map((u) => u.trim())
  .filter(Boolean);

async function probe(url, attempt = 1) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const text = await r.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      // non-JSON body; body stays null and the check fails below
    }
    const ms = Date.now() - started;
    const ok = r.ok && body?.ok === true && body?.db === "ok";
    console.log(
      `${ok ? "OK  " : "FAIL"} ${url} status=${r.status} db=${body?.db ?? "?"} ms=${ms}${attempt > 1 ? " (retry)" : ""}`
    );
    if (!ok && attempt < 2) {
      await new Promise((res) => setTimeout(res, 1000));
      return probe(url, attempt + 1);
    }
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
  process.exitCode = 1;
} else {
  const results = await Promise.all(urls.map((u) => probe(u)));
  const up = results.filter(Boolean).length;
  console.log(`\n${up}/${urls.length} up`);
  process.exitCode = up === urls.length ? 0 : 1;
}
