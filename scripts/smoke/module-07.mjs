// Module 7 smoke: site diary + snag list (Supabase runtime).
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

// ---- anon 401 gating ------------------------------------------------
let r = await fetch(`${BASE}/api/site-logs?client_project_id=x`);
check("anon GET site-logs -> 401", r.status === 401);
r = await fetch(`${BASE}/api/site-logs`, { method: "POST", body: "{}" });
check("anon POST site-logs -> 401", r.status === 401);
r = await fetch(`${BASE}/api/site-logs/upload`, { method: "POST" });
check("anon POST site-logs/upload -> 401", r.status === 401);
r = await fetch(`${BASE}/api/snags?client_project_id=x`);
check("anon GET snags -> 401", r.status === 401);
r = await fetch(`${BASE}/api/snags`, { method: "POST", body: "{}" });
check("anon POST snags -> 401", r.status === 401);
r = await fetch(`${BASE}/api/site-logs/export?client_project_id=x`);
check("anon GET site-logs/export -> 401", r.status === 401);

// ---- create project -------------------------------------------------
r = await api("POST", "/api/client-projects", {
  body: { name: "Diary smoke home", client_name: "Smoke Client" },
});
check("create client_project -> 200", r.status === 200 && r.json?.project?.id);
const projectId = r.json?.project?.id;
check("project id is uuid", /^[0-9a-f-]{36}$/.test(projectId ?? ""));

// ---- create site log with photos ------------------------------------
r = await api("POST", "/api/site-logs", {
  body: {
    client_project_id: projectId,
    log_date: "2026-08-15",
    labour_count: 6,
    work_done: "POP work done in master bedroom, tiles delivered",
    voice_transcript: "two labour absent today",
    weather: "sunny",
    photos: ["/api/uploads/local?path=site-photos/1/a.jpg", "/api/uploads/local?path=site-photos/1/b.jpg"],
  },
});
check("create site_log -> 200", r.status === 200 && r.json?.log?.id);
const logId = r.json?.log?.id;
check("log photos echo (2)", Array.isArray(r.json?.log?.photos) && r.json?.log?.photos.length === 2);
check("log created_by = admin email", r.json?.log?.createdBy === ADMIN_EMAIL);
check("log labour_count 6", r.json?.log?.labourCount === 6);
check("log weather sunny", r.json?.log?.weather === "sunny");

// invalid: no client_project_id
r = await api("POST", "/api/site-logs", { body: { work_done: "x" } });
check("create log without project -> 400", r.status === 400);

// ---- list + date range ----------------------------------------------
r = await api("GET", `/api/site-logs?client_project_id=${projectId}`);
check("list logs -> 1", r.status === 200 && r.json?.logs?.length === 1);
r = await api("GET", `/api/site-logs?client_project_id=${projectId}&from=2026-08-01&to=2026-08-10`);
check("date range outside -> 0", r.status === 200 && r.json?.logs?.length === 0);
r = await api("GET", `/api/site-logs?client_project_id=${projectId}&from=2026-08-01&to=2026-08-31`);
check("date range covering -> 1", r.status === 200 && r.json?.logs?.length === 1);
r = await api("GET", `/api/site-logs?client_project_id=${projectId}&from=2026-08-15&to=2026-08-15`);
check("date exact day -> 1", r.status === 200 && r.json?.logs?.length === 1);

// ---- patch -----------------------------------------------------------
r = await api("PATCH", `/api/site-logs/${logId}`, { body: { work_done: "Updated: POP complete", labour_count: 4 } });
check("patch work_done + labour -> 200", r.status === 200 && r.json?.log?.workDone === "Updated: POP complete" && r.json?.log?.labourCount === 4);
r = await api("PATCH", `/api/site-logs/${logId}`, { body: { photos: ["/api/uploads/local?path=site-photos/1/c.jpg"] } });
check("patch photos replaces array", r.status === 200 && r.json?.log?.photos?.length === 1);
r = await api("PATCH", `/api/site-logs/${logId}`, { body: {} });
check("patch empty -> 200 no-op", r.status === 200 && r.json?.log?.id === logId);
r = await api("PATCH", "/api/site-logs/does-not-exist", { body: { work_done: "x" } });
check("patch missing log -> 404", r.status === 404);

// ---- snags -----------------------------------------------------------
r = await api("POST", "/api/snags", {
  body: {
    client_project_id: projectId,
    site_log_id: logId,
    description: "Chipped tiles near bathroom door",
    assigned_to: "Ramesh",
    priority: "high",
    photo_url: "/api/uploads/local?path=site-photos/1/snag.jpg",
  },
});
check("create snag linked to log -> 200", r.status === 200 && r.json?.snag?.id);
const snagId = r.json?.snag?.id;
check("snag status open default", r.json?.snag?.status === "open");
check("snag priority high", r.json?.snag?.priority === "high");

r = await api("GET", `/api/snags?client_project_id=${projectId}`);
check("list snags -> 1 with logDate", r.status === 200 && r.json?.snags?.length === 1 && r.json?.snags?.[0]?.logDate === "2026-08-15");
r = await api("GET", `/api/snags?client_project_id=${projectId}&status=open`);
check("filter open -> 1", r.json?.snags?.length === 1);
r = await api("GET", `/api/snags?client_project_id=${projectId}&status=fixed`);
check("filter fixed -> 0", r.json?.snags?.length === 0);

// status lifecycle: open -> fixed -> verified -> open
r = await api("PATCH", `/api/snags/${snagId}`, { body: { status: "fixed" } });
check("mark fixed", r.status === 200 && r.json?.snag?.status === "fixed");
check("fixed_at stamped", Boolean(r.json?.snag?.fixedAt));
check("verified_at null on fixed", r.json?.snag?.verifiedAt == null);
r = await api("PATCH", `/api/snags/${snagId}`, { body: { status: "verified" } });
check("verify", r.json?.snag?.status === "verified" && Boolean(r.json?.snag?.verifiedAt));
r = await api("PATCH", `/api/snags/${snagId}`, { body: { status: "open" } });
check("reopen clears stamps", r.json?.snag?.status === "open" && r.json?.snag?.fixedAt == null && r.json?.snag?.verifiedAt == null);
r = await api("PATCH", `/api/snags/${snagId}`, { body: { status: "bogus" } });
check("invalid status -> 400", r.status === 400);
r = await api("PATCH", `/api/snags/${snagId}`, { body: { priority: "low" } });
check("patch priority", r.json?.snag?.priority === "low");

// delete log nulls snag link (snag survives)
r = await api("DELETE", `/api/site-logs/${logId}`);
check("delete log -> ok", r.status === 200 && r.json?.ok === true);
r = await api("GET", `/api/snags?client_project_id=${projectId}`);
check("snag survives log delete, link null", r.status === 200 && r.json?.snags?.length === 1 && r.json?.snags?.[0]?.siteLogId == null && r.json?.snags?.[0]?.logDate == null);

// create a second snag with no photo + empty description rejection
r = await api("POST", "/api/snags", { body: { client_project_id: projectId, description: "" } });
check("snag without description -> 400", r.status === 400);
r = await api("POST", "/api/snags", {
  body: { client_project_id: projectId, description: "Crack in kitchen plaster" },
});
check("second snag -> 200", r.status === 200 && r.json?.snag?.id);
const snag2 = r.json?.snag?.id;
r = await api("DELETE", `/api/snags/${snag2}`);
check("delete snag -> ok", r.status === 200 && r.json?.ok === true);

// ---- upload ----------------------------------------------------------
const fd = new FormData();
fd.append("client_project_id", projectId);
fd.append("file", new Blob([Buffer.from("fakephoto")], { type: "image/jpeg" }), "photo.jpg");
r = await fetch(`${BASE}/api/site-logs/upload`, { method: "POST", body: fd, headers: { Cookie: auth } });
let upJson = await r.json().catch(() => ({}));
check("upload jpg -> 200 with photo_url", r.status === 200 && Boolean(upJson.photo_url));
check("upload path under site-photos", String(upJson.storagePath ?? "").startsWith("site-photos/"));
const badFd = new FormData();
badFd.append("client_project_id", projectId);
badFd.append("file", new Blob([Buffer.from("x")], { type: "text/plain" }), "note.txt");
r = await fetch(`${BASE}/api/site-logs/upload`, { method: "POST", body: badFd, headers: { Cookie: auth } });
check("upload txt -> 400", r.status === 400);
r = await fetch(`${BASE}/api/site-logs/upload`, { method: "POST", body: new FormData(), headers: { Cookie: auth } });
check("upload no file -> 400", r.status === 400);

// ---- export ----------------------------------------------------------
r = await api("GET", `/api/site-logs/export?client_project_id=${projectId}&from=2026-08-01&to=2026-08-31`);
check("export -> 200 with totals", r.status === 200 && r.json?.totals?.logCount === 0 && r.json?.project?.name === "Diary smoke home");
r = await api("GET", `/api/site-logs/export?client_project_id=${projectId}`);
check("export without range -> 200", r.status === 200 && r.json?.totals);

// ---- cross-tenant 403/404 -------------------------------------------
await ensureTenant2();
await q(
  `INSERT INTO client_projects (id, tenant_id, name) VALUES ($1, 2, $2) ON CONFLICT (id) DO NOTHING`,
  ["other-proj", "Other"]
);
r = await api("GET", `/api/site-logs?client_project_id=other-proj`);
check("list logs for other tenant -> 404", r.status === 404);
r = await api("GET", `/api/snags?client_project_id=other-proj`);
check("list snags for other tenant -> 404", r.status === 404);
r = await api("POST", "/api/site-logs", { body: { client_project_id: "other-proj", work_done: "x" } });
check("create log for other tenant -> 404", r.status === 404);
r = await api("POST", "/api/snags", { body: { client_project_id: "other-proj", description: "x" } });
check("create snag for other tenant -> 404", r.status === 404);
await q(
  `INSERT INTO site_logs (id, tenant_id, client_project_id, photos) VALUES ($1, 2, $2, '[]') ON CONFLICT (id) DO NOTHING`,
  ["other-log", "other-proj"]
);
r = await api("PATCH", "/api/site-logs/other-log", { body: { work_done: "x" } });
check("patch other tenant log -> 404", r.status === 404);
await q(
  `INSERT INTO snags (id, tenant_id, client_project_id, description) VALUES ($1, 2, $2, $3) ON CONFLICT (id) DO NOTHING`,
  ["other-snag", "other-proj", "x"]
);
r = await api("PATCH", "/api/snags/other-snag", { body: { status: "fixed" } });
check("patch other tenant snag -> 404", r.status === 404);
r = await api("DELETE", "/api/snags/other-snag");
check("delete other tenant snag -> 404", r.status === 404);

// ---- cascade via project delete (DB, FK check) ----------------------
await q(
  `INSERT INTO site_logs (id, tenant_id, client_project_id, photos) VALUES ($1, 1, $2, '[]')`,
  ["cascade-log", projectId]
);
await q(
  `INSERT INTO snags (id, tenant_id, client_project_id, description, site_log_id) VALUES ($1, 1, $2, $3, $4)`,
  ["cascade-snag", projectId, "x", "cascade-log"]
);
// Postgres FKs are always enforced: deleting the project cascades to
// site_logs (CASCADE) and snags (CASCADE).
await qRun("DELETE FROM client_projects WHERE id = $1", [projectId]);
const logLeft = await qOne("SELECT COUNT(*)::int AS c FROM site_logs WHERE client_project_id = $1", [projectId]);
const snagLeft = await qOne("SELECT COUNT(*)::int AS c FROM snags WHERE client_project_id = $1", [projectId]);
check("project delete cascades logs + snags (DB)", (logLeft?.c ?? 0) === 0 && (snagLeft?.c ?? 0) === 0);

// ---- cleanup ---------------------------------------------------------
await qRun("DELETE FROM snags WHERE id = $1", ["other-snag"]);
await qRun("DELETE FROM site_logs WHERE id = $1", ["other-log"]);
await qRun("DELETE FROM client_projects WHERE id = $1", ["other-proj"]);
await qRun("DELETE FROM tenants WHERE id = 2");
await qRun("DELETE FROM site_logs WHERE client_project_id NOT IN (SELECT id FROM client_projects)");
await qRun("DELETE FROM snags WHERE client_project_id NOT IN (SELECT id FROM client_projects)");

console.log(`\nSMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("Failures:", failures.join(" | "));
  process.exit(1);
}
