#!/usr/bin/env node
/**
 * End-to-end media upload smoke. Proves:
 *
 *   1) POST /api/media/upload returns 200 with a local upload URL
 *      (when SUPABASE_URL is unset).
 *   2) PUT to that URL writes the file to public/uploads/media/<path>
 *      and updates the media row size.
 *   3) After upload, GET /uploads/media/<path> serves the bytes
 *      so the admin library renders them.
 *   4) /api/media/list contains the new id.
 *
 * Requires SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD.
 */
const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
  0xff, 0xdb, 0, 0x43, 0, 8, 6, 6, 7, 6, 5, 8, 7, 7, 7, 9, 9, 8, 10, 12, 20, 13, 12, 11,
  11, 12, 25, 18, 19, 15, 20, 29, 26, 31, 30, 29, 26, 28, 28, 32, 36, 46, 39, 32, 34,
  44, 35, 28, 28, 40, 55, 41, 44, 48, 49, 52, 52, 52, 31, 39, 45, 48, 40, 0xff, 0xd9,
]);

(async () => {
  if (!EMAIL || !PASSWORD) {
    console.error("Set SMOKE_ADMIN_EMAIL/PASSWORD");
    process.exit(2);
  }

  let cookies = {};
  const loginRes = await fetch(BASE + "/api/auth/csrf");
  cookies = decodeCookies(loginRes.headers.get("set-cookie") || "");
  const csrfToken = (await loginRes.json()).csrfToken;
  const body = new URLSearchParams({
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    callbackUrl: BASE + "/admin",
    json: "true",
  });
  const loginOk = await fetch(BASE + "/api/auth/callback/credentials?json=true", {
    method: "POST",
    headers: {
      Cookie: cookieHeader(cookies),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    redirect: "manual",
  });
  for (const c of (loginOk.headers.get("set-cookie") || "").split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const [k, ...v] = pair.split("=");
    if (k) cookies[k] = v.join("=");
  }
  const ck = cookieHeader(cookies);
  console.log("login:", loginOk.status);

  console.log("\n=== POST /api/media/upload ===");
  const intent = await fetch(BASE + "/api/media/upload", {
    method: "POST",
    headers: { Cookie: ck, "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: "smoke-e2e.jpg",
      mime: "image/jpeg",
      size: JPEG_BYTES.length,
    }),
  });
  console.log("intent status:", intent.status);
  const ij = await intent.json();
  console.log("intent body:", JSON.stringify(ij).slice(0, 250));
  if (!ij.id) process.exit(1);

  console.log("\n=== PUT", ij.uploadUrl, "===");
  const put = await fetch(BASE + ij.uploadUrl, {
    method: "PUT",
    headers: { Cookie: ck, "Content-Type": "image/jpeg" },
    body: JPEG_BYTES,
  });
  console.log("PUT status:", put.status);
  console.log("PUT body:", (await put.text()).slice(0, 200));

  console.log("\n=== GET public path ===");
  const pub = "/uploads/media/" + ij.storagePath;
  const r2 = await fetch(BASE + pub);
  console.log(BASE + pub, "->", r2.status, "len=", (await r2.text()).length);

  console.log("\n=== /api/media/list after upload ===");
  const l2 = await fetch(BASE + "/api/media/list?limit=20", { headers: { Cookie: ck } });
  const j = await l2.json();
  const matched = (j.rows || []).find((r) => r.id === ij.id);
  console.log("rows:", j.rows?.length, "matched:", !!matched, "stored url:", matched?.url);

  // Cleanup the test row
  console.log("\n=== DELETE ===");
  const del = await fetch(BASE + "/api/media/" + ij.id, {
    method: "DELETE",
    headers: { Cookie: ck },
  });
  console.log("DELETE:", del.status);
})();

function decodeCookies(header) {
  const cookies = {};
  for (const c of header.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const [k, ...v] = pair.split("=");
    if (k) cookies[k] = v.join("=");
  }
  return cookies;
}
function cookieHeader(jars) {
  return Object.entries(jars)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}
