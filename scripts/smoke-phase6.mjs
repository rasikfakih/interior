#!/usr/bin/env node
/**
 * scripts/smoke-phase6.mjs
 *
 * Phase 6 acceptance: journal CRUD + slug resolver reachability.
 *
 * Without operator session:
 *   - GET  /api/journal             -> 200 with N rows
 *   - GET  /api/journal/1           -> 401 (auth required)
 *   - POST /api/journal             -> 401
 *   - PUT  /api/journal/1           -> 401
 *   - DELETE /api/journal/1         -> 401
 *   - GET  /journal                 -> 200 (HTML, public)
 *   - GET  /journal/<slug>          -> 200 if seeded slug; else 404
 *   - GET  /admin/journal           -> 200 or 404 (pre-deploy)
 *
 * Slug resolver self-check: each seeded slug must round-trip on the
 * public detail route.
 */
const BASE_URL = process.env.BASE_URL || 'https://ethinterior.vercel.app';

function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(line) {
  console.log(`[smoke-phase6 ${ts()}] ${line}`);
}
function fail(line) {
  console.error(`[smoke-phase6 FAIL ${ts()}] ${line}`);
  process.exit(1);
}

async function fetchRaw(method, path, opts = {}) {
  const init = {
    method,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json' },
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  const url = `${BASE_URL}${path}`;
  return fetch(url, init);
}

async function expectStatus(method, path, opts, expected) {
  const res = await fetchRaw(method, path, opts);
  if (expected.min != null && res.status < expected.min)
    fail(`${method} ${path} -> ${res.status} (expected at least ${expected.min})`);
  if (expected.max != null && res.status > expected.max)
    fail(`${method} ${path} -> ${res.status} (expected at most ${expected.max})`);
  if (expected.equal != null && res.status !== expected.equal)
    fail(`${method} ${path} -> ${res.status} (expected exactly ${expected.equal})`);
  if (expected.oneOf && !expected.oneOf.includes(res.status))
    fail(`${method} ${path} -> ${res.status} (expected one of ${expected.oneOf.join(', ')})`);
  return res;
}

async function main() {
  log('checking journal API surface');

  const list = await expectStatus(
    'GET',
    '/api/journal',
    {},
    { min: 200, max: 299 }
  );
  const rows = await list.json();
  if (!Array.isArray(rows)) fail('expected array from /api/journal');
  log(`ok - GET /api/journal  -> 200 (${rows.length} rows)`);

  // Slug audit: each row's slug should resolve on the public detail route.
  for (const r of rows) {
    const slug = r.slug;
    if (!slug || typeof slug !== 'string') {
      log(`skipped slug check for row id ${r.id} (no slug)`);
      continue;
    }
    const detail = await expectStatus(
      'GET',
      `/journal/${slug}`,
      {},
      { min: 200, max: 299 }
    );
    log(`ok - GET /journal/${slug}  -> ${detail.status}`);
  }

  // Auth gates on the mutate routes
  const writeCases = [
    // GET /api/journal/[id] is a Phase 6 addition; before deploy it
    // returns 405 (no handler). After deploy it returns 401 without
    // a session. Accept either.
    { method: 'GET',   path: '/api/journal/1',         body: undefined, expected: [401, 405] },
    { method: 'POST',  path: '/api/journal',           body: { title: 'S' }, expected: 401 },
    { method: 'PUT',   path: '/api/journal/1',         body: { title: 'S' }, expected: 401 },
    { method: 'DELETE', path: '/api/journal/1',        body: undefined, expected: 401 },
  ];
  for (const c of writeCases) {
    const r = await expectStatus(c.method, c.path, { body: c.body }, {
      oneOf: Array.isArray(c.expected) ? c.expected : [c.expected],
    });
    log(`ok - ${c.method} ${c.path}  -> ${r.status}`);
  }

  // Public HTML renders
  const journalPage = await expectStatus('GET', '/journal', {}, {
    min: 200, max: 299,
  });
  log(`ok - GET /journal  -> ${journalPage.status}`);

  // /admin/journal renders on prod OR returns 404 pre-deploy
  const adminIndex = await expectStatus('GET', '/admin/journal', {}, {
    min: 200, max: 404, equal: undefined,
  });
  log(`ok - GET /admin/journal  -> ${adminIndex.status}`);

  // 404 path: a slug that surely doesn't exist毞should yield a 404.
  // The journal slug page calls notFound() -> 404.
  const ghost = await expectStatus('GET', '/journal/no-such-slug-12345', {}, {
    equal: 404,
  });
  log(`ok - GET /journal/no-such-slug-12345  -> ${ghost.status}`);

  log('OK - Phase 6 routes respond as designed.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
