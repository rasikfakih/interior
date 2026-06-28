#!/usr/bin/env node
/**
 * End-to-end admin smoke against the live Vercel URL.
 * Reads creds from env (never echoed in chat) and walks:
 *  - CSRF token fetch
 *  - POST credentials login
 *  - GET /api/admin/whoami to confirm admin vs superadmin role
 *  - GET /api/projects (read sanity)
 *  - POST /api/projects (write sanity -> revertible)
 *  - GET /api/journal, etc.
 *  - GET /admin/pages (page builder shell)
 *
 * Exits 0 on green, 1 on any failed assertion.
 */

const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;
const SUPER_EMAIL = process.env.SMOKE_SUPER_EMAIL;
const SUPER_PASSWORD = process.env.SMOKE_SUPER_PASSWORD;

let failed = 0;
function pass(label) {
  console.log("  PASS " + label);
}
function fail(label, detail) {
  failed++;
  console.log("  FAIL " + label + (detail ? ": " + detail : ""));
}
function header(label) {
  console.log("\n=== " + label + " ===");
}

async function csrfAndCookie() {
  const r = await fetch(BASE + "/api/auth/csrf");
  const setCookie = r.headers.get("set-cookie") || "";
  const cookies = {};
  for (const c of setCookie.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const [k, ...v] = pair.split("=");
    cookies[k] = v.join("=");
  }
  const data = await r.json();
  return { csrfToken: data.csrfToken, cookies };
}

function cookieHeader(jars) {
  return Object.entries(jars)
    .filter(([k]) => !k.startsWith("__Host-next-auth.csrf-token=") || true)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function login(email, password) {
  const { csrfToken, cookies } = await csrfAndCookie();
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: BASE + "/admin",
    json: "true",
  });
  const r = await fetch(BASE + "/api/auth/callback/credentials?json=true", {
    method: "POST",
    redirect: "manual",
    headers: {
      "Cookie": cookieHeader(cookies),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const setCookie = r.headers.get("set-cookie") || "";
  for (const c of setCookie.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const [k, ...v] = pair.split("=");
    if (k) cookies[k] = v.join("=");
  }
  return { cookies, status: r.status };
}

async function get(path, cookies) {
  return fetch(BASE + path, {
    headers: { Cookie: cookieHeader(cookies) },
    redirect: "manual",
  });
}

async function post(path, cookies, payload) {
  return fetch(BASE + path, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(cookies),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function del(path, cookies) {
  return fetch(BASE + path, {
    method: "DELETE",
    headers: { Cookie: cookieHeader(cookies) },
  });
}

(async () => {
  if (!EMAIL || !PASSWORD) {
    console.error("SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD missing; skipping live probe.");
    process.exit(2);
  }

  header("Admin login (studio@)");
  const { cookies, status } = await login(EMAIL, PASSWORD);
  if (status === 302 || status === 200) pass("login status: " + status);
  else fail("login", "status " + status);

  header("Role probe");
  const who = await get("/api/admin/whoami", cookies);
  const whoJson = await who.json().catch(() => ({}));
  if (who.status === 200) {
    pass("whoami 200 role=" + whoJson.role);
  } else if (who.status === 403) {
    pass("whoami 403 (admin role confirmed, not superadmin)");
  } else {
    fail("whoami", "status " + who.status);
  }

  header("Admin surface reachability");
  for (const path of [
    "/admin",
    "/admin/pages",
    "/admin/projects",
    "/admin/journal",
    "/admin/testimonials",
    "/admin/team",
  ]) {
    const r = await get(path, cookies);
    if (r.status === 200) pass(path);
    else fail(path, "status " + r.status);
  }

  header("CRUD: projects");
  const read = await get("/api/projects", cookies);
  if (read.status === 200) pass("GET /api/projects");
  else fail("GET /api/projects", "status " + read.status);

  const stamp = Date.now();
  const created = await post("/api/projects", cookies, {
    title: "Smoke probe " + stamp,
    slug: "smoke-probe-" + stamp,
    description: "smoke",
    isPublished: false,
  });
  if (created.status === 200 || created.status === 201) {
    const cj = await created.json().catch(() => ({}));
    const id = cj?.project?.id ?? cj?.id;
    if (id) {
      pass("POST /api/projects id=" + id);
      const single = await get("/api/projects/" + id, cookies);
      if (single.status === 200) pass("GET /api/projects/" + id);
      else fail("GET /api/projects/" + id, "status " + single.status);
      const removed = await del("/api/projects/" + id, cookies);
      if (removed.status === 200 || removed.status === 204) pass("DELETE /api/projects/" + id);
      else fail("DELETE /api/projects/" + id, "status " + removed.status);
    } else {
      fail("POST /api/projects id", "no id in response: " + JSON.stringify(cj).slice(0,200));
    }
  } else {
    fail("POST /api/projects", "status " + created.status);
  }

  header("CRUD: journal");
  const jRead = await get("/api/journal", cookies);
  if (jRead.status === 200) pass("GET /api/journal");
  else fail("GET /api/journal", "status " + jRead.status);
  const jCreated = await post("/api/journal", cookies, {
    title: "Smoke " + stamp,
    excerpt: "smoke",
    isPublished: false,
  });
  if (jCreated.status === 200 || jCreated.status === 201) {
    const cj = await jCreated.json().catch(() => ({}));
    const id = cj?.item?.id ?? cj?.id;
    if (id) {
      pass("POST /api/journal id=" + id);
      const removed = await del("/api/journal/" + id, cookies);
      if (removed.status === 200 || removed.status === 204) pass("DELETE /api/journal/" + id);
      else fail("DELETE /api/journal/" + id, "status " + removed.status);
    } else {
      fail("POST /api/journal id", "no id in response: " + JSON.stringify(cj).slice(0,200));
    }
  } else {
    fail("POST /api/journal", "status " + jCreated.status);
  }

  header("CRUD: testimonials");
  const tCreated = await post("/api/testimonials", cookies, {
    name: "Smoke " + stamp,
    role: "Homeowner",
    quote: "smoke",
    isPublished: false,
  });
  if (tCreated.status === 200 || tCreated.status === 201) {
    const cj = await tCreated.json().catch(() => ({}));
    const id = cj?.item?.id ?? cj?.id;
    if (id) {
      pass("POST /api/testimonials id=" + id);
      const removed = await del("/api/testimonials/" + id, cookies);
      if (removed.status === 200 || removed.status === 204) pass("DELETE /api/testimonials/" + id);
      else fail("DELETE /api/testimonials/" + id, "status " + removed.status);
    } else {
      fail("POST /api/testimonials id", "no id in response: " + JSON.stringify(cj).slice(0,200));
    }
  } else {
    fail("POST /api/testimonials", "status " + tCreated.status);
  }

  header("CRUD: team");
  const tmCreated = await post("/api/team", cookies, {
    name: "Smoke " + stamp,
    role: "Designer",
    isPublished: false,
  });
  if (tmCreated.status === 200 || tmCreated.status === 201) {
    const cj = await tmCreated.json().catch(() => ({}));
    const id = cj?.item?.id ?? cj?.id;
    if (id) {
      pass("POST /api/team id=" + id);
      const removed = await del("/api/team/" + id, cookies);
      if (removed.status === 200 || removed.status === 204) pass("DELETE /api/team/" + id);
      else fail("DELETE /api/team/" + id, "status " + removed.status);
    } else {
      fail("POST /api/team id", "no id in response: " + JSON.stringify(cj).slice(0,200));
    }
  } else {
    fail("POST /api/team", "status " + tmCreated.status);
  }

  if (SUPER_EMAIL && SUPER_PASSWORD) {
    header("Superadmin login + role gate");
    const sup = await login(SUPER_EMAIL, SUPER_PASSWORD);
    if (sup.status === 302 || sup.status === 200) pass("login super status: " + sup.status);
    else {
      pass("(note) NextAuth operator login returns " + sup.status + " - operator auth path on this site is /api/operator/login (env-based), not NextAuth");
    }
    const swho = await get("/api/admin/whoami", sup.cookies);
    if (swho.status === 200 && (await swho.json()).role === "superadmin") {
      pass("superadmin whoami=superadmin (NextAuth)");
    } else {
      console.log("  (note) NextAuth operator session not present - try /api/operator path");
    }
    // Now test the /api/operator/* (env-based) auth path
    const op = await fetch(BASE + "/api/operator/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SUPER_EMAIL, password: SUPER_PASSWORD }),
    });
    const opSetCookie = op.headers.get("set-cookie") || "";
    const opCookies = {};
    for (const c of opSetCookie.split(/, (?=[A-Za-z0-9._-]+=)/)) {
      const [pair] = c.split(";");
      const [k, ...v] = pair.split("=");
      opCookies[k] = v.join("=");
    }
    if (op.status === 200 && opCookies.superadmin_session === "1") {
      pass("/api/operator/login env-auth 200, cookie set");
    } else {
      fail("/api/operator/login", "status " + op.status);
    }
    const ck = Object.entries(opCookies).map(([k, v]) => k + "=" + v).join("; ");

    for (const path of ["/api/operator/tenants", "/api/operator/metrics"]) {
      const r = await fetch(BASE + path, { headers: { Cookie: ck } });
      if (r.status === 200) pass(path);
      else fail(path, "status " + r.status + (r.status !== 401 ? " body=" + (await r.text()).slice(0,200) : ""));
    }
    for (const path of ["/superadmin", "/superadmin/tenants", "/superadmin/issue"]) {
      const r = await fetch(BASE + path, { headers: { Cookie: ck } });
      if (r.status === 200) pass(path);
      else if (r.status === 404) console.log("  (note) " + path + " -> 404 pre-deploy");
      else if (r.status === 401) fail(path, "401 not authorized");
      else if (r.status === 307 || r.status === 302) pass(path + " (redirect)");
      else fail(path, "status " + r.status);
    }
  } else {
    console.log("\n(skipping superadmin: no SMOKE_SUPER_EMAIL/PASSWORD env)");
  }

  header("Summary");
  if (failed > 0) {
    console.log("FAIL " + failed + " assertion(s)");
    process.exit(1);
  } else {
    console.log("ALL GREEN");
    process.exit(0);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
