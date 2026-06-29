#!/usr/bin/env node
/**
 * scripts/smoke-role.mjs
 *
 * Phase 8 carry-forward acceptance: admin / superadmin role
 * split. The split is via /api/admin/* for superadmin (operator
 * confirmed during the carry-forward triage on 2026-06-28).
 *
 * Without operator session:
 *   - GET /api/admin/whoami -> 401
 *
 * With admin session (login + probe the same session):
 *   - GET /api/admin/whoami -> 403 with role = "admin"
 *
 * Operator visible behaviour:
 *   - admin reaches /admin consoles.
 *   - admin reaches /api/{projects,journal,testimonials,team,pages,...}.
 *   - admin does NOT reach /api/admin/* (gets 403).
 *   - superadmin reaches everything admin does, plus /api/admin/*.
 *
 * The Phase 8 smoke-api already exercises admin reach. This
 * smoke adds the admin-rejected /api/admin/whoami check.
 */

function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(line) {
  console.log(`[smoke-role ${ts()}] ${line}`);
}
function fail(msg) {
  console.error(`[smoke-role FAIL ${ts()}] ${msg}`);
  process.exit(1);
}

const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error(
    "[smoke-role] SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD not set; abort."
  );
  process.exit(2);
}

function parseSetCookie(setCookie, name) {
  if (!setCookie) return null;
  const raw = Array.isArray(setCookie) ? setCookie.join(",") : String(setCookie);
  for (const piece of raw.split(/,\s+/)) {
    if (piece.startsWith(`${name}=`)) {
      return piece.split(";")[0].slice(name.length + 1);
    }
  }
  return null;
}

function mergeCookies(jar, setCookie) {
  if (!setCookie) return;
  for (const piece of String(setCookie).split(/,\s+/)) {
    const head = piece.split(";")[0];
    const eq = head.indexOf("=");
    if (eq < 0) continue;
    const name = head.slice(0, eq).trim();
    const value = head.slice(eq + 1);
    if (!name) continue;
    if (/Expires=.*1970/i.test(piece) || value === "" || value === "deleted") {
      delete jar[name];
    } else {
      jar[name] = value;
    }
  }
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function rawFetch(method, path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
}

async function login() {
  const csrfRes = await rawFetch("GET", "/api/auth/csrf");
  const body = await csrfRes.json();
  const token = body.csrfToken || body["csrf-token"];
  if (!token) fail("csrf empty");
  const jar = {};
  mergeCookies(jar, csrfRes.headers.get("set-cookie"));

  const credBody = new URLSearchParams({
    csrfToken: token,
    email: EMAIL,
    password: PASSWORD,
    callbackUrl: `${BASE}/admin`,
    json: "true",
  });
  const cb = await rawFetch(
    "POST",
    "/api/auth/callback/credentials?json=true",
    {
      method: "POST",
      body: credBody.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieHeader(jar),
      },
    }
  );
  mergeCookies(jar, cb.headers.get("set-cookie"));
  if (!jar["__Secure-next-auth.session-token"]) {
    fail("login did not yield session cookie");
  }
  return jar;
}

async function main() {
  log("step 1 - GET /api/admin/whoami without auth -> 401");
  const noAuth = await rawFetch("GET", "/api/admin/whoami");
  if (noAuth.status !== 401) {
    fail(`expected 401, got ${noAuth.status}`);
  }
  log(`ok - GET /api/admin/whoami  -> ${noAuth.status}`);

  log("step 2 - login with admin creds");
  const jar = await login();
  log("ok - session cookie captured");

  log("step 3 - GET /api/admin/whoami with admin role -> 403");
  const r = await rawFetch("GET", "/api/admin/whoami", {
    headers: { Cookie: cookieHeader(jar) },
  });
  if (r.status !== 403) {
    fail(`admin role must hit 403; got ${r.status}`);
  }
  const rj = await r.json().catch(() => ({}));
  if (rj.role && rj.role !== "admin") {
    fail(`expected role=admin in response; got ${JSON.stringify(rj).slice(0, 200)}`);
  }
  log(`ok - GET /api/admin/whoami  -> 403 role=admin reason="${rj.reason}"`);

  log("step 4 - sanity: admin still reaches /api/projects");
  const projects = await rawFetch("GET", "/api/projects", {
    headers: { Cookie: cookieHeader(jar) },
  });
  if (projects.status !== 200) {
    fail(`admin should reach /api/projects (200); got ${projects.status}`);
  }
  const projs = await projects.json();
  if (!Array.isArray(projs)) {
    fail(`/api/projects returned non-array`);
  }
  log(`ok - admin still GET /api/projects  -> 200 (${projs.length} rows)`);

  log("step 5 - admin role POST /api/admin/license -> 403 (superadmin-only)");
  const lic = await rawFetch("POST", "/api/admin/license", {
    headers: { Cookie: cookieHeader(jar) },
    body: JSON.stringify({
      purchaseCode: "SMOKE-ATTEMPT-ADMIN-CANNOT",
      domain: "smoke.invalid",
      tier: "personal",
    }),
  });
  if (lic.status !== 403) {
    fail(
      `admin POST /api/admin/license must hit 403; got ${lic.status}. ` +
        `This is the operator-only gate asymmetry carry-forward.`
    );
  }
  log(`ok - POST /api/admin/license  -> 403 with admin session`);

  log("step 6 - admin role POST /api/admin/demo-reset -> 403");
  const reset = await rawFetch("POST", "/api/admin/demo-reset", {
    headers: { Cookie: cookieHeader(jar) },
    body: "{}",
  });
  if (reset.status !== 403) {
    fail(
      `admin POST /api/admin/demo-reset must hit 403; got ${reset.status}.`
    );
  }
  log(`ok - POST /api/admin/demo-reset  -> 403 with admin session`);

  log("step 7 - anonymous POST /api/admin/license -> 401");
  const anon = await rawFetch("POST", "/api/admin/license", {
    body: JSON.stringify({
      purchaseCode: "ANON-ATTEMPT",
      domain: "smoke.invalid",
      tier: "personal",
    }),
  });
  if (anon.status !== 401) {
    fail(`anonymous must hit 401; got ${anon.status}`);
  }
  log(`ok - POST /api/admin/license  -> 401 anon`);

  log("OK - role split confirmed via /api/admin/*");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
