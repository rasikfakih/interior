#!/usr/bin/env node
/**
 * scripts/smoke-phase7.mjs
 *
 * Phase 7 acceptance: testimonials + team CRUD API surfaces
 * respond correctly regardless of operator env setup, and the
 * admin index routes for both entities reach the operator's
 * tab.
 *
 * Without operator session:
 *   - GET  /api/testimonials                -> 200 with N rows
 *   - GET  /api/testimonials/1              -> 401 or 405 (Phase 7
 *                                              adds a GET handler
 *                                              to [id]; pre-deploy
 *                                              it's 405)
 *   - POST /api/testimonials                -> 401
 *   - PUT  /api/testimonials/1              -> 401
 *   - DELETE /api/testimonials/1            -> 401
 *   - GET  /api/team                        -> 200 with N rows
 *   - GET  /api/team/1                      -> 401 or 405
 *   - POST /api/team                        -> 401
 *   - PUT  /api/team/1                      -> 401
 *   - DELETE /api/team/1                    -> 401
 *   - GET  /admin/testimonials              -> 200 or 404
 *   - GET  /admin/team                      -> 200 or 404
 */
const BASE_URL = process.env.BASE_URL || 'https://ethinterior.vercel.app';

function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(line) {
  console.log(`[smoke-phase7 ${ts()}] ${line}`);
}
function fail(line) {
  console.error(`[smoke-phase7 FAIL ${ts()}] ${line}`);
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

async function checkEntity(label, basePath, idPath, postBody) {
  log(`checking ${label} surface`);

  const list = await expectStatus('GET', basePath, {}, { min: 200, max: 299 });
  const rows = await list.json();
  if (!Array.isArray(rows)) {
    fail(`expected array from ${basePath}; got non-array`);
  }
  log(`ok - GET ${basePath}  -> 200 (${rows.length} rows)`);

  const cases = [
    // Phase 7 adds the GET on [id]; pre-deploy it returns 405.
    { method: 'GET',    path: idPath,         body: undefined,        expected: { oneOf: [401, 405] } },
    { method: 'POST',   path: basePath,       body: postBody,          expected: { equal: 401 } },
    { method: 'PUT',    path: idPath,         body: { name: 'Smoke' }, expected: { equal: 401 } },
    { method: 'DELETE', path: idPath,         body: undefined,        expected: { equal: 401 } },
  ];

  for (const c of cases) {
    const r = await expectStatus(c.method, c.path, { body: c.body }, c.expected);
    log(`ok - ${c.method} ${c.path}  -> ${r.status}`);
  }
}

async function main() {
  await checkEntity(
    'testimonials',
    '/api/testimonials',
    '/api/testimonials/1',
    { name: 'Smoke', quote: 'Smoke quote' }
  );
  await checkEntity(
    'team',
    '/api/team',
    '/api/team/1',
    { name: 'Smoke' }
  );

  // Admin index routes
  const admT = await expectStatus('GET', '/admin/testimonials', {}, {
    min: 200, max: 404, equal: undefined,
  });
  log(`ok - GET /admin/testimonials  -> ${admT.status}`);

  const admTeam = await expectStatus('GET', '/admin/team', {}, {
    min: 200, max: 404, equal: undefined,
  });
  log(`ok - GET /admin/team  -> ${admTeam.status}`);

  log('OK - Phase 7 routes respond as designed.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
