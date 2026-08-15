// Module 8 smoke: client portal both domains + approvals/comments (Supabase runtime).
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
check("admin login", true);

const api = async (method, path, { body, cookie = auth } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
};

// ---- anon gating on admin portal routes ------------------------------
let r = await fetch(`${BASE}/api/client-projects`);
check("anon GET /api/client-projects -> 401", r.status === 401);
r = await fetch(`${BASE}/api/client-projects/abc/portal/generate`, { method: "POST" });
check("anon POST portal/generate -> 401", r.status === 401);
r = await fetch(`${BASE}/api/client-projects/abc/portal/comments`);
check("anon GET portal/comments -> 401", r.status === 401);
r = await fetch(`${BASE}/api/client-projects/abc/portal`);
check("anon GET portal config -> 401", r.status === 401);

// ---- create project + portal token ------------------------------------
r = await api("POST", "/api/client-projects", {
  body: { name: "Portal smoke home", client_name: "Rhea D" },
});
check("create client_project -> 200", r.status === 200 && r.json?.project?.id);
const projectId = r.json?.project?.id;

r = await api("POST", `/api/client-projects/${projectId}/portal/generate`);
check("generate portal token -> 200", r.status === 200 && Boolean(r.json?.token));
const token = r.json?.token;
check("token 10 chars alnum", /^[A-Za-z0-9]{10}$/.test(token ?? ""));
check("urls.default has /portal/", String(r.json?.urls?.default ?? "").includes(`/portal/${token}`));
const firstToken = token;

r = await api("GET", `/api/client-projects/${projectId}/portal`);
check("admin portal config returns token", r.status === 200 && r.json?.portal?.token === token);
check("config accessCount 0", r.json?.portal?.accessCount === 0);

// ---- public portal GET (anon) -----------------------------------------
r = await api("GET", `/api/portal/${token}`, { cookie: null });
check("anon GET portal -> 200", r.status === 200 && r.json?.project?.id === projectId);
check("portal brand name present", Boolean(r.json?.brand?.name));
check("no tenant_id leaked", r.json?.tenant_id == null && r.json?.project?.tenant_id == null);
check("portal stats boards 0", r.json?.stats?.boards === 0);
check("portal stats logs 0", r.json?.stats?.logs === 0);
check("portal boards empty array", Array.isArray(r.json?.boards) && r.json?.boards.length === 0);
check("portal boqVersions empty array", Array.isArray(r.json?.boqVersions) && r.json?.boqVersions.length === 0);
check("portal comments empty array", Array.isArray(r.json?.comments) && r.json?.comments.length === 0);
check("portal access count 1 (first view)", r.json?.project?.portalAccessCount === 1);

r = await api("GET", `/api/portal/${token}`, { cookie: null });
check("second view access count 2", r.json?.project?.portalAccessCount === 2);

// ---- create board + boq, then portal reflects them --------------------
r = await api("POST", "/api/boards", { body: { client_project_id: projectId, title: "Living room" } });
check("create board -> 201", r.status === 201 && r.json?.board?.id);
const boardId = r.json?.board?.id;
r = await api("POST", "/api/boq/generate-draft", { body: { client_project_id: projectId, template_name: "2bhk" } });
check("generate BOQ draft -> 201", r.status === 201 && r.json?.version?.id);
const boqId = r.json?.version?.id;
check("draft version_no 1", r.json?.version?.versionNo === 1);
check("draft items > 0", Array.isArray(r.json?.version?.items) && r.json?.version?.items.length > 0);

r = await api("GET", `/api/portal/${token}`, { cookie: null });
check("portal now shows 1 board", r.json?.boards?.length === 1 && r.json?.boards?.[0]?.id === boardId);
check("portal now shows 1 boq version", r.json?.boqVersions?.length === 1 && r.json?.boqVersions?.[0]?.id === boqId);
check("portal stats boards 1", r.json?.stats?.boards === 1);
check("portal boq total > 0", Number(r.json?.stats?.boqTotal) > 0);

// ---- approve board -----------------------------------------------------
r = await api("POST", `/api/portal/${token}/approve`, { cookie: null, body: { type: "board", target_id: boardId, comment: "Looks great" } });
check("approve board -> 200", r.status === 200 && r.json?.ok === true);
check("approval row created", Boolean(r.json?.approval?.id) && r.json?.approval?.type === "board" && r.json?.approval?.status === "approved");
r = await api("GET", `/api/boards/${boardId}`);
check("board status approved in admin API", r.status === 200 && r.json?.board?.status === "approved");
const approvalRow = await qOne("SELECT * FROM client_portal_approvals WHERE target_id = $1", [boardId]);
check("approval row in DB (comment kept)", Boolean(approvalRow) && approvalRow.comment === "Looks great" && approvalRow.portal_token === token);

// approve missing target -> 404
r = await api("POST", `/api/portal/${token}/approve`, { cookie: null, body: { type: "board", target_id: "nope" } });
check("approve missing target -> 404", r.status === 404);
r = await api("POST", `/api/portal/${token}/approve`, { cookie: null, body: { type: "bogus", target_id: boardId } });
check("approve bogus type -> 400", r.status === 400);

// ---- comments (client -> studio reply) ---------------------------------
r = await api("POST", `/api/portal/${token}/comment`, { cookie: null, body: { message: "Can we see the kitchen in walnut?" } });
check("client comment -> 200", r.status === 200 && r.json?.comment?.author === "client");
r = await api("POST", `/api/portal/${token}/comment`, { cookie: null, body: { message: "" } });
check("empty comment -> 400", r.status === 400);
r = await api("GET", `/api/portal/${token}/comments`, { cookie: null });
check("portal lists 1 comment", r.status === 200 && r.json?.comments?.length === 1);
r = await api("GET", `/api/client-projects/${projectId}/portal/comments`);
check("admin lists 1 comment", r.status === 200 && r.json?.comments?.length === 1);
r = await api("POST", `/api/client-projects/${projectId}/portal/comments`, { body: { message: "Yes, walnut it is." } });
check("studio reply -> 200", r.status === 200 && r.json?.comment?.author === "studio");
r = await api("GET", `/api/portal/${token}/comments`, { cookie: null });
check("portal now 2 comments, both sides", r.json?.comments?.length === 2 &&
  r.json?.comments?.some((c) => c.author === "client") &&
  r.json?.comments?.some((c) => c.author === "studio"));

// ---- invalid / unknown tokens ------------------------------------------
r = await api("GET", "/api/portal/zzzzzzzzzz", { cookie: null });
check("unknown token -> 404", r.status === 404);
r = await api("GET", "/api/portal/short", { cookie: null });
check("bad token format -> 404", r.status === 404);
r = await api("POST", "/api/portal/zzzzzzzzzz/approve", { cookie: null, body: { type: "board", target_id: boardId } });
check("approve unknown token -> 404", r.status === 404);

// ---- regenerate invalidates old token ----------------------------------
r = await api("POST", `/api/client-projects/${projectId}/portal/generate`);
check("regenerate -> new token", r.status === 200 && Boolean(r.json?.token) && r.json?.token !== firstToken);
const newToken = r.json?.token;
r = await api("GET", `/api/portal/${firstToken}`, { cookie: null });
check("old token -> 404 after regenerate", r.status === 404);
r = await api("GET", `/api/portal/${newToken}`, { cookie: null });
check("new token works", r.status === 200 && r.json?.project?.portalAccessCount === 1);
r = await api("GET", `/api/client-projects/${projectId}/portal`);
check("admin config shows new token + reset count", r.json?.portal?.token === newToken && r.json?.portal?.accessCount === 1);

// ---- cross-tenant -------------------------------------------------------
await ensureTenant2();
await q(
  `INSERT INTO client_projects (id, tenant_id, name, portal_token) VALUES ($1, 2, $2, $3) ON CONFLICT (id) DO NOTHING`,
  ["other-proj", "Other", "othertoken1"]
);
r = await api("GET", `/api/portal/othertoken1`, { cookie: null });
check("other tenant token viewable (token is the permission)", r.status === 200 && r.json?.project?.name === "Other");
r = await api("GET", `/api/client-projects/${projectId}/portal/comments`);
check("admin comments unaffected by other tenant", r.status === 200);
r = await api("GET", `/api/client-projects/other-proj/portal`);
check("admin config other tenant -> 404", r.status === 404);
r = await api("GET", "/api/portal/othertoken2", { cookie: null });
check("unknown other token -> 404", r.status === 404);

// ---- proxy note: portal path outside matcher is a page, not API -------
// (checked in the browser E2E via the subdomain header path)

// ---- cleanup -----------------------------------------------------------
await qRun("DELETE FROM client_portal_approvals WHERE client_project_id = $1 OR portal_token = $1", [projectId]);
await qRun("DELETE FROM client_comments WHERE client_project_id = $1", [projectId]);
await qRun("DELETE FROM client_projects WHERE id IN ($1, $2)", [projectId, "other-proj"]);
await qRun("DELETE FROM tenants WHERE id = 2");

console.log(`\nSMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("Failures:", failures.join(" | "));
  process.exit(1);
}
