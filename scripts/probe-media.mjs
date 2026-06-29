#!/usr/bin/env node
/**
 * Diagnostic probe for /api/media/list + /api/media/upload
 * Reads admin creds from env. Reports status codes and response
 * bodies, including any PG/storage error details the public
 * `/api/_probe.html`-style page does not show.
 */
const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

let cookies = {},
  csrfToken = "";
async function login() {
  const c = await fetch(BASE + "/api/auth/csrf");
  csrfToken = (await c.json()).csrfToken;
  const sc = c.headers.get("set-cookie") || "";
  for (const x of sc.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = x.split(";");
    const [k, ...v] = pair.split("=");
    cookies[k] = v.join("=");
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
      Cookie: cookieHeader(cookies),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    redirect: "manual",
  });
  const setCookie = r.headers.get("set-cookie") || "";
  for (const x of setCookie.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = x.split(";");
    const [k, ...v] = pair.split("=");
    if (k) cookies[k] = v.join("=");
  }
  return r.status;
}
function cookieHeader(jars) {
  return Object.entries(jars)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

(async () => {
  if (!EMAIL || !PASSWORD) {
    console.error("Set SMOKE_ADMIN_EMAIL/PASSWORD");
    process.exit(2);
  }
  const status = await login();
  console.log("login status:", status);
  console.log("Cookies present:", Object.keys(cookies).join(", "));

  const probe = async (path, opts = {}) => {
    const r = await fetch(BASE + path, {
      headers: { Cookie: cookieHeader(cookies) },
      ...opts,
    });
    const text = await r.text();
    return { status: r.status, body: text.slice(0, 500) };
  };

  console.log("\n=== /api/media/list ===");
  const list = await probe("/api/media/list?limit=10");
  console.log("status:", list.status);
  console.log("body:", list.body);

  console.log("\n=== /api/media/upload (intent) ===");
  const up = await probe("/api/media/upload", {
    method: "POST",
    headers: {
      Cookie: cookieHeader(cookies),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: "probe.jpg",
      mime: "image/jpeg",
      size: 1234,
    }),
  });
  console.log("status:", up.status);
  console.log("body:", up.body);
})().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
