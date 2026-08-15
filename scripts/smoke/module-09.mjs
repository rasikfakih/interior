// Module 9 smoke: AI weekly report + social autopilot (Supabase runtime, mock AI).
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

// ---- anon gating -------------------------------------------------------
let r = await fetch(`${BASE}/api/ai/generate`, { method: "POST", body: "{}" });
check("anon POST /api/ai/generate -> 401", r.status === 401);
r = await fetch(`${BASE}/api/ai/generations`);
check("anon GET /api/ai/generations -> 401", r.status === 401);
r = await fetch(`${BASE}/api/social/generate`, { method: "POST", body: "{}" });
check("anon POST /api/social/generate -> 401", r.status === 401);
r = await fetch(`${BASE}/api/social/posts?client_project_id=x`);
check("anon GET /api/social/posts -> 401", r.status === 401);
r = await fetch(`${BASE}/api/leads/1/score`, { method: "POST" });
check("anon POST lead score -> 401", r.status === 401);

// ---- seed project + logs -----------------------------------------------
r = await api("POST", "/api/client-projects", {
  body: { name: "AI smoke home", client_name: "AI Client" },
});
check("create client_project -> 200", r.status === 200 && r.json?.project?.id);
const projectId = r.json?.project?.id;

const today = new Date().toISOString().slice(0, 10);
const d1 = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
const d2 = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
r = await api("POST", "/api/site-logs", {
  body: {
    client_project_id: projectId,
    log_date: d1,
    labour_count: 8,
    work_done: "False ceiling grid in hall, electrical conduits laid",
    weather: "sunny",
    photos: ["/demo/living-room-1.jpg"],
  },
});
check("seed log 1", r.status === 200 && r.json?.log?.id);
r = await api("POST", "/api/site-logs", {
  body: {
    client_project_id: projectId,
    log_date: d2,
    labour_count: 6,
    work_done: "Wardrobe carcass assembly in master bedroom",
    voice_transcript: "tiles delivered late from Kajaria",
    weather: "cloudy",
    photos: ["/demo/kitchen-1.jpg"],
  },
});
check("seed log 2", r.status === 200 && r.json?.log?.id);
r = await api("POST", "/api/snags", {
  body: { client_project_id: projectId, description: "Chip on kitchen slab", priority: "high" },
});
check("seed snag", r.status === 200 && r.json?.snag?.id);

// ---- weekly report generation (mock AI) ---------------------------------
const usedBefore = Number((await qOne("SELECT ai_credits_used FROM tenants WHERE id = 1"))?.ai_credits_used ?? 0);
r = await api("POST", "/api/ai/generate", {
  body: { client_project_id: projectId, type: "weekly_report" },
});
check("generate weekly_report -> 201", r.status === 201 && Boolean(r.json?.generation?.id));
check("mock flag true (no key)", r.json?.mock === true);
check("model recorded", r.json?.generation?.model === "deepseek-v4-flash-0731");
check("credits_used 1", r.json?.generation?.creditsUsed === 1);
check("report has Work Completed", String(r.json?.generation?.output?.report ?? "").includes("Work Completed"));
check("report has Labour & Materials", String(r.json?.generation?.output?.report ?? "").includes("Labour & Materials"));
check("report has Next Week Plan", String(r.json?.generation?.output?.report ?? "").includes("Next Week Plan"));
check("credits used incremented", r.json?.credits?.aiCreditsUsed === usedBefore + 1);
const usedAfter = Number((await qOne("SELECT ai_credits_used FROM tenants WHERE id = 1"))?.ai_credits_used ?? 0);
check("DB credits_used incremented", usedAfter === usedBefore + 1);
const genRow = await qOne("SELECT * FROM ai_generations WHERE client_project_id = $1", [projectId]);
check("ai_generations row in DB", Boolean(genRow) && genRow.type === "weekly_report" && genRow.tenant_id === 1);
const genId = genRow?.id;

// invalid type + missing project
r = await api("POST", "/api/ai/generate", { body: { client_project_id: projectId, type: "bogus" } });
check("invalid type -> 400", r.status === 400);
r = await api("POST", "/api/ai/generate", { body: { client_project_id: "nope", type: "weekly_report" } });
check("missing project -> 404", r.status === 404);

// ---- generations list ----------------------------------------------------
r = await api("GET", "/api/ai/generations");
const planLimitRow = await qOne(
  "SELECT COALESCE((SELECT ai_credits_limit FROM plans p JOIN tenants t ON t.plan_id = p.id WHERE t.id = 1), 100) AS lim"
);
const planLimit = Number(planLimitRow?.lim ?? 100);
check("list generations -> 1 + credits", r.status === 200 && r.json?.generations?.length === 1 && r.json?.credits?.aiCredits === planLimit);
r = await api("GET", `/api/ai/generations?client_project_id=${projectId}`);
check("filter by project -> 1", r.json?.generations?.length === 1);
r = await api("GET", "/api/ai/generations?type=social_caption");
check("filter by type -> 0", r.json?.generations?.length === 0);

// ---- social captions + draft ---------------------------------------------
r = await api("POST", "/api/ai/generate", {
  body: {
    client_project_id: projectId,
    type: "social_caption",
    input: { photo_urls: ["/demo/living-room-1.jpg", "/demo/kitchen-1.jpg"] },
  },
});
check("generate social_caption -> 201", r.status === 201);
check("3 captions", Array.isArray(r.json?.generation?.output?.captions) && r.json?.generation?.output?.captions.length === 3);
check("hinglish present", Boolean(r.json?.generation?.output?.hinglish));
check("5 hashtags", Array.isArray(r.json?.generation?.output?.hashtags) && r.json?.generation?.output?.hashtags.length === 5);
const captionGenId = r.json?.generation?.id;

r = await api("POST", "/api/social/generate", {
  body: { client_project_id: projectId, ai_generation_id: captionGenId, photo_urls: ["/demo/living-room-1.jpg"] },
});
check("social generate -> 201 draft", r.status === 201 && r.json?.post?.status === "draft");
const postId = r.json?.post?.id;
check("draft has caption", Boolean(r.json?.post?.caption));
check("draft has hashtags string", String(r.json?.post?.hashtags ?? "").startsWith("#"));
check("draft images from selection", Array.isArray(r.json?.post?.imageUrls) && r.json?.post?.imageUrls.length >= 1);
check("draft links generation", r.json?.post?.aiGenerationId === captionGenId);

// social generate without generation id (runs its own AI call)
r = await api("POST", "/api/social/generate", {
  body: { client_project_id: projectId, photo_urls: ["/demo/kitchen-1.jpg"] },
});
check("social generate auto-caption -> 201", r.status === 201 && r.json?.post?.id);
const post2 = r.json?.post?.id;

r = await api("GET", `/api/social/posts?client_project_id=${projectId}`);
check("list posts -> 2", r.status === 200 && r.json?.posts?.length === 2);

// ---- patch + publish -----------------------------------------------------
r = await api("PATCH", `/api/social/posts/${postId}`, {
  body: { caption: "Edited caption for the smoke", status: "scheduled", scheduled_at: "2026-08-20T10:00:00.000Z" },
});
check("patch caption+status -> 200", r.status === 200 && r.json?.post?.caption === "Edited caption for the smoke" && r.json?.post?.status === "scheduled" && Boolean(r.json?.post?.scheduledAt));
r = await api("PATCH", `/api/social/posts/${postId}`, { body: { status: "bogus" } });
check("invalid status -> 400", r.status === 400);
r = await api("POST", `/api/social/posts/${postId}/publish`);
check("publish -> 200", r.status === 200 && r.json?.ok === true);
r = await api("GET", `/api/social/posts?client_project_id=${projectId}`);
const published = r.json?.posts?.find((p) => p.id === postId);
check("post published with published_at", published?.status === "published" && Boolean(published?.publishedAt));
r = await api("POST", "/api/social/posts/does-not-exist/publish");
check("publish missing post -> 404", r.status === 404);

// ---- lead score ----------------------------------------------------------
r = await api("POST", "/api/leads", {
  body: { name: "Score Me", phone: "9876543210", email: "score@x.com", source: "website", budget: "2500000" },
});
check("create lead -> 200 with item", r.status === 200 && Boolean(r.json?.item?.id));
const leadId = r.json?.item?.id;
r = await api("POST", `/api/leads/${leadId}/score`);
check("lead score -> 200", r.status === 200 && r.json?.ok === true);
check("score in 0-100", typeof r.json?.score === "number" && r.json?.score >= 0 && r.json?.score <= 100);
const leadRow = await qOne("SELECT score FROM leads WHERE id = $1", [leadId]);
check("leads.score updated in DB", Number(leadRow?.score) === r.json?.score);
const scoreGen = await qOne("SELECT * FROM ai_generations WHERE type = 'lead_score'");
check("lead_score generation recorded (null project ok)", Boolean(scoreGen) && scoreGen.client_project_id == null);

// ---- credits exhausted -> 402 --------------------------------------------
// The plan's ai_credits_limit is authoritative; exhaust by topping
// ai_credits_used to the effective (plan) limit.
await qRun(
  "UPDATE tenants SET ai_credits_used = COALESCE((SELECT ai_credits_limit FROM plans p JOIN tenants t ON t.plan_id = p.id WHERE t.id = 1), ai_credits) WHERE id = 1"
);
r = await api("POST", "/api/ai/generate", { body: { client_project_id: projectId, type: "weekly_report" } });
check("credits exhausted -> 402", r.status === 402);
await qRun("UPDATE tenants SET ai_credits_used = 0 WHERE id = 1");

// ---- cross-tenant ---------------------------------------------------------
await ensureTenant2("other9");
await q(
  `INSERT INTO client_projects (id, tenant_id, name) VALUES ($1, 2, $2) ON CONFLICT (id) DO NOTHING`,
  ["other-proj9", "Other"]
);
r = await api("POST", "/api/ai/generate", { body: { client_project_id: "other-proj9", type: "weekly_report" } });
check("generate for other tenant project -> 404", r.status === 404);
r = await api("GET", "/api/social/posts?client_project_id=other-proj9");
check("list posts other tenant -> 404", r.status === 404);
r = await api("POST", "/api/social/generate", { body: { client_project_id: "other-proj9" } });
check("social generate other tenant -> 404", r.status === 404);

// ---- cleanup --------------------------------------------------------------
await qRun("DELETE FROM ai_generations WHERE client_project_id = $1 OR type = 'lead_score'", [projectId]);
await qRun("DELETE FROM social_posts WHERE client_project_id = $1", [projectId]);
await qRun("DELETE FROM snags WHERE client_project_id = $1", [projectId]);
await qRun("DELETE FROM site_logs WHERE client_project_id = $1", [projectId]);
await qRun("DELETE FROM client_projects WHERE id IN ($1, $2)", [projectId, "other-proj9"]);
await qRun("DELETE FROM leads WHERE name = $1", ["Score Me"]);
await qRun("DELETE FROM tenants WHERE id = 2");
await qRun("UPDATE tenants SET ai_credits = 100, ai_credits_used = 0 WHERE id = 1");

console.log(`\nSMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("Failures:", failures.join(" | "));
  process.exit(1);
}
