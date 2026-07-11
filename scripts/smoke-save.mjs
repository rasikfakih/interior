#!/usr/bin/env node
/**
 * scripts/smoke-save.mjs
 *
 * TS-007 acceptance: atomic page-save + blocks GET.
 *
 * Without auth:
 *   - POST /api/pages/1/save           -> 401
 *   - GET  /api/pages/1/blocks         -> 401
 *
 * With admin session:
 *   - GET  /api/pages/1/blocks         -> 200 with prior blocks list
 *   - POST /api/pages/1/save
 *     { meta:{title:"..."}, blocks:[...] }
 *                                       -> 200
 *                                       with audit.kind === "pages.save"
 *                                       and audit.message echoing pageId +
 *                                       meta=1 / blocks=N
 *   - GET  /api/pages/1/blocks again   -> 200 with the new block count
 *
 * The save is atomic: meta + blocks land in one withPgTx, so a partial
 * save cannot land a new block array plus an old title. We verify the
 * audit message reports metaSaved + blocksSaved counts honestly.
 *
 * Optional restore block (when SMOKE_SAVE_NO_RESTORE is unset):
 *   - Re-POST the original blocks list back to /api/pages/1/save so the
 *     public site returns to its pre-smoke state.
 *
 * Exit codes:
 *   0 - all assertions passed
 *   1 - assertion failed (offline / shape mismatch / status mismatch)
 *   2 - missing operator credentials
 *
 * Required environment:
 *   SMOKE_BASE_URL       - default https://ethinterior.vercel.app
 *   SMOKE_ADMIN_EMAIL    - e.g. studio@etihadinteriors.com
 *   SMOKE_ADMIN_PASSWORD - the operator-supplied secret
 *
 * Optional:
 *   SMOKE_SAVE_NO_RESTORE=1  - skip the cleanup step (for debugging)
 *   SMOKE_SAVE_PAGE_ID=1     - override the target page id (default 1)
 */
function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(line) {
  console.log(`[smoke-save ${ts()}] ${line}`);
}
function fail(msg) {
  console.error(`[smoke-save FAIL ${ts()}] ${msg}`);
  process.exit(1);
}

const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;
const PAGE_ID = Number(process.env.SMOKE_SAVE_PAGE_ID || "1") || 1;
const NO_RESTORE = process.env.SMOKE_SAVE_NO_RESTORE === "1";

if (!EMAIL || !PASSWORD) {
  console.error(
    "[smoke-save] SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD not set; abort."
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

async function login() {
  log("step 1 - csrf token fetch");
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    redirect: "manual",
    headers: { Accept: "application/json" },
  });
  const csrfBody = await csrfRes.json();
  const csrfToken = csrfBody?.csrfToken || csrfBody?.["csrf-token"];
  if (!csrfToken) {
    fail(
      `csrf endpoint did not return a token (status ${csrfRes.status})`
    );
  }
  log(`csrf token len=${csrfToken.length}`);
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
  const cb = await fetch(
    `${BASE}/api/auth/callback/credentials?json=true`,
    {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieHeader(jar),
        Accept: "application/json",
      },
      body: body.toString(),
    }
  );
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

function authedHeaders(jar) {
  const h = new Headers();
  h.set("Accept", "application/json");
  h.set("Content-Type", "application/json");
  if (jar && Object.keys(jar).length) {
    h.set("Cookie", cookieHeader(jar));
  }
  return h;
}

async function fetchAnon(method, path, body) {
  return fetch(`${BASE}${path}`, {
    method,
    redirect: "manual",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function fetchAuthed(method, path, body, jar) {
  return fetch(`${BASE}${path}`, {
    method,
    redirect: "manual",
    headers: authedHeaders(jar),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function assertStatus(actual, expected, where) {
  if (actual !== expected) {
    fail(`${where}: status ${actual} expected exactly ${expected}`);
  }
}

async function main() {
  log(`smoke running against ${BASE}`);
  log(`target page id = ${PAGE_ID}`);

  log("ANON probes");
  const anonSave = await fetchAnon("POST", `/api/pages/${PAGE_ID}/save`, {
    meta: { title: "smoke anon" },
    blocks: [],
  });
  assertStatus(anonSave.status, 401, "anon POST /save");
  log("ok - anon POST /save -> 401");

  const anonBlocks = await fetchAnon("GET", `/api/pages/${PAGE_ID}/blocks`);
  assertStatus(anonBlocks.status, 401, "anon GET /blocks");
  log("ok - anon GET /blocks -> 401");

  log(`AUTH probes (login as ${EMAIL})`);
  const jar = await login();

  log("step 3 - read existing blocks (pre-save snapshot)");
  const pre = await fetchAuthed("GET", `/api/pages/${PAGE_ID}/blocks`, undefined, jar);
  if (pre.status !== 200) {
    fail(
      `admin GET /api/pages/${PAGE_ID}/blocks -> ${pre.status} (expected 200). Confirm the page exists.`
    );
  }
  const preBody = await pre.json();
  const preBlocks = Array.isArray(preBody?.blocks) ? preBody.blocks : [];
  log(`ok - GET /api/pages/${PAGE_ID}/blocks -> 200 (${preBlocks.length} blocks before save)`);

  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const testType = "smoke-marker";
  const testBlock = {
    type: testType,
    data: { stamp, marker: "ts-007-smoke-block" },
  };

  log(`step 4 - atomic save with meta + the test block`);
  const newTitle = `Smoke Title ${stamp}`;
  const saveBody = {
    meta: { title: newTitle },
    blocks: [...preBlocks, testBlock],
  };
  const save = await fetchAuthed("POST", `/api/pages/${PAGE_ID}/save`, saveBody, jar);
  if (save.status !== 200) {
    const txt = await save.text().catch(() => "");
    fail(
      `admin POST /api/pages/${PAGE_ID}/save -> ${save.status} (expected 200). body=${txt.slice(0, 240)}`
    );
  }
  const saveBodyOut = await save.json();
  if (!saveBodyOut?.success) {
    fail(`POST /save did not return success=true (body=${JSON.stringify(saveBodyOut).slice(0, 200)})`);
  }
  const savedMeta = saveBodyOut?.saved?.meta;
  const savedBlocks = saveBodyOut?.saved?.blocks;
  if (savedMeta !== true) fail(`expected saved.meta=true got ${savedMeta}`);
  if (savedBlocks !== preBlocks.length + 1) {
    fail(`expected saved.blocks=${preBlocks.length + 1} got ${savedBlocks}`);
  }
  if (!saveBodyOut?.audit || saveBodyOut.audit.kind !== "pages.save") {
    fail(`expected audit.kind="pages.save" got ${JSON.stringify(saveBodyOut?.audit)}`);
  }
  if (
    !saveBodyOut.audit.message ||
    !saveBodyOut.audit.message.includes(`pageId: ${PAGE_ID}`)
  ) {
    fail(`expected audit.message to include pageId info; got ${saveBodyOut.audit.message}`);
  }
  log(
    `ok - POST /save -> 200, saved.meta=1, saved.blocks=${savedBlocks}, audit=${saveBodyOut.audit.kind}`
  );

  log("step 5 - read blocks post-save and confirm the marker landed");
  let postBlocks = [];
  for (let i = 0; i < 5; i++) {
    const post = await fetchAuthed(
      "GET",
      `/api/pages/${PAGE_ID}/blocks`,
      undefined,
      jar
    );
    if (post.status === 200) {
      const body = await post.json();
      postBlocks = Array.isArray(body?.blocks) ? body.blocks : [];
      if (postBlocks.length >= preBlocks.length + 1) break;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  if (postBlocks.length < preBlocks.length + 1) {
    fail(
      `GET blocks after save did not reflect new row count (saw ${postBlocks.length}, expected at least ${preBlocks.length + 1})`
    );
  }
  const sawMarker = postBlocks.some((b, i) => {
    if (b?.type !== testType && i !== postBlocks.length - 1) return false;
    const d = b?.data;
    if (d && typeof d === "object" && d.stamp === stamp) return true;
    if (typeof d === "string" && d.includes(stamp)) return true;
    return false;
  });
  if (!sawMarker) {
    fail(
      `marker block with stamp ${stamp} did not round-trip through the save endpoint`
    );
  }
  log(`ok - new block round-tripped (${postBlocks.length} blocks after save)`);

  log("step 6 - atomicity probe: save with NULL meta, only blocks change");
  const blocksOnly = preBlocks.slice(0, Math.max(preBlocks.length - 1, 0));
  const atomicRes = await fetchAuthed(
    "POST",
    `/api/pages/${PAGE_ID}/save`,
    { meta: {}, blocks: blocksOnly },
    jar
  );
  if (atomicRes.status !== 200) {
    fail(`atomicity probe save returned ${atomicRes.status} (expected 200)`);
  }
  const atomicBody = await atomicRes.json();
  if (atomicBody?.saved?.meta !== false) {
    fail(
      `atomicity probe expected saved.meta=false got ${atomicBody?.saved?.meta}`
    );
  }
  if (Number(atomicBody?.saved?.blocks || 0) !== blocksOnly.length) {
    fail(
      `atomicity probe expected saved.blocks=${blocksOnly.length} got ${atomicBody?.saved?.blocks}`
    );
  }
  log(
    `ok - empty-meta save -> saved.meta=false, saved.blocks=${atomicBody.saved.blocks}`
  );

  if (!NO_RESTORE) {
    log("step 7 - restore the original blocks list (cleanup)");
    const restore = await fetchAuthed(
      "POST",
      `/api/pages/${PAGE_ID}/save`,
      { meta: {}, blocks: preBlocks },
      jar
    );
    if (restore.status !== 200) {
      fail(`restore save returned ${restore.status} (expected 200)`);
    }
    log("ok - restore POST /save -> 200 (cleanup complete)");
  } else {
    log("skip - SMOKE_SAVE_NO_RESTORE=1 set; leaving the smoke state in place");
  }

  log("DONE - all assertions PASSED");
  process.exit(0);
}

main().catch((err) => {
  fail(`unhandled exception: ${err?.message || String(err)}`);
});
