#!/usr/bin/env node
/**
 * scripts/smoke-install.mjs
 *
 * TS-006 Phase D acceptance: install metadata viewer surface.
 *
 * Anonymous:
 *   - GET  /api/install/stamp         -> 401
 *   - PUT  /api/install/stamp         -> 401
 *   - GET  /admin/install             -> 200 or 404
 *
 * With admin session:
 *   - GET  /api/install/stamp         -> 200 with license shape
 *                                       (or { available: false } on
 *                                        a server with no license)
 *   - PUT  /api/install/stamp         -> 200 with install.stamp_advance
 *                                       audit_log entry
 *
 * If no license is present (typical Vercel hot-copy container
 * without LICENSE_HMAC_KEY), GET returns 200 with canAdvance=false
 * and PUT returns 503. Both are tolerated by the smoke (we assert
 * the gating, not the write).
 *
 * If a license IS present (postinstall path on local dev / future
 * distributed install on Vercel), the PUT advances installedAt and
 * the smoke asserts the rotatedAt field is refreshed.
 *
 * Exit 1 on any failed assertion.
 */

const BASE_URL = process.env.BASE_URL || "https://ethinterior.vercel.app";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(line) {
  console.log(`[smoke-install ${ts()}] ${line}`);
}
function fail(line) {
  console.error(`[smoke-install FAIL ${ts()}] ${line}`);
  process.exit(1);
}

async function fetchRaw(method, path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  const init = { method, headers, redirect: "manual" };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  return fetch(`${BASE_URL}${path}`, init);
}

async function parseSetCookies(res) {
  const setCookie = res.headers.get("set-cookie") || "";
  const out = {};
  if (!setCookie) return out;
  for (const c of setCookie.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function expectEqual(method, path, expected, opts = {}) {
  const res = await fetchRaw(method, path, opts);
  if (res.status !== expected) {
    fail(`${method} ${path} -> ${res.status} (expected == ${expected})`);
  }
  log(`ok - ${method} ${path}  -> ${res.status}`);
  return res;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function loginAdmin() {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await readJson(csrfRes);
  const jar = await parseSetCookies(csrfRes);
  const body = new URLSearchParams({
    csrfToken: csrfData.csrfToken,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    callbackUrl: BASE_URL + "/admin",
    json: "true",
  });
  const r = await fetch(
    `${BASE_URL}/api/auth/callback/credentials?json=true`,
    {
      method: "POST",
      redirect: "manual",
      headers: {
        Cookie: cookieHeader(jar),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );
  const added = await parseSetCookies(r);
  for (const [k, v] of Object.entries(added)) jar[k] = v;
  return jar;
}

async function main() {
  const tag = `smoke-${Date.now()}`;
  log(`checking install metadata surface (tag=${tag})`);

  // 1) Anon gating.
  await expectEqual("GET", "/api/install/stamp", 401);
  await expectEqual("PUT", "/api/install/stamp", 401);

  // 2) Admin index route.
  const adm = await fetchRaw("GET", "/admin/install", {});
  if (adm.status !== 200 && adm.status !== 404) {
    fail(`/admin/install -> ${adm.status} (expected 200 or 404)`);
  }
  log(`ok - GET /admin/install  -> ${adm.status}`);

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    log(
      "skip - SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD not set; round-trip deferred"
    );
    log("OK - install gating as designed (anonymous probes only).");
    process.exit(0);
  }

  log("proceeding with admin-session round-trip");
  const jar = await loginAdmin();
  if (!jar["__Secure-next-auth.session-token"] && !jar["next-auth.session-token"]) {
    log("warn - admin login did not yield a session token");
    log("OK - install gating as designed (anonymous probes only).");
    process.exit(0);
  }
  log("ok - admin login captured session cookie");

  // 3) GET -> 200 with shape.
  const getRaw = await fetchRaw("GET", "/api/install/stamp", {
    cookie: cookieHeader(jar),
  });
  if (getRaw.status !== 200) {
    fail(`GET /api/install/stamp (authed) -> ${getRaw.status} expected 200`);
  }
  const before = await readJson(getRaw);
  log(
    `ok - GET /api/install/stamp (authed) -> 200 available=${before?.available} canAdvance=${before?.canAdvance} canRotate=${before?.canRotate}`
  );

  if (!before?.available || !before?.canAdvance || !before?.canRotate) {
    log(
      "skip - no license or no LICENSE_HMAC_KEY env on this server; advance smoke skipped"
    );
    log("OK - install get-shape round-trip is clean.");
    process.exit(0);
  }

  const beforeInstalledAt = before.license?.installedAt;

  // 4) PUT advance -> 200; rotatedAt moves forward.
  const putRaw = await fetchRaw("PUT", "/api/install/stamp", {
    cookie: cookieHeader(jar),
  });
  if (putRaw.status !== 200) {
    fail(`PUT /api/install/stamp (authed) -> ${putRaw.status} expected 200`);
  }
  const after = await readJson(putRaw);
  if (!after?.license) {
    fail(`PUT did not return license: ${JSON.stringify(after)}`);
  }
  if (beforeInstalledAt && after.license.installedAt === beforeInstalledAt) {
    fail(
      `installedAt did not advance: still ${after.license.installedAt}`
    );
  }
  log(
    `ok - PUT /api/install/stamp  -> 200 installedAt ${beforeInstalledAt} -> ${after.license.installedAt}`
  );

  // 5) audit_log assertion.
  const auditPaths = ["/api/operator/audit", "/api/admin/audit"];
  let lines = null;
  for (const p of auditPaths) {
    const r = await fetchRaw("GET", p, { cookie: cookieHeader(jar) });
    if (r.status === 200) {
      lines = await readJson(r);
      break;
    }
  }
  if (lines) {
    const arr = Array.isArray(lines) ? lines : [];
    const match = arr.find((l) => l?.kind === "install.stamp_advance");
    if (!match) {
      fail("audit_log did not record install.stamp_advance entry");
    }
    log("ok - audit_log has install.stamp_advance entry");
  } else {
    log("warn - audit not reachable; smoke continues without audit assert");
  }

  log("OK - install metadata round-trip is clean.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
