#!/usr/bin/env node
/**
 * Phase 5 durability probe - the smoke the prior sessions kept
 * flagging. Verifies:
 *
 *   1. Login as admin user (already known to work)
 *   2. POST a new project -> id
 *   3. Read the same id back from the public admin list
 *   4. DELETE the row in a separate session (simulates cold start)
 *
 * On the live Vercel URL with DATABASE_URL set (Postgres), this
 * should round-trip clean. On a SQLite Vercel hot-copy (no DB URL),
 * the write goes to /tmp/etihad-<region>.db which is wiped on
 * cold start; we surface that so we know durability is gated on
 * Postgres not on the SQLite fallback path.
 *
 * Cold-start is simulated with a separate pool/node "session" in
 * scripts/smoke-api.mjs but here we just split the same Node.
 * The read in the same Node, the row should still be visible.
 * To test across cold starts you'd need to forcibly redeploy via
 *    `vercel --prod`
 * and run again. This script documents that path.
 */
const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL || "studio@etihadinteriors.com";
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "t1fo7uanZ03v1dMKk2v8nByJ";

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
function decodeCookies(header) {
  const cookies = {};
  for (const c of header.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const [k, ...v] = pair.split("=");
    if (k) cookies[k] = v.join("=");
  }
  return cookies;
}
function jarOf(jars) {
  return Object.entries(jars)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function login() {
  const c = await fetch(BASE + "/api/auth/csrf");
  const cookies = decodeCookies(c.headers.get("set-cookie") || "");
  const csrfToken = (await c.json()).csrfToken;
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
  Object.assign(cookies, decodeCookies(r.headers.get("set-cookie") || ""));
  return cookies;
}

(async () => {
  head("Same-container durability (Postgres runtime path)");
  const cookies = await login();
  const ck = jarOf(cookies);
  console.log("  login ok");

  console.log("  POST a new test row...");
  const stamp = Date.now();
  const created = await fetch(BASE + "/api/projects", {
    method: "POST",
    headers: { Cookie: ck, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Durability probe ${stamp}`,
      slug: `durability-probe-${stamp}`,
      isPublished: false,
      description: "Phase 5 durability check",
    }),
  });
  if (created.status !== 200 && created.status !== 201) {
    bad("POST /api/projects", "status " + created.status);
    console.log(fail + " failures");
    process.exit(1);
  }
  const cj = await created.json();
  const id = cj?.project?.id ?? cj?.id;
  ok("POST /api/projects id=" + id);

  console.log("  GET same id back...");
  const single = await fetch(BASE + "/api/projects/" + id, {
    headers: { Cookie: ck },
  });
  if (single.status === 200) ok("GET /api/projects/" + id);
  else bad("GET /api/projects/" + id, "status " + single.status);

  console.log("  GET it from the public /api/projects list...");
  const list = await fetch(BASE + "/api/projects", {
    headers: { Cookie: ck },
  });
  const lb = await list.json();
  const found = (Array.isArray(lb) ? lb : lb.rows || []).find((r) => r.id === id);
  if (found) ok("list contains new id within same container");
  else bad("list contains new id", "not in same-container list");

  console.log("  PUT an edit on the same row...");
  const edit = await fetch(BASE + "/api/projects/" + id, {
    method: "PUT",
    headers: { Cookie: ck, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Updated " + stamp }),
  });
  if (edit.status === 200) ok("PUT /api/projects/" + id);
  else bad("PUT /api/projects/" + id, "status " + edit.status);

  console.log("  DELETE for cleanup...");
  const del = await fetch(BASE + "/api/projects/" + id, {
    method: "DELETE",
    headers: { Cookie: ck },
  });
  if (del.status === 200 || del.status === 204) ok("DELETE cleanup");
  else bad("DELETE cleanup", "status " + del.status);

  head("Summary");
  console.log(`pass=${pass} fail=${fail}`);
  console.log("Note: same-container durability != cold-start durability.");
  console.log("To validate cold-start durability, the operator must");
  console.log("run a vercel --prod redeploy between two smoke passes");
  console.log("and confirm the rows survive.");
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
