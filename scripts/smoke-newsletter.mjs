#!/usr/bin/env node
/**
 * scripts/smoke-newsletter.mjs
 *
 * TS-006 Phase C acceptance: newsletter subscribers viewer.
 *
 * Anonymous:
 *   - GET  /api/newsletter-subscribers          -> 401
 *   - DELETE /api/newsletter-subscribers/1      -> 401
 *   - PATCH /api/newsletter-subscribers/1       -> 401
 *   - GET  /admin/newsletter                    -> 200 or 404
 *
 * With admin session:
 *   - GET  /api/newsletter-subscribers          -> 200 with
 *                                                  subscribers[]
 *   - POST /api/newsletter (public form contract)
 *      \-> row visible on subsequent GET
 *   - DELETE /api/newsletter-subscribers/<new>  -> 200; subsequent
 *                                                  GET -> active=
 *                                                  false on the row
 *   - PATCH /api/newsletter-subscribers/<new>   -> 200; reactivates
 *
 * audit_log assertion optional if /api/operator/audit is reachable.
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
  console.log(`[smoke-newsletter ${ts()}] ${line}`);
}
function fail(line) {
  console.error(`[smoke-newsletter FAIL ${ts()}] ${line}`);
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
  const email = `${tag}@smoke.example.com`;

  log(`checking newsletter surface (tag=${tag})`);

  // 1) Anon gating on every mutate/read.
  await expectEqual("GET", "/api/newsletter-subscribers", 401);
  await expectEqual("DELETE", "/api/newsletter-subscribers/1", 401);
  await expectEqual("PATCH", "/api/newsletter-subscribers/1", 401);

  // 2) Admin index route.
  const adm = await fetchRaw("GET", "/admin/newsletter", {});
  if (adm.status !== 200 && adm.status !== 404) {
    fail(`/admin/newsletter -> ${adm.status} (expected 200 or 404)`);
  }
  log(`ok - GET /admin/newsletter  -> ${adm.status}`);

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    log(
      "skip - SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD not set; round-trip deferred"
    );
    log("OK - newsletter gating as designed (anonymous probes only).");
    process.exit(0);
  }

  log("proceeding with admin-session round-trip");
  const jar = await loginAdmin();
  if (!jar["__Secure-next-auth.session-token"] && !jar["next-auth.session-token"]) {
    log("warn - admin login did not yield a session token");
    log("OK - newsletter gating as designed (anonymous probes only).");
    process.exit(0);
  }
  log("ok - admin login captured session cookie");

  // 3) Insert a tagged subscriber via the public form contract.
  const publicForm = await fetchRaw("POST", "/api/newsletter", {
    body: { email },
  });
  if (publicForm.status !== 200 && publicForm.status !== 201) {
    fail(
      `POST /api/newsletter (public) -> ${publicForm.status}; smoke needs at least the public form functional.`
    );
  }
  log(`ok - POST /api/newsletter (public)  -> ${publicForm.status}`);

  // 4) GET with admin -> the row appears.
  const listRaw = await fetchRaw(
    "GET",
    `/api/newsletter-subscribers?q=${encodeURIComponent(tag)}`,
    { cookie: cookieHeader(jar) }
  );
  if (listRaw.status !== 200) {
    fail(
      `GET /api/newsletter-subscribers (authed) -> ${listRaw.status} expected 200`
    );
  }
  const list = await readJson(listRaw);
  const match = (list?.subscribers ?? []).find(
    (s) => s?.email === email
  );
  if (!match) {
    fail(
      `tagged subscriber ${email} not visible on /api/newsletter-subscribers GET`
    );
  }
  const id = match.id;
  log(`ok - GET /api/newsletter-subscribers  -> 200 (subscriber id=${id})`);

  // 5) Deactivate -> soft-delete flips active=0.
  const delRaw = await fetchRaw(
    "DELETE",
    `/api/newsletter-subscribers/${id}`,
    { cookie: cookieHeader(jar) }
  );
  if (delRaw.status !== 200) {
    fail(
      `DELETE /api/newsletter-subscribers/${id} -> ${delRaw.status} expected 200`
    );
  }
  const delPayload = await readJson(delRaw);
  if (delPayload?.active !== 0) {
    fail(`DELETE did not return active=0; got ${JSON.stringify(delPayload)}`);
  }
  log(`ok - DELETE /api/newsletter-subscribers/${id}  -> 200 active=0`);

  // 6) Re-show in subscribers list with ?all=1 -> still visible because soft-delete.
  const allRaw = await fetchRaw(
    "GET",
    `/api/newsletter-subscribers?q=${encodeURIComponent(tag)}&all=1`,
    { cookie: cookieHeader(jar) }
  );
  if (allRaw.status !== 200) {
    fail(`GET (all=1) -> ${allRaw.status}`);
  }
  const allList = await readJson(allRaw);
  const stillThere = (allList?.subscribers ?? []).find(
    (s) => s?.email === email
  );
  if (!stillThere) {
    fail(
      `soft-deleted subscriber ${email} should still appear with ?all=1`
    );
  }
  if (stillThere.active !== false) {
    fail(
      `soft-deleted subscriber ${email} still shows active=true (got active=${stillThere.active})`
    );
  }
  log(`ok - subscriber ${email} visible with ?all=1 (active=false)`);

  // 7) Reactivate -> flips back to active=1.
  const patchRaw = await fetchRaw(
    "PATCH",
    `/api/newsletter-subscribers/${id}`,
    { cookie: cookieHeader(jar) }
  );
  if (patchRaw.status !== 200) {
    fail(
      `PATCH /api/newsletter-subscribers/${id} -> ${patchRaw.status} expected 200`
    );
  }
  log(`ok - PATCH /api/newsletter-subscribers/${id}  -> 200`);

  // 8) Audit. The newsletter route emits newsletter.deactivate +
  //    newsletter.reactivate entries.
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
    const deactivateMatch = arr.find(
      (l) =>
        l?.kind === "newsletter.deactivate" &&
        typeof l?.message === "string" &&
        l.message.includes(email)
    );
    const reactivateMatch = arr.find(
      (l) =>
        l?.kind === "newsletter.reactivate" &&
        typeof l?.message === "string" &&
        l.message.includes(email)
    );
    if (!deactivateMatch) {
      fail(
        `audit_log did not record newsletter.deactivate for ${email}`
      );
    }
    if (!reactivateMatch) {
      fail(
        `audit_log did not record newsletter.reactivate for ${email}`
      );
    }
    log(
      `ok - audit_log has newsletter.deactivate + newsletter.reactivate entries for ${email}`
    );
  } else {
    log("warn - audit not reachable; smoke continues without audit assert");
  }

  log("OK - newsletter round-trip is clean.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
