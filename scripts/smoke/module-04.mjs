// Module 4 smoke: material + vendor library (Supabase runtime).
import { qRun } from "../smoke/db.mjs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = "admin@etihadinteriors.com";
const ADMIN_PASSWORD = "admin123";

let failures = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) {
    console.log(`ok - ${label}`);
  } else {
    failures++;
    console.error(`FAIL - ${label}${extra !== undefined ? ` (${extra})` : ""}`);
  }
}

async function fetchRaw(method, path, opts = {}) {
  const headers = {};
  if (opts.json) headers["Content-Type"] = "application/json";
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  const init = { method, headers, redirect: "manual" };
  if (opts.body !== undefined) init.body = opts.body;
  return fetch(`${BASE_URL}${path}`, init);
}

function parseSetCookies(res) {
  const setCookie = res.headers.get("set-cookie") || "";
  const out = {};
  for (const c of setCookie.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return out;
}
const cookieHeader = (jar) =>
  Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

async function loginAdmin() {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const jar = parseSetCookies(csrfRes);
  const r = await fetch(`${BASE_URL}/api/auth/callback/credentials?json=true`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Cookie: cookieHeader(jar),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      callbackUrl: BASE_URL + "/admin",
      json: "true",
    }),
  });
  const added = parseSetCookies(r);
  for (const [k, v] of Object.entries(added)) jar[k] = v;
  return jar;
}

async function main() {
  // 1. Anon 401 gates.
  for (const [method, path, body] of [
    ["GET", "/api/vendors", undefined],
    ["POST", "/api/vendors", {}],
    ["PATCH", "/api/vendors/x", { name: "n" }],
    ["DELETE", "/api/vendors/x", undefined],
    ["GET", "/api/materials", undefined],
    ["POST", "/api/materials", {}],
    ["PATCH", "/api/materials/x", { name: "n" }],
    ["DELETE", "/api/materials/x", undefined],
    ["POST", "/api/materials/upload", undefined],
  ]) {
    const r = await fetchRaw(method, path, { json: body !== undefined && method !== "DELETE", body: body !== undefined ? JSON.stringify(body) : undefined });
    check(`anon ${method} ${path} -> 401`, r.status === 401, `got ${r.status}`);
  }

  const jar = await loginAdmin();
  const auth = (method, path, body, rawBody) =>
    fetchRaw(method, path, {
      cookie: cookieHeader(jar),
      json: rawBody === undefined,
      body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
    });
  const authJson = async (method, path, body) => {
    const r = await auth(method, path, body);
    const j = await r.json().catch(() => ({}));
    return { r, j };
  };

  // 2. Create vendors.
  const v1 = await authJson("POST", "/api/vendors", {
    name: "Kalyan Granites",
    category: "stone",
    phone: "+91 98111 11111",
    email: "sales@kalyangranites.in",
    address: "MIDC, Kalyan",
    lead_time_days: 14,
    rating: 4,
    notes: "Reliable slabs",
  });
  check("create vendor 1", v1.r.status === 200 && v1.j.vendor?.id, `got ${v1.r.status} ${JSON.stringify(v1.j)}`);
  check("vendor camelCase DTO", v1.j.vendor?.leadTimeDays === 14 && v1.j.vendor?.rating === 4, JSON.stringify(v1.j.vendor));
  const v1id = v1.j.vendor.id;

  const v2 = await authJson("POST", "/api/vendors", {
    name: "Teak House",
    category: "wood",
    phone: "+91 98222 22222",
  });
  check("create vendor 2", v2.r.status === 200 && v2.j.vendor?.id, `got ${v2.r.status}`);
  const v2id = v2.j.vendor.id;

  // 3. Vendor list + filters + materials count.
  const all = await authJson("GET", "/api/vendors");
  check("vendor list", all.j.vendors?.length >= 2, all.j.vendors?.length);
  check("vendor materials count 0", all.j.vendors.every((v) => v.materialsCount === 0));
  const search = await authJson("GET", "/api/vendors?search=Granite");
  check("vendor search name", search.j.vendors?.length === 1 && search.j.vendors[0].name === "Kalyan Granites");
  const searchPhone = await authJson("GET", "/api/vendors?search=98222");
  check("vendor search phone", searchPhone.j.vendors?.length === 1 && searchPhone.j.vendors[0].name === "Teak House");
  const catFilter = await authJson("GET", "/api/vendors?category=stone");
  check("vendor category filter", catFilter.j.vendors?.length === 1 && catFilter.j.vendors[0].category === "stone");

  // 4. Create materials.
  const m1 = await authJson("POST", "/api/materials", {
    name: "Calacatta marble",
    category: "stone",
    vendor_id: v1id,
    sku: "MC-001",
    cost_per_unit: 1850,
    unit: "sqft",
    stock_status: "in_stock",
    specs_json: { finish: "honed", thickness: "18mm", color: "white" },
    gallery_urls: ["/demo/kitchen-1.jpg"],
  });
  check("create material 1", m1.r.status === 200 && m1.j.material?.id, `got ${m1.r.status} ${JSON.stringify(m1.j)}`);
  const m1id = m1.j.material.id;
  check("material camelCase + vendorName", m1.j.material?.vendorName === "Kalyan Granites" && m1.j.material?.costPerUnit === 1850, JSON.stringify(m1.j.material));
  check("material specs parsed", m1.j.material?.specs?.finish === "honed" && m1.j.material?.specs?.thickness === "18mm");
  check("material gallery parsed", Array.isArray(m1.j.material?.galleryUrls) && m1.j.material.galleryUrls.length === 1);

  const m2 = await authJson("POST", "/api/materials", {
    name: "Teak decking",
    category: "wood",
    vendor_id: v2id,
    sku: "TW-100",
    cost_per_unit: 620,
    unit: "rft",
    stock_status: "low",
  });
  check("create material 2", m2.r.status === 200 && m2.j.material?.id, m2.r.status);
  const m2id = m2.j.material.id;

  const m3 = await authJson("POST", "/api/materials", {
    name: "Brass handles",
    category: "hardware",
    sku: "HW-5",
    cost_per_unit: 240,
    unit: "nos",
    stock_status: "out_of_stock",
  });
  check("create material no vendor", m3.r.status === 200 && m3.j.material?.vendorId === null, m3.r.status);

  // Vendor linked to wrong tenant -> 400 (nonexistent vendor id).
  const badVendor = await authJson("POST", "/api/materials", {
    name: "Ghost",
    vendor_id: "00000000-0000-0000-0000-000000000000",
  });
  check("material bad vendor 400", badVendor.r.status === 400, badVendor.r.status);

  // 5. Material list + filters + search.
  const list = await authJson("GET", "/api/materials");
  check("material list 3", list.j.materials?.length === 3, list.j.materials?.length);
  const searchName = await authJson("GET", "/api/materials?search=calacatta");
  check("material search name", searchName.j.materials?.length === 1 && searchName.j.materials[0].name === "Calacatta marble");
  const searchSku = await authJson("GET", "/api/materials?search=HW-5");
  check("material search sku", searchSku.j.materials?.length === 1 && searchSku.j.materials[0].sku === "HW-5");
  const catM = await authJson("GET", "/api/materials?category=wood");
  check("material category filter", catM.j.materials?.length === 1 && catM.j.materials[0].vendorName === "Teak House");
  const venM = await authJson("GET", `/api/materials?vendor_id=${v1id}`);
  check("material vendor filter", venM.j.materials?.length === 1 && venM.j.materials[0].name === "Calacatta marble");
  const stockM = await authJson("GET", "/api/materials?stock_status=out_of_stock");
  check("material stock filter", stockM.j.materials?.length === 1 && stockM.j.materials[0].name === "Brass handles");

  // 6. PATCH material cost + vendor change.
  const patched = await authJson("PATCH", `/api/materials/${m1id}`, { cost_per_unit: 1990, stock_status: "low" });
  check("patch material cost", patched.r.status === 200 && patched.j.material?.costPerUnit === 1990, JSON.stringify(patched.j));
  const listAfter = await authJson("GET", "/api/materials?search=marble");
  check("patch persisted in list", listAfter.j.materials[0].costPerUnit === 1990);

  // 7. PATCH vendor + invalid values.
  const patchedV = await authJson("PATCH", `/api/vendors/${v1id}`, { rating: 5, lead_time_days: 21 });
  check("patch vendor", patchedV.r.status === 200 && patchedV.j.vendor?.rating === 5 && patchedV.j.vendor?.leadTimeDays === 21);
  const badCat = await authJson("PATCH", `/api/materials/${m1id}`, { category: "nope" });
  check("patch invalid category 400", badCat.r.status === 400, badCat.r.status);
  const badUnit = await authJson("PATCH", `/api/materials/${m1id}`, { unit: "acre" });
  check("patch invalid unit 400", badUnit.r.status === 400, badUnit.r.status);

  // 8. Upload: multipart jpg -> image_url; bad mime -> 400.
  const tinyJpg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0xff, 0xd9,
  ]);
  const fd = new FormData();
  fd.append("file", new Blob([tinyJpg], { type: "image/jpeg" }), "swatch.jpg");
  const up = await fetchRaw("POST", "/api/materials/upload", { cookie: cookieHeader(jar), body: fd });
  const upJ = await up.json().catch(() => ({}));
  check("upload jpg 200", up.status === 200 && upJ.image_url, `${up.status} ${JSON.stringify(upJ)}`);
  check("upload path materials/{tenant}", /materials\/\d+\//.test(upJ.storagePath ?? ""), upJ.storagePath);

  const fdBad = new FormData();
  fdBad.append("file", new Blob(["hello"], { type: "text/plain" }), "notes.txt");
  const upBad = await fetchRaw("POST", "/api/materials/upload", { cookie: cookieHeader(jar), body: fdBad });
  check("upload bad mime 400", upBad.status === 400, upBad.status);

  // 9. DELETE material.
  const delM = await authJson("DELETE", `/api/materials/${m2id}`);
  check("delete material", delM.r.status === 200 && delM.j.success === true, delM.r.status);
  const gone = await authJson("GET", "/api/materials?search=decking");
  check("material gone", gone.j.materials?.length === 0, gone.j.materials?.length);

  // 10. DELETE vendor with materials -> vendor_id set null. Delete the
  // stone vendor (owns the marble) and verify the marble detaches.
  const delV = await authJson("DELETE", `/api/vendors/${v1id}`);
  check("delete vendor", delV.r.status === 200 && delV.j.success === true, delV.r.status);
  const v1gone = await authJson("GET", "/api/vendors?search=Granite");
  check("vendor gone", v1gone.j.vendors?.length === 0);
  const m1After = await authJson("GET", `/api/materials?search=marble`);
  check("material vendor_id null after vendor delete", m1After.j.materials[0]?.vendorId === null && m1After.j.materials[0]?.vendorName === null, JSON.stringify(m1After.j.materials[0]));

  // 11. Cross-module sanity: leads + client-projects still serve.
  const leads = await authJson("GET", "/api/leads?limit=1");
  check("leads API still works", leads.r.status === 200 && Array.isArray(leads.j.leads), leads.r.status);
  const projects = await authJson("GET", "/api/client-projects");
  check("client-projects API still works", projects.r.status === 200 && Array.isArray(projects.j.projects), projects.r.status);

  // 12. Cleanup: remaining vendor + materials.
  await qRun("DELETE FROM materials WHERE id IN ($1, $2)", [m1id, m3.j.material.id]);
  await qRun("DELETE FROM vendors WHERE id = $1", [v2id]);
  await qRun(
    "DELETE FROM materials WHERE image_url LIKE '/api/uploads/local%' OR image_url LIKE '%/materials/%'"
  );
  console.log("cleanup done");

  console.log(`checks: ${checks}, failures: ${failures}`);
  console.log(failures === 0 ? "ALL MODULE 4 SMOKE CHECKS PASS" : `${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
