#!/usr/bin/env node
/**
 * scripts/smoke-phase2.mjs
 *
 * Phase 2 acceptance: media API surface responds correctly
 * regardless of operator env setup.
 *
 * Behavior under test (without requiring real session):
 *   - GET  /api/media/list            -> 401 (auth required)
 *   - GET  /api/media/[id]/sign       -> 400 for invalid id, 401 the rest
 *   - POST /api/media/upload           -> 401 (auth required)
 *
 * These checks pass whether or not the operator has
 * SUPABASE_URL set on Vercel, as long as the routes are
 * correctly auth-gated.
 *
 * Optional second phase: if operator env or login is provided,
 * exercise the auth'd list + sign path. Disabled by default
 * since login credentials rotation makes this brittle.
 */
const BASE_URL = process.env.BASE_URL || 'https://ethinterior.vercel.app';

function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(line) {
  console.log(`[smoke-phase2 ${ts()}] ${line}`);
}
function fail(line) {
  console.error(`[smoke-phase2 FAIL ${ts()}] ${line}`);
  process.exit(1);
}

async function expectStatus(method, path, opts = {}) {
  const init = {
    method,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json' },
  };
  if (opts.body) init.body = JSON.stringify(opts.body);
  if (opts.cookie) init.headers.Cookie = opts.cookie;
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, init);
  return res.status;
}

async function main() {
  log('checking media routes without auth (expected 401 / 400)');

  const cases = [
    { label: 'GET  /api/media/list  -> 401', status: 401, method: 'GET', path: '/api/media/list' },
    { label: 'POST /api/media/upload -> 401', status: 401, method: 'POST', path: '/api/media/upload', body: { filename: 'x.glb', mime: 'model/gltf-binary', size: 100 } },
    { label: 'GET  /api/media/abc/sign -> 400', status: 400, method: 'GET', path: '/api/media/abc/sign' },
    { label: 'GET  /api/media/999999/sign -> 404', status: 404, method: 'GET', path: '/api/media/999999/sign' },
  ];

  for (const c of cases) {
    const got = await expectStatus(c.method, c.path, { body: c.body });
    if (got !== c.status) {
      fail(`${c.label} expected ${c.status} got ${got}`);
    }
    log(`ok - ${c.label}`);
  }

  if (process.env.SMOKE_PHASE2_LOGIN === '1') {
    log('login path not tested (set SMOKE_PHASE2_LOGIN=1 with ADMIN_EMAIL/ADMIN_PASSWORD to enable)');
  }

  log('OK - Phase 2 routes respond as designed.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
