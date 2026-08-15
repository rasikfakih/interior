// Module 5 smoke: boards + board_items canvas (Supabase runtime).
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

async function api(method, path, { body, cookie } = {}) {
  const headers = {};
  if (cookie) headers["Cookie"] = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
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
}

// ---- auth (CSRF flow, matching the module 3 smoke) -----------------
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
const cookieHeader = (jar) =>
  Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

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
    headers: {
      Cookie: cookieHeader(jar),
      "Content-Type": "application/x-www-form-urlencoded",
    },
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

// ---- setup: material + project -------------------------------------
const matRes = await api("POST", "/api/materials", {
  body: { name: "Smoke marble", category: "stone", cost_per_unit: 1850, unit: "sqft" },
  cookie: auth,
});
check("create material", matRes.status >= 200 && matRes.status < 300, String(matRes.status));
const materialId = matRes.json?.material?.id;

const projRes = await api("POST", "/api/client-projects", {
  body: { name: "Smoke board project", client_name: "Smoke Client" },
  cookie: auth,
});
check("create client project", projRes.status >= 200 && projRes.status < 300, JSON.stringify(projRes.json));
const projectId = projRes.json?.project?.id;

// ---- auth gates ----------------------------------------------------
const gates = [
  ["GET", "/api/boards?client_project_id=x", undefined],
  ["POST", "/api/boards", { client_project_id: "x" }],
  ["POST", "/api/board-items", { board_id: "x", material_id: "x" }],
];
for (const [m, p, b] of gates) {
  const r = await api(m, p, { body: b });
  check(`anon ${m} ${p} -> 401`, r.status === 401);
}

// ---- create board --------------------------------------------------
let r = await api("POST", "/api/boards", { cookie: auth });
check("POST /api/boards missing project -> 400", r.status === 400);

r = await api("POST", "/api/boards", { body: { client_project_id: "nope" }, cookie: auth });
check("POST /api/boards bad project -> 404", r.status === 404);

r = await api("POST", "/api/boards", { body: { client_project_id: projectId }, cookie: auth });
check("POST /api/boards -> 201", r.status === 201, JSON.stringify(r.json));
const board = r.json?.board;
check("board DTO camelCase + default title", board && board.id && board.title === "Moodboard" && board.clientProjectId === projectId);
check(
  "board default canvas",
  board && board.canvas && board.canvas.zoom === 1 && board.canvas.width === 2000 && board.canvas.height === 1500
);
const boardId = board.id;

// ---- list ----------------------------------------------------------
r = await api("GET", `/api/boards?client_project_id=${projectId}`, { cookie: auth });
check("GET boards list -> 200 with 1 board", r.status === 200 && r.json?.boards?.length === 1);
check("list itemsCount = 0", r.json?.boards?.[0]?.itemsCount === 0);

// ---- save (upsert) -------------------------------------------------
r = await api("POST", `/api/boards/${boardId}/save`, {
  body: {
    canvas_json: { zoom: 1.25, pan: { x: 40, y: -20 }, width: 2000, height: 1500 },
    items: [
      { material_id: materialId, x: 100, y: 120, w: 220, h: 180, rotation: 15, z_index: 1, meta_json: { note: "foyer", scale: 1 } },
      { material_id: materialId, x: 400, y: 300, w: 200, h: 200, z_index: 2 },
    ],
  },
  cookie: auth,
});
check("save creates 2 items", r.status === 200 && r.json?.board?.items?.length === 2, JSON.stringify(r.json));
const firstId = r.json?.board?.items?.find((i) => i.x === 100)?.id;
check("item has material join", r.json?.board?.items?.[0]?.material?.name === "Smoke marble");
check("item meta note persisted", r.json?.board?.items?.[0]?.note === "foyer");

// upsert: move first item, keep id
r = await api("POST", `/api/boards/${boardId}/save`, {
  body: {
    items: [
      { id: firstId, material_id: materialId, x: 999, y: 100, w: 220, h: 180, rotation: 15, z_index: 1 },
      { material_id: materialId, x: 400, y: 300, w: 200, h: 200, z_index: 2 },
    ],
  },
  cookie: auth,
});
check("save upserts by id (x updated)", r.json?.board?.items?.find((i) => i.id === firstId)?.x === 999);
check("save keeps both items", r.json?.board?.items?.length === 2);

// full replace deletes missing items
r = await api("POST", `/api/boards/${boardId}/save`, {
  body: { items: [{ id: firstId, material_id: materialId, x: 999, y: 100, w: 220, h: 180, z_index: 1 }] },
  cookie: auth,
});
check("full-replace deletes missing item", r.json?.board?.items?.length === 1);
check("canvas zoom persisted", r.json?.board?.canvas?.zoom === 1.25);

// ---- single item routes --------------------------------------------
r = await api("POST", "/api/board-items", {
  body: { board_id: boardId, material_id: materialId, x: 50, y: 60, w: 150, h: 150 },
  cookie: auth,
});
check("POST board-item -> 201 + join", r.status === 201 && r.json?.item?.material?.id === materialId);
const itemId = r.json?.item?.id;

r = await api("POST", "/api/board-items", { body: { board_id: "nope", material_id: materialId }, cookie: auth });
check("POST board-item bad board -> 404", r.status === 404);
r = await api("POST", "/api/board-items", { body: { board_id: boardId, material_id: "nope" }, cookie: auth });
check("POST board-item bad material -> 404", r.status === 404);

r = await api("PATCH", `/api/board-items/${itemId}`, { body: { x: 111, y: 222, w: 333, h: 444, rotation: 45, z_index: 9 }, cookie: auth });
check("PATCH board-item geometry", r.status === 200 && r.json?.item?.x === 111 && r.json?.item?.zIndex === 9 && r.json?.item?.rotation === 45);
r = await api("PATCH", `/api/board-items/${itemId}`, { body: { x: "abc" }, cookie: auth });
check("PATCH invalid x -> 400", r.status === 400);
r = await api("PATCH", `/api/board-items/nope`, { body: { x: 1 }, cookie: auth });
check("PATCH missing item -> 404", r.status === 404);

r = await api("DELETE", `/api/board-items/${itemId}`, { cookie: auth });
check("DELETE board-item -> ok", r.status === 200 && r.json?.ok === true);

// ---- board detail / patch / delete ---------------------------------
r = await api("GET", `/api/boards/${boardId}`, { cookie: auth });
check("GET board detail -> 200 + items", r.status === 200 && Array.isArray(r.json?.board?.items));

r = await api("PATCH", `/api/boards/${boardId}`, { body: { title: "Kitchen palette" }, cookie: auth });
check("PATCH title", r.status === 200 && r.json?.board?.title === "Kitchen palette");
r = await api("PATCH", `/api/boards/${boardId}`, { body: { status: "approved" }, cookie: auth });
check("PATCH status approved", r.status === 200 && r.json?.board?.status === "approved");
r = await api("PATCH", `/api/boards/${boardId}`, { body: { status: "bogus" }, cookie: auth });
check("PATCH invalid status -> 400", r.status === 400);
r = await api("PATCH", `/api/boards/${boardId}`, { body: {}, cookie: auth });
check("PATCH nothing -> 400", r.status === 400);

// wrong-tenant 403: fake a second tenant + project via SQL
await ensureTenant2();
await q(
  `INSERT INTO client_projects (id, tenant_id, name) VALUES ($1, 2, $2) ON CONFLICT (id) DO NOTHING`,
  ["other-project", "Other project"]
);
await q(
  `INSERT INTO boards (id, tenant_id, client_project_id, title) VALUES ($1, 2, $2, $3) ON CONFLICT (id) DO NOTHING`,
  ["other-board", "other-project", "Other board"]
);
r = await api("GET", "/api/boards/other-board", { cookie: auth });
check("other tenant board -> 403", r.status === 403);
r = await api("PATCH", "/api/boards/other-board", { body: { title: "x" }, cookie: auth });
check("other tenant PATCH -> 403", r.status === 403);
r = await api("DELETE", "/api/boards/other-board", { cookie: auth });
check("other tenant DELETE -> 403", r.status === 403);

// cascade delete
r = await api("DELETE", `/api/boards/${boardId}`, { cookie: auth });
check("DELETE board -> ok", r.status === 200 && r.json?.ok === true);
const orphanRow = await qOne(
  "SELECT COUNT(*)::int AS c FROM board_items WHERE board_id = $1",
  [boardId]
);
check("board delete cascades items (DB)", (orphanRow?.c ?? 0) === 0);
r = await api("GET", `/api/boards/${boardId}`, { cookie: auth });
check("GET deleted board -> 404", r.status === 404);
r = await api("POST", `/api/boards/${boardId}/save`, { body: { items: [] }, cookie: auth });
check("save on deleted board -> 404", r.status === 404);

// ---- cleanup -------------------------------------------------------
await qRun("DELETE FROM board_items WHERE board_id = $1", ["other-board"]);
await qRun("DELETE FROM boards WHERE id = $1", ["other-board"]);
await qRun("DELETE FROM client_projects WHERE id = $1", ["other-project"]);
await qRun("DELETE FROM materials WHERE id = $1", [materialId]);
await qRun("DELETE FROM client_projects WHERE id = $1", [projectId]);
await qRun("DELETE FROM tenants WHERE id = 2");

console.log(`\nSMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("Failures:", failures.join(" | "));
  process.exit(1);
}
