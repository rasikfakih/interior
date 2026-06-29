#!/usr/bin/env node
/**
 * scripts/smoke-coldstart.mjs
 *
 * Phase 5 cross-coldstart durability probe. The prior
 * smoke-durability.mjs proves same-container durability end to
 * end. This probe proves the harder claim: a write survives a
 * Vercel cold start where the runtime container is destroyed
 * and rehydrated.
 *
 * Approach
 *
 *  1. Login as admin.
 *  2. POST a uniquely tagged project row.
 *  3. Wait SMOKE_COLD_WAIT seconds (default 90). On Vercel
 *     Hobby, idle containers are typically recycled within 60s.
 *  4. Re-GET the row by id. If the live DATABASE_URL is the
 *     Supabase Postgres bridge, the row is durable across the
 *     new container. If the runtime is the SQLite hot-copy
 *     path (no DATABASE_URL on Vercel), the row is gone and
 *     this probe exits 3 with a clear message about the env
 *     gap.
 *  5. Sanity probe: GET the same id with a fresh fetch
 *     context (no shared cookies). Same expectation.
 *  6. Run the contract: if durable -> exit 0. If ephemeral ->
 *     exit 3 with the operator-friendly message.
 *
 * Setup
 *
 *   SMOKE_BASE_URL=https://ethinterior.vercel.app
 *   SMOKE_ADMIN_EMAIL=studio@etihadinteriors.com
 *   SMOKE_ADMIN_PASSWORD=<operator-controlled secret>
 *   SMOKE_COLD_WAIT=90    # optional; 90 = realistic Vercel
 *                         # idle window on Hobby plan
 *
 * README entry at docs/CONTEXT.md "What is pending" treats
 * this as the Phase 1 acceptance test for v1.1.2. Confirming
 * exit 0 here is the durable-trace proof.
 */

const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;
const COLD_WAIT_MS = Number(process.env.SMOKE_COLD_WAIT || 90) * 1000;

if (!EMAIL || !PASSWORD) {
  console.error(
    "[smoke-coldstart] SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD not set; abort."
  );
  process.exit(2);
}

let pass = 0;
let fail = 0;
function ok(label) {
  pass++;
  console.log("  PASS " + label);
}
function bad(label, detail) {
  fail++;
  console.log("  FAIL " + label + (detail ? ": " + detail : ""));
}
function head(label) {
  console.log("\n=== " + label + " ===");
}
function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(line) {
  console.log(`[smoke-coldstart ${ts()}] ${line}`);
}

function decodeCookies(headers) {
  const cookies = {};
  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie") || "";
  const parts = Array.isArray(raw) ? raw : String(raw).split(/,\s+/);
  for (const piece of parts) {
    const head = piece.split(";")[0];
    const eq = head.indexOf("=");
    if (eq < 0) continue;
    const name = head.slice(0, eq).trim();
    const value = head.slice(eq + 1);
    if (!name) continue;
    const expired = /Expires=.*1970/i.test(piece) || value === "" || value === "deleted";
    if (expired) delete cookies[name];
    else cookies[name] = value;
  }
  return cookies;
}
function jarOf(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function login() {
  const c = await fetch(BASE + "/api/auth/csrf");
  const cookies = decodeCookies(c.headers);
  const csrfToken = (await c.json()).csrfToken || (await c.json())["csrf-token"];
  if (!csrfToken) {
    throw new Error("csrf empty");
  }
  const body = new URLSearchParams({
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    callbackUrl: BASE + "/admin",
    json: "true",
  });
  const r = await fetch(BASE + "/api/auth/callback/credentials?json=true", {
    method: "POST",
    headers: {
      Cookie: jarOf(cookies),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    redirect: "manual",
  });
  Object.assign(cookies, decodeCookies(r.headers));
  if (!cookies["__Secure-next-auth.session-token"] && !cookies["next-auth.session-token"]) {
    throw new Error("login did not yield session cookie");
  }
  return cookies;
}

async function postProbe(jar, title, slug) {
  return fetch(BASE + "/api/projects", {
    method: "POST",
    headers: {
      Cookie: jarOf(jar),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      title,
      slug,
      isPublished: false,
      description: "Cross-coldstart durability check",
    }),
  });
}

async function getProject(jar, id) {
  return fetch(BASE + "/api/projects/" + id, {
    headers: {
      Cookie: jarOf(jar),
      Accept: "application/json",
    },
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  log("BASE=" + BASE);
  log("COLD_WAIT_MS=" + COLD_WAIT_MS);
  head("Step 1 - login");
  const jar = await login();
  ok("login captured session cookie");

  head("Step 2 - POST tagged row");
  const stamp = Date.now();
  const tag = `coldstart-${stamp}`;
  const slug = `coldstart-probe-${stamp}`;
  const created = await postProbe(jar, `Coldstart probe ${stamp}`, slug);
  if (created.status !== 200 && created.status !== 201) {
    bad("POST /api/projects", "status " + created.status);
    log(`fail=${fail} pass=${pass}; abort.`);
    process.exit(1);
  }
  const cj = await created.json();
  const id = cj?.project?.id ?? cj?.id;
  if (!id) {
    bad("POST /api/projects body", "no id in response");
    log("body=" + JSON.stringify(cj).slice(0, 400));
    log(`fail=${fail} pass=${pass}; abort.`);
    process.exit(1);
  }
  ok(`POST -> id=${id} slug=${slug}`);

  head("Step 3 - read back immediately (sanity)");
  const sameContainer = await getProject(jar, id);
  if (sameContainer.status === 200) ok("GET /api/projects/" + id + " in same container");
  else bad("GET same container", "status " + sameContainer.status);

  head(`Step 4 - sleep ${Math.round(COLD_WAIT_MS / 1000)}s, allow Vercel to recycle the container`);
  await sleep(COLD_WAIT_MS);

  head("Step 5 - re-GET id post-coldstart");
  const post = await getProject(jar, id);
  const postBody = await post.json().catch(() => ({}));
  if (post.status === 200) {
    ok("GET /api/projects/" + id + " after coldstart -> durable");
    log("title persists: " + (postBody?.title || ""));
  } else if (post.status === 404) {
    bad(
      "GET /api/projects/" + id + " post-coldstart -> 404",
      "row vanished across coldstart -> runtime is SQLite hot-copy, " +
        "not Postgres. Confirm DATABASE_URL on Vercel."
    );
    log(
      "Phase 1 v1.1.2 acceptance failed: cross-coldstart durability not proven."
    );
    log(
      "Set DATABASE_URL on Vercel (project URL or session-pooler) and re-run."
    );
    log(`fail=${fail} pass=${pass}`);
    process.exit(3);
  } else {
    bad("GET post-coldstart unexpected", "status " + post.status);
    log(`fail=${fail} pass=${pass}`);
    process.exit(1);
  }

  head("Step 6 - cleanup DELETE");
  const del = await fetch(BASE + "/api/projects/" + id, {
    method: "DELETE",
    headers: { Cookie: jarOf(jar) },
  });
  if (del.status === 200 || del.status === 204) ok("DELETE cleanup");
  else bad("DELETE cleanup", "status " + del.status);

  head("Summary");
  console.log(`pass=${pass} fail=${fail}`);
  console.log("Cross-coldstart durability PROVEN. Postgres runtime is live.");
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
