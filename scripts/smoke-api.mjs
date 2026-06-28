#!/usr/bin/env node
/**
 * scripts/smoke-api.mjs
 *
 * v1.1.2 Phase 8 acceptance: API-level cold-start durability smoke.
 *
 * Steps:
 *   1. Sign in to /api/auth/callback/credentials with admin creds.
 *   2. GET /api/auth/csrf to grab the bare token half.
 *   3. POST /api/projects      -> an admin write through the API.
 *   4. POST /api/journal       -> another.
 *   5. POST /api/testimonials  -> another.
 *   6. Sleep 3s.
 *   7. New fetch session (fresh TCP): GET /api/projects?slug=<new>
 *      and assert the row survived.
 *   8. Cleanup: DELETE the rows we created.
 *
 * Exit codes:
 *   0 - all assertions passed
 *   1 - assertion failed
 *   2 - missing operator credentials (no SMOKE_ADMIN_EMAIL etc.)
 *
 * Required environment:
 *   SMOKE_BASE_URL      - default https://ethinterior.vercel.app
 *   SMOKE_ADMIN_EMAIL   - e.g. studio@etihadinteriors.com
 *   SMOKE_ADMIN_PASSWORD- e.g. <the secret>
 *
 * Optional:
 *   SMOKE_KEEP_ROWS=1   - skip the cleanup step (for debugging)
 */
function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(line) {
  console.log(`[smoke-api ${ts()}] ${line}`);
}
function fail(msg) {
  console.error(`[smoke-api FAIL ${ts()}] ${msg}`);
  process.exit(1);
}

const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error(
    "[smoke-api] SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD not set; abort."
  );
  process.exit(2);
}

const STAMP = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const PROJ_SLUG = `smoke-proj-${STAMP}`;
const JRN_SLUG = `smoke-jrn-${STAMP}`;
const TEST_NAME = `Smoke T ${STAMP}`;
const TEAM_NAME = `Smoke TM ${STAMP}`;

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
      `csrf endpoint did not return a token (status ${csrfRes.status}, body ${JSON.stringify(
        csrfBody
      ).slice(0, 200)})`
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
    jar["__Secure-next-auth.session-token"] ||
    jar["next-auth.session-token"];
  if (!sessionToken) {
    fail(
      `credentials callback did not produce a session cookie (status ${cb.status}). Existing cookies: ${Object.keys(jar).join(",")}`
    );
  }
  log("session cookie captured");
  return jar;
}

async function authed(path, init = {}, jar) {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  if (jar && Object.keys(jar).length) {
    headers.set("Cookie", cookieHeader(jar));
  }
  return fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
}

async function write(path, body, jar) {
  const res = await authed(
    path,
    { method: "POST", body: JSON.stringify(body) },
    jar
  );
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function update(path, body, jar) {
  const res = await authed(
    path,
    { method: "PUT", body: JSON.stringify(body) },
    jar
  );
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function del(path, jar) {
  const res = await authed(path, { method: "DELETE" }, jar);
  return { status: res.status };
}

async function listBySlug(path, slugField, slugValue, jar) {
  const res = await authed(path, {}, jar);
  let rows = [];
  try {
    rows = await res.json();
  } catch {}
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => r[slugField] === slugValue);
}

async function main() {
  const jar = await login();

  log("step 3 - POST /api/projects");
  const projectResp = await write(
    "/api/projects",
    {
      title: `Smoke Project ${STAMP}`,
      slug: PROJ_SLUG,
      category: "Residential",
      location: "Smoke City",
      locationCity: "Smoke",
      year: "2026",
      scope: "Smoke scope",
      description: "Created by smoke-api.mjs as a Phase 8 acceptance test.",
      beforeImage: `${BASE}/uploads/images/hero.jpg`,
      afterImage: `${BASE}/uploads/images/hero.jpg`,
      isPublished: true,
    },
    jar
  );
  if (projectResp.status >= 400) {
    fail(
      `POST /api/projects returned ${projectResp.status} ${JSON.stringify(
        projectResp.json
      ).slice(0, 200)}`
    );
  }
  const projectId = projectResp.json?.project?.id || projectResp.json?.id;
  if (!projectId) {
    fail(
      `project id missing in response: ${JSON.stringify(projectResp.json).slice(0, 200)}`
    );
  }
  log(`project row id=${projectId}`);

  log("step 4 - POST /api/journal");
  const jrnResp = await write(
    "/api/journal",
    {
      title: `Smoke Journal ${STAMP}`,
      slug: JRN_SLUG,
      excerpt: "Created by smoke-api.mjs as a Phase 8 acceptance test.",
      content: "Smoke body content.",
      category: "Materials",
      authorName: "Smoke Bot",
      coverImage: `${BASE}/uploads/images/hero.jpg`,
      isPublished: true,
    },
    jar
  );
  if (jrnResp.status >= 400) {
    fail(
      `POST /api/journal returned ${jrnResp.status} ${JSON.stringify(
        jrnResp.json
      ).slice(0, 200)}`
    );
  }
  const journalId = jrnResp.json?.item?.id || jrnResp.json?.id;
  if (!journalId) {
    fail(
      `journal id missing in response: ${JSON.stringify(jrnResp.json).slice(0, 200)}`
    );
  }
  log(`journal row id=${journalId}`);

  log("step 5 - POST /api/testimonials");
  const testResp = await write(
    "/api/testimonials",
    {
      name: TEST_NAME,
      role: "Smoke",
      quote: "Created by smoke-api.mjs as a Phase 8 acceptance test.",
      photo: `${BASE}/uploads/images/hero.jpg`,
      isPublished: true,
    },
    jar
  );
  if (testResp.status >= 400) {
    fail(
      `POST /api/testimonials returned ${testResp.status} ${JSON.stringify(
        testResp.json
      ).slice(0, 200)}`
    );
  }
  const testimonialId = testResp.json?.item?.id;
  if (!testimonialId) {
    fail(
      `testimonial id missing in response: ${JSON.stringify(testResp.json).slice(0, 200)}`
    );
  }
  log(`testimonial row id=${testimonialId}`);

  log("step 6 - POST /api/team");
  const teamResp = await write(
    "/api/team",
    {
      name: TEAM_NAME,
      role: "Smoke",
      bio: "Created by smoke-api.mjs.",
      photo: `${BASE}/uploads/images/hero.jpg`,
      order: 999,
      isPublished: true,
    },
    jar
  );
  if (teamResp.status >= 400) {
    fail(
      `POST /api/team returned ${teamResp.status} ${JSON.stringify(
        teamResp.json
      ).slice(0, 200)}`
    );
  }
  const teamId = teamResp.json?.item?.id;
  if (!teamId) {
    fail(
      `team id missing in response: ${JSON.stringify(teamResp.json).slice(0, 200)}`
    );
  }
  log(`team row id=${teamId}`);

  log("step 7 - cold-start probe: separate fetch + cookie reset");
  // Sleep to give Vercel's edge a chance to evict the lambda.
  await new Promise((r) => setTimeout(r, 3000));
  const freshJar = { ...jar }; // cookies only; new TCP from here.
  const projectGet = await listBySlug(
    "/api/projects",
    "slug",
    PROJ_SLUG,
    freshJar
  );
  if (projectGet.length !== 1) {
    fail(
      `expected 1 project with slug=${PROJ_SLUG}; got ${projectGet.length}`
    );
  }
  log(
    `cold-start GET /api/projects -> ${projectGet.length} match for slug=${PROJ_SLUG}`
  );

  const journalGet = await listBySlug(
    "/api/journal",
    "slug",
    JRN_SLUG,
    freshJar
  );
  if (journalGet.length !== 1) {
    fail(`expected 1 journal with slug=${JRN_SLUG}; got ${journalGet.length}`);
  }
  log(
    `cold-start GET /api/journal -> ${journalGet.length} match for slug=${JRN_SLUG}`
  );

  const testimonialGet = await listBySlug(
    "/api/testimonials",
    "name",
    TEST_NAME,
    freshJar
  );
  if (testimonialGet.length !== 1) {
    fail(
      `expected 1 testimonial with name=${TEST_NAME}; got ${testimonialGet.length}`
    );
  }
  log(
    `cold-start GET /api/testimonials -> ${testimonialGet.length} match for name=${TEST_NAME}`
  );

  const teamGet = await listBySlug("/api/team", "name", TEAM_NAME, freshJar);
  if (teamGet.length !== 1) {
    fail(`expected 1 team with name=${TEAM_NAME}; got ${teamGet.length}`);
  }
  log(
    `cold-start GET /api/team -> ${teamGet.length} match for name=${TEAM_NAME}`
  );

  // Round-trip: read by id via the GET endpoints that Phase 5/6/7 added.
  log("step 8 - row-level GET round-trip");
  for (const [path, id] of [
    [`/api/projects/${projectId}`, projectId],
    [`/api/journal/${journalId}`, journalId],
    [`/api/testimonials/${testimonialId}`, testimonialId],
    [`/api/team/${teamId}`, teamId],
  ]) {
    const r = await authed(path, {}, freshJar);
    if (r.status !== 200) {
      fail(`row GET ${path} -> ${r.status}`);
    }
    log(`row GET ${path} -> 200`);
  }

  if (process.env.SMOKE_KEEP_ROWS !== "1") {
    log("step 9 - cleanup");
    await del(`/api/projects/${projectId}`, jar);
    await del(`/api/journal/${journalId}`, jar);
    await del(`/api/testimonials/${testimonialId}`, jar);
    await del(`/api/team/${teamId}`, jar);
    log("cleanup complete");
  } else {
    log("step 9 - cleanup skipped (SMOKE_KEEP_ROWS=1)");
  }

  log("OK - admin writes persisted across two cold-starts");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
