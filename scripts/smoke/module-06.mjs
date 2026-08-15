// Module 6 smoke: BOQ engine with live material costs (Supabase runtime).
// Requires the tenant to be on a plan with boq_version_limit >= 2
// (run-all puts tenant 1 on starter before this module).
import { q, qOne, qRun, ensureTenant2 } from "../smoke/db.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = "admin@etihadinteriors.com";
const ADMIN_PASSWORD = "admin123";

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ok ${pass}: ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`FAIL ${name} ${extra}`);
  }
}

function parseSetCookies(res) {
  const setCookie = res.headers.get("set-cookie") || "";
  const out = {};
  if (!setCookie) return out;
  for (const c of setCookie.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return out;
}
const cookieHeader = (jar) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const jar = parseSetCookies(csrfRes);
  const body = new URLSearchParams({
    csrfToken: csrfData.csrfToken,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    callbackUrl: `${BASE}/admin`,
    json: "true",
  });
  const r = await fetch(`${BASE}/api/auth/callback/credentials?json=true`, {
    method: "POST",
    redirect: "manual",
    headers: { Cookie: cookieHeader(jar), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const added = parseSetCookies(r);
  for (const [k, v] of Object.entries(added)) jar[k] = v;
  return cookieHeader(jar);
}
const auth = await login();
if (!auth) {
  console.log("login failed - aborting");
  process.exit(1);
}

const api = async (method, path, { body, cookie = auth } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
};

// ---- anon gates ----------------------------------------------------
for (const [m, p, b] of [
  ["GET", "/api/boq?client_project_id=x", undefined],
  ["POST", "/api/boq/generate-draft", { client_project_id: "x" }],
  ["GET", "/api/boq/nope", undefined],
  ["PATCH", "/api/boq/nope", { status: "sent" }],
  ["POST", "/api/boq/nope/items", { item_name: "x" }],
  ["POST", "/api/boq/nope/recalculate", undefined],
  ["GET", "/api/boq/nope/export?format=json", undefined],
  ["PATCH", "/api/boq-items/nope", { qty: 2 }],
  ["DELETE", "/api/boq-items/nope", undefined],
]) {
  const r = await api(m, p, { body: b, cookie: "" });
  check(`anon ${m} ${p.split("?")[0]} -> 401`, r.status === 401);
}

// ---- setup ---------------------------------------------------------
const proj = await api("POST", "/api/client-projects", { body: { name: "BOQ smoke project" } });
check("create client project", proj.status >= 200 && proj.status < 300, JSON.stringify(proj.json));
const projectId = proj.json?.project?.id;

const wood = await api("POST", "/api/materials", {
  body: { name: "Teak plywood", category: "wood", cost_per_unit: 100, unit: "sqft" },
});
const paint = await api("POST", "/api/materials", {
  body: { name: "Emulsion paint", category: "paint", cost_per_unit: 50, unit: "sqft" },
});
const woodId = wood.json?.material?.id;
const paintId = paint.json?.material?.id;

// ---- generate draft -------------------------------------------------
let r = await api("POST", "/api/boq/generate-draft", { body: {} });
check("generate without project -> 400", r.status === 400);
r = await api("POST", "/api/boq/generate-draft", { body: { client_project_id: projectId, template_name: "bogus" } });
check("invalid template -> 400", r.status === 400);
r = await api("POST", "/api/boq/generate-draft", { body: { client_project_id: "nope" } });
check("generate bad project -> 404", r.status === 404);

r = await api("POST", "/api/boq/generate-draft", { body: { client_project_id: projectId, template_name: "2bhk" } });
check("generate 2bhk draft -> 201", r.status === 201, JSON.stringify(r.json).slice(0, 200));
const v1 = r.json?.version;
check("version 1 default shape", v1 && v1.versionNo === 1 && v1.title === "BOQ v1" && v1.status === "draft");
check("9 template items", v1?.items?.length === 9, `got ${v1?.items?.length}`);
const versionId = v1.id;

// Live material linking: kitchen (carpentry -> wood) + painting -> paint.
const kitchen = v1.items.find((i) => i.itemName.includes("kitchen"));
const paintingItem = v1.items.find((i) => i.itemName.includes("painting"));
check("kitchen linked to wood material with live rate", kitchen?.linkedMaterialId === woodId && kitchen?.materialRate === 100, JSON.stringify({ m: kitchen?.materialRate, id: kitchen?.linkedMaterialId }));
check("painting linked to paint material", paintingItem?.linkedMaterialId === paintId && paintingItem?.materialRate === 50);

// Amount formula check: qty*(mat+labour)*(1+wastage/100)*(1+gst/100)
const calc = (q, m, l) => Math.round(q * (m + l) * 1.05 * 1.18 * 100) / 100;
check("item amount formula", kitchen && Math.abs(kitchen.amount - calc(12, 100, 400)) < 0.01, `amount ${kitchen?.amount} expected ${calc(12, 100, 400)}`);

const sumItems = v1.items.reduce((s, i) => s + i.amount, 0);
check("version total = SUM(amount)", Math.abs(v1.total - Math.round(sumItems * 100) / 100) < 0.01, `total ${v1.total} sum ${sumItems}`);

// ---- list + detail --------------------------------------------------
r = await api("GET", `/api/boq?client_project_id=${projectId}`);
check("list has 1 version + items_count", r.json?.versions?.length === 1 && r.json?.versions?.[0]?.itemsCount === 9);

r = await api("GET", `/api/boq/${versionId}`);
check("detail returns items with material join", r.json?.version?.items?.length === 9 && r.json?.version?.items?.[0]?.material !== undefined);
check("detail total matches", Math.abs(r.json?.version?.total - v1.total) < 0.01);

// ---- add item + totals ----------------------------------------------
const beforeAdd = v1.total;
r = await api("POST", `/api/boq/${versionId}/items`, {
  body: { category: "plumbing", item_name: "Bath fittings", unit: "set", qty: 2, material_rate: 5000, labour_rate: 1500, wastage_pct: 5, gst_pct: 18 },
});
check("add item -> 201 + amount", r.status === 201 && Math.abs(r.json?.item?.amount - calc(2, 5000, 1500)) < 0.01, JSON.stringify(r.json));
const itemId = r.json?.item?.id;
const newTotal = Math.round((beforeAdd + calc(2, 5000, 1500)) * 100) / 100;

r = await api("GET", `/api/boq/${versionId}`);
check("version total updated after add", Math.abs(r.json?.version?.total - newTotal) < 0.01, `total ${r.json?.version?.total} expected ${newTotal}`);

// ---- patch item recalcs --------------------------------------------
r = await api("PATCH", `/api/boq-items/${itemId}`, { body: { qty: 4 } });
check("patch qty recalcs amount", Math.abs(r.json?.item?.amount - calc(4, 5000, 1500)) < 0.01);
const totalAfterQty = Math.round((beforeAdd + calc(4, 5000, 1500)) * 100) / 100;
r = await api("GET", `/api/boq/${versionId}`);
check("version total recalced after qty patch", Math.abs(r.json?.version?.total - totalAfterQty) < 0.01);

r = await api("PATCH", `/api/boq-items/${itemId}`, { body: { category: "bogus" } });
check("patch invalid category -> 400", r.status === 400);
r = await api("PATCH", `/api/boq-items/${itemId}`, { body: { qty: "abc" } });
check("patch invalid qty -> 400", r.status === 400);
r = await api("PATCH", `/api/boq-items/nope`, { body: { qty: 2 } });
check("patch missing item -> 404", r.status === 404);

// ---- delete item recalcs -------------------------------------------
r = await api("DELETE", `/api/boq-items/${itemId}`);
check("delete item -> ok", r.status === 200 && r.json?.ok === true);
r = await api("GET", `/api/boq/${versionId}`);
check("version total after delete", Math.abs(r.json?.version?.total - beforeAdd) < 0.01, `total ${r.json?.version?.total} expected ${beforeAdd}`);

// ---- second version -------------------------------------------------
r = await api("POST", "/api/boq/generate-draft", { body: { client_project_id: projectId, template_name: "2bhk" } });
check("second draft version_no 2", r.json?.version?.versionNo === 2 && r.json?.version?.title === "BOQ v2");
const v2 = r.json?.version;

r = await api("PATCH", `/api/boq/${v2.id}`, { body: { status: "approved" } });
check("mark v2 approved", r.json?.version?.status === "approved");
r = await api("PATCH", `/api/boq/${v2.id}`, { body: { status: "bogus" } });
check("patch invalid version status -> 400", r.status === 400);
r = await api("PATCH", `/api/boq/${v2.id}`, { body: {} });
check("patch nothing -> 400", r.status === 400);

r = await api("GET", `/api/boq?client_project_id=${projectId}`);
check("list shows 2 versions, newest first", r.json?.versions?.length === 2 && r.json?.versions?.[0]?.versionNo === 2);

// ---- recalculate pulls live material cost ---------------------------
await api("PATCH", `/api/materials/${woodId}`, { body: { cost_per_unit: 250 } });
r = await api("POST", `/api/boq/${versionId}/recalculate`);
const recalcKitchen = r.json?.version?.items?.find((i) => i.itemName.includes("kitchen"));
check("recalculate refreshes linked material rate", recalcKitchen?.materialRate === 250, `rate ${recalcKitchen?.materialRate}`);
const recalcTotal = r.json?.version?.items?.reduce((s, i) => s + i.amount, 0);
check("recalculate recomputes total", Math.abs(r.json?.version?.total - Math.round(recalcTotal * 100) / 100) < 0.01);

// ---- export ---------------------------------------------------------
r = await api("GET", `/api/boq/${versionId}/export?format=json`);
check("export json -> 200 with items", r.status === 200 && Array.isArray(r.json?.items));
const csvRes = await fetch(`${BASE}/api/boq/${versionId}/export?format=csv`, { headers: { Cookie: auth } });
const csvText = await csvRes.text();
check("export csv -> text/csv with TOTAL", csvRes.status === 200 && csvRes.headers.get("content-type")?.includes("text/csv") && csvText.includes("TOTAL"));

// ---- cross-tenant 403 -----------------------------------------------
await ensureTenant2();
await q(
  `INSERT INTO client_projects (id, tenant_id, name) VALUES ($1, 2, $2) ON CONFLICT (id) DO NOTHING`,
  ["other-proj", "Other"]
);
r = await api("POST", "/api/boq/generate-draft", { body: { client_project_id: "other-proj" } });
check("generate for other tenant -> 403", r.status === 403);
await q(
  `INSERT INTO boq_versions (id, tenant_id, client_project_id, version_no) VALUES ($1, 2, $2, 1) ON CONFLICT (id) DO NOTHING`,
  ["other-ver", "other-proj"]
);
r = await api("GET", "/api/boq/other-ver");
check("get other tenant version -> 403", r.status === 403);
r = await api("PATCH", "/api/boq/other-ver", { body: { title: "x" } });
check("patch other tenant version -> 403", r.status === 403);

// ---- cascade via project delete (SQL) -------------------------------
await qRun("DELETE FROM client_projects WHERE id = $1", [projectId]);
const verRow = await qOne("SELECT COUNT(*)::int AS c FROM boq_versions WHERE client_project_id = $1", [projectId]);
const itemRow = await qOne("SELECT COUNT(*)::int AS c FROM boq_items WHERE boq_version_id IN ($1, $2)", [v1.id, v2.id]);
check("project delete cascades versions + items (DB)", (verRow?.c ?? 0) === 0 && (itemRow?.c ?? 0) === 0);

// ---- cleanup ---------------------------------------------------------
await qRun("DELETE FROM boq_items WHERE boq_version_id IN (SELECT id FROM boq_versions WHERE client_project_id = $1)", ["other-proj"]);
await qRun("DELETE FROM boq_versions WHERE client_project_id = $1", ["other-proj"]);
await qRun("DELETE FROM client_projects WHERE id = $1", ["other-proj"]);
await qRun("DELETE FROM materials WHERE id IN ($1, $2)", [woodId, paintId]);
await qRun("DELETE FROM tenants WHERE id = 2");

console.log(`\nSMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("Failures:", failures.join(" | "));
  process.exit(1);
}
