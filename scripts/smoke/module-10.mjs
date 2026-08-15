// Module 10 smoke: freemium plans + billing + gating (Supabase runtime).
import { qOne, qRun, resetForSmokes } from "../smoke/db.mjs";

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

const j = async (r) => {
  try {
    return await r.json();
  } catch {
    return {};
  }
};

// ---- reset state: tenant 1 back to free, empty module tables ----
await resetForSmokes();

const cookie = await login();

// ---- plans catalog ----
{
  const r = await fetch(`${BASE}/api/billing/plans`, { headers: { Cookie: cookie } });
  const d = await j(r);
  check("plans list 200 with 4 plans", r.status === 200 && Array.isArray(d.plans) && d.plans.length === 4, JSON.stringify(d));
  check("plans ordered free first", d.plans?.[0]?.id === "free");
  check("studio unlimited projects", d.plans?.find((p) => p.id === "studio")?.projectLimit === -1);
}

// ---- current on free ----
{
  const r = await fetch(`${BASE}/api/billing/current`, { headers: { Cookie: cookie } });
  const d = await j(r);
  check("current returns free plan", r.status === 200 && d.plan?.planId === "free", JSON.stringify(d).slice(0, 120));
  check("usage 0/1 projects on free", d.usage?.projects?.used === 0 && d.usage?.projects?.limit === 1);
}

// ---- project limit on free ----
{
  const r1 = await fetch(`${BASE}/api/client-projects`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Project One", client_name: "A. Client" }),
  });
  const d1 = await j(r1);
  check("project 1 created on free", r1.status === 200 && !!d1.project?.id, JSON.stringify(d1).slice(0, 120));
  const r2 = await fetch(`${BASE}/api/client-projects`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Project Two" }),
  });
  const d2 = await j(r2);
  check("project 2 blocked 402 PLAN_LIMIT", r2.status === 402 && d2.code === "PLAN_LIMIT", `${r2.status} ${JSON.stringify(d2).slice(0, 120)}`);
  check("project 2 reason mentions limit", typeof d2.error === "string" && d2.error.includes("limit"));
}

// ---- lead limit on free (25) ----
{
  let okCount = 0;
  let blocked = null;
  for (let i = 0; i < 26; i++) {
    const r = await fetch(`${BASE}/api/leads`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Lead ${i}`, phone: `90000000${String(i).padStart(2, "0")}` }),
    });
    const d = await j(r);
    if (r.status === 200) okCount++;
    else if (r.status === 402) blocked = { status: r.status, code: d.code, error: d.error };
  }
  check("25 leads created on free", okCount === 25, `created ${okCount}`);
  check("26th lead blocked 402", blocked?.status === 402 && blocked?.code === "PLAN_LIMIT", JSON.stringify(blocked));
}

// ---- upgrade to starter ----
{
  const r = await fetch(`${BASE}/api/billing/mock-upgrade`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: "starter" }),
  });
  const d = await j(r);
  check("mock-upgrade starter ok", r.status === 200 && d.ok === true, JSON.stringify(d));
  const c = await fetch(`${BASE}/api/billing/current`, { headers: { Cookie: cookie } });
  const dc = await j(c);
  check("current plan now starter", dc.plan?.planId === "starter" && dc.plan?.subscriptionStatus === "active", JSON.stringify(dc.plan));
  check("ai credits reset to plan limit", dc.usage?.aiCredits?.limit === 100 && dc.usage?.aiCredits?.used === 0);
}

// ---- project 2 now succeeds ----
{
  const r = await fetch(`${BASE}/api/client-projects`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Project Two" }),
  });
  const d = await j(r);
  check("project 2 created on starter", r.status === 200 && !!d.project?.id, JSON.stringify(d).slice(0, 100));
}

// ---- white-label gating on starter ----
{
  const rBad = await fetch(`${BASE}/api/tenants/1/domains`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ custom_domain: "projects.mystudio.com" }),
  });
  const dBad = await j(rBad);
  check("custom_domain blocked on starter 402", rBad.status === 402 && dBad.code === "PLAN_LIMIT", `${rBad.status} ${JSON.stringify(dBad).slice(0, 100)}`);

  const rSub = await fetch(`${BASE}/api/tenants/1/domains`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ client_subdomain: "client-smoke" }),
  });
  const dSub = await j(rSub);
  check("client_subdomain allowed on starter", rSub.status === 200 && dSub.clientSubdomain === "client-smoke", JSON.stringify(dSub));

  const rFmt = await fetch(`${BASE}/api/tenants/1/domains`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ client_subdomain: "Bad_Name!" }),
  });
  check("invalid subdomain 400", rFmt.status === 400, `${rFmt.status}`);
}

// ---- upgrade to pro: custom domain still gated (Studio-only) ----
{
  const r = await fetch(`${BASE}/api/billing/mock-upgrade`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: "pro" }),
  });
  await j(r);
  const d = await fetch(`${BASE}/api/tenants/1/domains`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ custom_domain: "projects.mystudio.com" }),
  }).then(j);
  check("custom_domain still blocked on pro (Studio-only)", d.ok !== true && d.code === "PLAN_LIMIT", JSON.stringify(d).slice(0, 120));
}

// ---- tenant isolation on domains route ----
{
  const r = await fetch(`${BASE}/api/tenants/999/domains`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ custom_domain: "x.com" }),
  });
  check("foreign tenant domains 403", r.status === 403, `${r.status}`);
}

// ---- AI credits exhaustion + reset ----
{
  await qRun("UPDATE tenants SET ai_credits_used = ai_credits WHERE id = 1");
  const r = await fetch(`${BASE}/api/ai/generate`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ client_project_id: "none", type: "weekly_report" }),
  });
  const d = await j(r);
  check("ai generate 402 when exhausted", r.status === 402 && d.code === "PLAN_LIMIT", `${r.status} ${JSON.stringify(d).slice(0, 100)}`);
}

// ---- create-order + webhook activation ----
{
  const r = await fetch(`${BASE}/api/billing/create-order`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: "studio", provider: "stripe" }),
  });
  const d = await j(r);
  check("create-order returns mock order", r.status === 201 && typeof d.order_id === "string" && d.order_id.startsWith("order_mock_"), JSON.stringify(d).slice(0, 140));
  const orderId = d.order_id;

  const sub = await qOne(
    "SELECT status, plan_id, provider_subscription_id FROM subscriptions WHERE provider_subscription_id = $1",
    [orderId]
  );
  check("pending subscription row stored", !!sub && sub.status === "pending" && sub.plan_id === "studio", JSON.stringify(sub));

  const w = await fetch(`${BASE}/api/billing/webhook/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_id: 1, plan_id: "studio", provider_subscription_id: orderId, type: "checkout.session.completed" }),
  });
  const dw = await j(w);
  check("stripe webhook activates", w.status === 200 && dw.received === true, JSON.stringify(dw));

  const c = await fetch(`${BASE}/api/billing/current`, { headers: { Cookie: cookie } });
  const dc = await j(c);
  check("current plan now studio after webhook", dc.plan?.planId === "studio" && dc.plan?.subscriptionStatus === "active", JSON.stringify(dc.plan));
  check("ai credits topped to studio limit", dc.usage?.aiCredits?.limit === 2000 && dc.usage?.aiCredits?.used === 0);
  check("subscription history lists active", Array.isArray(dc.subscriptions) && dc.subscriptions.some((s) => s.status === "active" && s.planId === "studio"), JSON.stringify(dc.subscriptions).slice(0, 140));

  // Studio plan: custom domain now allowed.
  const dDom = await fetch(`${BASE}/api/tenants/1/domains`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ custom_domain: "projects.mystudio.com" }),
  }).then(j);
  check("custom_domain allowed on studio", dDom.ok === true && dDom.customDomain === "projects.mystudio.com", JSON.stringify(dDom).slice(0, 120));
}

// ---- cancel keeps plan until period end ----
{
  const r = await fetch(`${BASE}/api/billing/cancel`, { method: "POST", headers: { Cookie: cookie } });
  const d = await j(r);
  check("cancel ok", r.status === 200 && d.ok === true, JSON.stringify(d));
  const c = await fetch(`${BASE}/api/billing/current`, { headers: { Cookie: cookie } });
  const dc = await j(c);
  check("plan stays studio after cancel", dc.plan?.planId === "studio" && dc.plan?.subscriptionStatus === "canceled", JSON.stringify(dc.plan));
}

// ---- anon auth ----
{
  const r1 = await fetch(`${BASE}/api/billing/plans`);
  check("anon billing plans 401", r1.status === 401, `${r1.status}`);
  const r2 = await fetch(`${BASE}/api/billing/current`);
  check("anon billing current 401", r2.status === 401, `${r2.status}`);
  const r3 = await fetch(`${BASE}/api/tenants/1/domains`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("anon domains 401", r3.status === 401, `${r3.status}`);
}

// ---- post-upgrade creation still works ----
{
  const r = await fetch(`${BASE}/api/client-projects`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Project Three" }),
  });
  const d = await j(r);
  check("project 3 created on studio (unlimited)", r.status === 200 && !!d.project?.id, `${r.status}`);
}

// ---- cleanup ----
await resetForSmokes();

console.log(`\nSMOKE: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("Failures:", failures.join(" | "));
  process.exit(1);
}
