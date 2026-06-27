#!/usr/bin/env node
/**
 * scripts/smoke-phase2.mjs
 *
 * Phase 2 acceptance: media API surface responds correctly
 * regardless of whether Supabase Storage is reachable.
 *
 * Behavior under test:
 *   - GET  /api/media/list  (with auth cookie via /api/auth/csrf) -> 200 rows
 *   - GET  /api/media/[id]/sign without id -> 400
 *   - GET  /api/media/[id]/sign for missing id -> 404
 *   - POST /api/media/upload without auth -> 401
 *
 * The script aborts cleanly if the live URL is unreachable.
 *
 * Run: node scripts/smoke-phase2.mjs
 *      $env:BASE_URL = "https://ethinterior.vercel.app"
 *      $env:ADMIN_EMAIL = "studio@etihadinteriors.com"
 *      $env:ADMIN_PASSWORD = "t1fo7uanZ03v1dMKk2v8nByJ"
 *
 * Exit 0 = pass, 1 = fail.
 */
const BASE_URL = process.env.BASE_URL || 'https://ethinterior.vercel.app';
const EMAIL = process.env.ADMIN_EMAIL || 'studio@etihadinteriors.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 't1fo7uanZ03v1dMKk2v8nByJ';

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

async function login() {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  // Compose Cookie header from every Set-Cookie header returned
  const setCookies = csrfRes.headers.getSetCookie
    ? csrfRes.headers.getSetCookie()
    : (csrfRes.headers.get('set-cookie') || '').split(/,(?=\s*[^=]+=)/g);
  const csrfCookieLine = setCookies.find((s) =>
    s.startsWith('__Host-next-auth.csrf-token=')
  );
  if (!csrfCookieLine) fail('csrf cookie not present');
  const cookieValue = csrfCookieLine.split(';')[0].split('=')[1];
  const token = cookieValue.split('%')[0];
  const loginCookies = setCookies.map((s) => s.split(';')[0]).join('; ');

  const loginRes = await fetch(
    `${BASE_URL}/api/auth/callback/credentials?json=true`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: loginCookies,
      },
      body: new URLSearchParams({
        csrfToken: token,
        email: EMAIL,
        password: PASSWORD,
        callbackUrl: `${BASE_URL}/admin`,
      }).toString(),
      redirect: 'manual',
    }
  );
  if (loginRes.status >= 400) {
    fail(`login fail status=${loginRes.status} location=${loginRes.headers.get('location')}`);
  }
  const allCookieHeaders = loginRes.headers.getSetCookie
    ? loginRes.headers.getSetCookie()
    : (loginRes.headers.get('set-cookie') || '').split(/,(?=\s*[^=]+=)/g);
  const allCookies = [
    ...loginCookies.split('; '),
    ...allCookieHeaders.map((s) => s.split(';')[0]),
  ].join('; ');
  return allCookies;
}

async function main() {
  log('login');
  const cookie = await login();
  log('logged in, exercising media routes');

  const listRes = await fetch(`${BASE_URL}/api/media/list?limit=5`, {
    headers: { Cookie: cookie },
    redirect: 'manual',
  });
  if (listRes.status !== 200) {
    fail(`/api/media/list expected 200, got ${listRes.status}`);
  }
  const listJson = await listRes.json();
  if (!Array.isArray(listJson.rows)) {
    fail('/api/media/list rows must be an array');
  }
  log(`list ok, ${listJson.rows.length} rows`);

  const noIdSign = await fetch(`${BASE_URL}/api/media/abc/sign`, {
    headers: { Cookie: cookie },
    redirect: 'manual',
  });
  if (noIdSign.status !== 400) {
    fail(`/api/media/abc/sign expected 400, got ${noIdSign.status}`);
  }
  log('abc/sign -> 400 ok');

  const missing = await fetch(`${BASE_URL}/api/media/999999/sign`, {
    headers: { Cookie: cookie },
    redirect: 'manual',
  });
  if (missing.status !== 404) {
    fail(`/api/media/999999/sign expected 404, got ${missing.status}`);
  }
  log('999999/sign -> 404 ok');

  const uploadNoAuth = await fetch(`${BASE_URL}/api/media/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'x.glb', mime: 'model/gltf-binary', size: 100 }),
  });
  if (uploadNoAuth.status !== 401) {
    fail(`/api/media/upload no-auth expected 401, got ${uploadNoAuth.status}`);
  }
  log('upload no-auth -> 401 ok');

  log('OK - Phase 2 media surface responds as designed.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
