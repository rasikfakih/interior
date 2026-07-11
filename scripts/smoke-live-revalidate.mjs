#!/usr/bin/env node
/**
 * scripts/smoke-live-revalidate.mjs
 *
 * TS-008 acceptance: WordPress-grade live update between admin
 * writes and the public front end.
 *
 * Steps:
 *   1. Sign in as admin
 *   2. Capture the public homepage bytes via anon GET /
 *   3. POST a small dedicated marker block into /api/pages/1/save
 *      (the home page) with the marker stamp
 *   4. Wait SMOKE_LIVE_GRACE_MS (default 350)
 *   5. Re-GET / anon and assert the marker stamp shows up in
 *      the HTML payload (skipping whitespace differences)
 *   6. Cleanup: POST /api/pages/1/save with the original blocks
 *      list back, restoring the public site to its pre-smoke
 *      state. Skipped when SMOKE_LIVE_NO_RESTORE=1 is set.
 *
 * Without the revalidate wiring this smoke steadily fails: the
 * 60s ISR cache (and the static prerender baked at build time on
 * Vercel) means the new block never shows up. With revalidatePath
 * landed on every admin write the next anon GET reflects the new
 * state within the smoke grace window.
 *
 * Required env:
 *   SMOKE_BASE_URL        - default https://ethinterior.vercel.app
 *   SMOKE_ADMIN_EMAIL     - e.g. studio@etihadinteriors.com
 *   SMOKE_ADMIN_PASSWORD  - operator-supplied secret
 *
 * Optional env:
 *   SMOKE_LIVE_NO_RESTORE - 1 to skip cleanup
 *   SMOKE_LIVE_PAGE_ID    - default 1 (the home page; not portable)
 *   SMOKE_LIVE_GRACE_MS   - default 350; how long to wait before
 *                            re-GETting the public URL after the
 *                            save POST
 */

function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(line) {
  console.log(`[smoke-live ${ts()}] ${line}`);
}
function fail(msg) {
  console.error(`[smoke-live FAIL ${ts()}] ${msg}`);
  process.exit(1);
}

const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;
const PAGE_ID = Number(process.env.SMOKE_LIVE_PAGE_ID || "1") || 1;
const NO_RESTORE = process.env.SMOKE_LIVE_NO_RESTORE === "1";
const GRACE_MS = Number(process.env.SMOKE_LIVE_GRACE_MS || "350") || 350;

if (!EMAIL || !PASSWORD) {
  console.error(
    "[smoke-live] SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD not set; abort."
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
    if (!head) continue;
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

async function publicFetch(path) {
  return fetch(`${BASE}${path}`, {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "text/html" },
  });
}

async function authedHeaders(jar) {
  const h = new Headers();
  h.set("Accept", "application/json");
  h.set("Content-Type", "application/json");
  if (jar && Object.keys(jar).length) {
    h.set("Cookie", cookieHeader(jar));
  }
  return h;
}

async function login() {
  log("step 1 - csrf token fetch");
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    redirect: "manual",
    headers: { Accept: "application/json" },
  });
  const csrfBody = await csrfRes.json();
  const csrfToken = csrfBody?.csrfToken || csrfBody?.["csrf-token"];
  if (!csrfToken) {
    fail(`csrf endpoint did not return a token (status ${csrfRes.status})`);
  }
  const jar = {};
  mergeCookies(jar, csrfRes.headers.get("set-cookie"));

  log("step 2 - credentials callback");
  const body = new URLSearchParams({
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    callbackUrl: `${BASE}/admin`,
    json: "true",
  });
  const cb = await fetch(`${BASE}/api/auth/callback/credentials?json=true`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
      Accept: "application/json",
    },
    body: body.toString(),
  });
  mergeCookies(jar, cb.headers.get("set-cookie"));
  const sessionToken =
    jar["__Secure-next-auth.session-token"] || jar["next-auth.session-token"];
  if (!sessionToken) {
    fail(
      `credentials callback did not produce a session cookie (status ${cb.status}). Existing cookies: ${Object.keys(jar).join(",")}`
    );
  }
  log("session cookie captured");
  return jar;
}

async function getBlocks(jar) {
  const res = await fetch(`${BASE}/api/pages/${PAGE_ID}/blocks`, {
    method: "GET",
    redirect: "manual",
    headers: await authedHeaders(jar),
  });
  if (res.status !== 200) {
    fail(`GET /api/pages/${PAGE_ID}/blocks -> ${res.status} (expected 200)`);
  }
  const body = await res.json();
  return Array.isArray(body?.blocks) ? body.blocks : [];
}

async function saveBlocks(jar, blocks) {
  const res = await fetch(`${BASE}/api/pages/${PAGE_ID}/save`, {
    method: "POST",
    redirect: "manual",
    headers: await authedHeaders(jar),
    body: JSON.stringify({ meta: {}, blocks }),
  });
  if (res.status !== 200) {
    const txt = await res.text().catch(() => "");
    fail(`POST .../save -> ${res.status} body=${txt.slice(0, 240)}`);
  }
  return res.json();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  log(`smoke running against ${BASE}`);
  log(`target page id = ${PAGE_ID}, grace = ${GRACE_MS}ms`);

  log("step 3 - capture public homepage bytes (pre-save)");
  const beforeRes = await publicFetch("/");
  if (beforeRes.status !== 200) {
    fail(`GET / -> ${beforeRes.status} (expected 200)`);
  }
  const beforeHtml = await beforeRes.text();
  log(`ok - GET / -> 200, ${beforeHtml.length} bytes`);

  log(`step 4 - login as admin and read the prior blocks list`);
  const jar = await login();
  const prior = await getBlocks(jar);
  log(`ok - GET /api/pages/${PAGE_ID}/blocks -> ${prior.length} blocks`);

  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const markerBlock = {
    type: "richtext",
    data: {
      html: `<p data-smoke-marker="${stamp}">live-update-smoke</p>`,
    },
  };

  log(`step 5 - save with the marker stamp`);
  const saveBody = {
    blocks: [...prior, markerBlock],
  };
  const save = await saveBlocks(jar, saveBody);
  if (!save?.success) {
    fail(`save returned success != true (body=${JSON.stringify(save).slice(0, 200)})`);
  }
  log(
    `ok - POST /save -> 200, saved.blocks=${save?.saved?.blocks}, audit=${save?.audit?.kind}`
  );

  log(`step 6 - grace window (${GRACE_MS}ms) then re-GET /`);
  await sleep(GRACE_MS);
  const afterRes = await publicFetch("/");
  if (afterRes.status !== 200) {
    fail(`GET / (post-save) -> ${afterRes.status} (expected 200)`);
  }
  const afterHtml = await afterRes.text();
  const stampSeen = afterHtml.includes(`data-smoke-marker="${stamp}"`);
  if (!stampSeen) {
    fail(
      `marker stamp ${stamp} did NOT reflect on the public homepage within ${GRACE_MS}ms. ` +
        `Most likely cause: revalidatePath() is not being called on admin writes (TS-008).`
    );
  }
  log(
    `ok - GET / (post-save) -> 200, ${afterHtml.length} bytes, marker stamp reflected`
  );

  if (!NO_RESTORE) {
    log("step 7 - cleanup: restore the prior block list");
    const restore = await saveBlocks(jar, prior);
    if (!restore?.success) {
      fail(
        `restore save returned success != true (body=${JSON.stringify(restore).slice(0, 200)})`
      );
    }
    log(`ok - restore POST /save -> 200, saved.blocks=${restore?.saved?.blocks}`);
  } else {
    log("skip - SMOKE_LIVE_NO_RESTORE=1, leaving the marker block in place");
  }

  log("DONE - admin write reflected on public front end within the grace window");
  process.exit(0);
}

main().catch((err) => {
  fail(`unhandled exception: ${err?.message || String(err)}`);
});
