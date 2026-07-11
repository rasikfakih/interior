#!/usr/bin/env node
/**
 * Final router smoke. Hits every public + admin + operator route
 * plus the contact/newsletter write APIs that an actual visitor
 * would touch. Reads admin creds from env. Returns 0 on green.
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
function decodeCookieJar(header) {
  const cookies = {};
  for (const c of header.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const [k, ...v] = pair.split("=");
    if (k) cookies[k] = v.join("=");
  }
  return cookies;
}
function jarToString(jars) {
  return Object.entries(jars)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function adminLogin() {
  const csrf = await fetch(BASE + "/api/auth/csrf");
  const cookies = decodeCookieJar(csrf.headers.get("set-cookie") || "");
  const csrfToken = (await csrf.json()).csrfToken;
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
      Cookie: jarToString(cookies),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    redirect: "manual",
  });
  Object.assign(
    cookies,
    decodeCookieJar(r.headers.get("set-cookie") || "")
  );
  return cookies;
}

(async () => {
  head("Public routes");
  for (const u of [
    "/",
    "/projects",
    "/projects/casa-mira",
    "/projects/nalanda-house",
    "/projects/salt-flats",
    "/projects-v2",
    "/projects-v2/casa-mira",
    "/projects-v2/nalanda-house",
    "/projects-v2/salt-flats",
    "/journal",
    "/journal/material-honesty",
    "/journal/why-the-kitchen-table",
    "/journal/spatial-design-vs-interior",
    "/about",
    "/contact",
    "/voices",
  ]) {
    const r = await fetch(BASE + u);
    r.status === 200 ? ok(u) : bad(u, r.status);
  }

  head("Public write APIs");
  const cf = await fetch(BASE + "/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Smoke",
      email: "smoke@t.local",
      message: "hello",
      subject: "theme",
    }),
  });
  cf.status === 200 ? ok("/api/contact") : bad("/api/contact", cf.status);
  const ts = Date.now();
  const nl = await fetch(BASE + "/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `smoke_${ts}@t.local` }),
  });
  nl.status === 200 ? ok("/api/newsletter") : bad("/api/newsletter", nl.status);

  head("Public read APIs");
  for (const u of [
    "/api/projects",
    "/api/journal",
    "/api/testimonials",
    "/api/team",
    "/api/pages",
    "/api/settings",
    "/api/health/db",
    "/api/sitemap",
  ]) {
    const r = await fetch(BASE + u);
    r.status === 200 ? ok(u) : bad(u, r.status);
  }

  head("Admin surface (logged in as studio@)");
  const adminJar = await adminLogin();
  const ck = jarToString(adminJar);
  for (const u of [
    "/admin",
    "/admin/pages",
    "/admin/projects",
    "/admin/journal",
    "/admin/testimonials",
    "/admin/team",
    "/admin/media",
  ]) {
    const r = await fetch(BASE + u, { headers: { Cookie: ck } });
    r.status === 200 ? ok(u) : bad(u, r.status);
  }

  head("Operator surface (env-auth as operator@)");
  const op = await fetch(BASE + "/api/operator/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "operator@etihadinteriors.com",
      password: "vsnx3ItSHmqvxAhuXeyOBJZ0",
    }),
  });
  op.status === 200 ? ok("/api/operator/login") : bad("/api/operator/login", op.status);
  const opCookie = (op.headers.get("set-cookie") || "").split(";")[0];
  for (const u of [
    "/api/operator/tenants",
    "/api/operator/metrics",
  ]) {
    const r = await fetch(BASE + u, { headers: { Cookie: opCookie } });
    r.status === 200 ? ok(u) : bad(u, r.status);
  }
  for (const u of [
    "/superadmin",
    "/superadmin/tenants",
    "/superadmin/issue",
    "/superadmin/metrics",
  ]) {
    const r = await fetch(BASE + u, { headers: { Cookie: opCookie } });
    r.status === 200 ? ok(u) : bad(u, r.status);
  }

  head("Summary");
  console.log(`pass=${pass} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
