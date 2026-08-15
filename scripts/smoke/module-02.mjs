// Module 2 smoke: leads inbox + kanban (Supabase runtime).
import { qRun } from "../smoke/db.mjs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = "admin@etihadinteriors.com";
const ADMIN_PASSWORD = "admin123";

let failures = 0;
function check(label, cond, extra) {
  if (cond) {
    console.log(`ok - ${label}`);
  } else {
    failures++;
    console.error(`FAIL - ${label}${extra !== undefined ? ` (${extra})` : ""}`);
  }
}

async function fetchRaw(method, path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  const init = { method, headers, redirect: "manual" };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  return fetch(`${BASE_URL}${path}`, init);
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

async function loginAdmin() {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const jar = parseSetCookies(csrfRes);
  const body = new URLSearchParams({
    csrfToken: csrfData.csrfToken,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    callbackUrl: BASE_URL + "/admin",
    json: "true",
  });
  const r = await fetch(`${BASE_URL}/api/auth/callback/credentials?json=true`, {
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
  return jar;
}

async function main() {
  // 1) Anon gates.
  let res = await fetchRaw("POST", "/api/leads/1/status", { body: { status: "won" } });
  check("anon POST /api/leads/1/status -> 401", res.status === 401, res.status);
  res = await fetchRaw("GET", "/api/leads");
  check("anon GET /api/leads -> 401", res.status === 401, res.status);

  const jar = await loginAdmin();
  if (!jar["__Secure-next-auth.session-token"] && !jar["next-auth.session-token"]) {
    console.error("FAIL - admin login did not yield a session token");
    process.exit(1);
  }
  console.log("ok - admin login");

  // 2) Create three leads with known budgets in three statuses.
  async function createLead(body) {
    const r = await fetchRaw("POST", "/api/leads", { cookie: cookieHeader(jar), body });
    const j = await r.json().catch(() => ({}));
    check(`create ${body.name} -> 200`, r.status === 200, r.status + " " + JSON.stringify(j));
    return j.item;
  }
  const a = await createLead({ name: "Amit Verma", phone: "90000 00001", email: "amit@example.com", source: "website", budget: "15-20L" });
  const b = await createLead({ name: "Bina Shah", phone: "90000 00002", email: "bina@example.com", source: "referral", budget: "under 10L" });
  const c = await createLead({ name: "Chetan Rao", phone: "90000 00003", email: "chetan@example.com", source: "phone", budget: "25L+" });
  check("createdAt present", typeof a?.createdAt === "string");
  check("lastStatusChangeAt set on create", typeof a?.lastStatusChangeAt === "string", JSON.stringify(a));
  check("lostReason null on create", a?.lostReason === null);

  // 3) Full status round trip on lead A: new -> qualified -> site_visit -> quote_sent -> won -> lost.
  const chain = [
    ["qualified", null],
    ["site_visit", null],
    ["quote_sent", null],
    ["won", null],
    ["lost", "No response after two weeks"],
  ];
  let prev = a.status;
  for (const [to, reason] of chain) {
    const r = await fetchRaw("POST", `/api/leads/${a.id}/status`, {
      cookie: cookieHeader(jar),
      body: reason ? { status: to, lost_reason: reason } : { status: to },
    });
    const j = await r.json().catch(() => ({}));
    check(`status ${prev} -> ${to} -> 200`, r.status === 200, r.status + " " + JSON.stringify(j));
    check(`${to} persisted`, j.item?.status === to, JSON.stringify(j.item));
    check(`${to} stamps lastStatusChangeAt`, typeof j.item?.lastStatusChangeAt === "string");
    if (to === "lost") {
      check("lost_reason persisted", j.item?.lostReason === reason, JSON.stringify(j.item));
    } else {
      check("lost_reason null on non-lost", j.item?.lostReason === null, JSON.stringify(j.item));
    }
    prev = to;
  }

  // 4) Moving out of lost clears the reason.
  res = await fetchRaw("POST", `/api/leads/${a.id}/status`, {
    cookie: cookieHeader(jar),
    body: { status: "won" },
  });
  let j = await res.json().catch(() => ({}));
  check("lost -> won -> 200", res.status === 200, res.status);
  check("lost_reason cleared on move out of lost", j.item?.lostReason === null, JSON.stringify(j.item));

  // 5) Invalid status rejected.
  res = await fetchRaw("POST", `/api/leads/${a.id}/status`, {
    cookie: cookieHeader(jar),
    body: { status: "bogus" },
  });
  check("invalid status -> 400", res.status === 400, res.status);

  // 6) Missing lead -> 404.
  res = await fetchRaw("POST", "/api/leads/999999/status", {
    cookie: cookieHeader(jar),
    body: { status: "won" },
  });
  check("missing lead status -> 404", res.status === 404, res.status);

  // 7) PATCH parity: status change via PATCH stamps lastStatusChangeAt + lost_reason.
  res = await fetchRaw("PATCH", `/api/leads/${b.id}`, {
    cookie: cookieHeader(jar),
    body: { status: "lost", lost_reason: "Budget too low" },
  });
  j = await res.json().catch(() => ({}));
  check("PATCH status lost -> 200", res.status === 200, res.status);
  check("PATCH stamps lastStatusChangeAt", typeof j.item?.lastStatusChangeAt === "string");
  check("PATCH sets lost_reason", j.item?.lostReason === "Budget too low", JSON.stringify(j.item));

  // 8) Stats + budget totals across all 6 statuses (zero-filled).
  res = await fetchRaw("GET", "/api/leads", { cookie: cookieHeader(jar) });
  j = await res.json().catch(() => ({}));
  check("GET 200", res.status === 200, res.status);
  check("stats has site_visit=0 (zero-filled)", j.stats?.site_visit === 0, JSON.stringify(j.stats));
  check("stats lost=1", j.stats?.lost === 1, JSON.stringify(j.stats));
  check("stats won=1", j.stats?.won === 1, JSON.stringify(j.stats));
  check("budgetStats won=15 (A: 15-20L)", j.budgetStats?.won === 15, JSON.stringify(j.budgetStats));
  check("budgetStats lost=10 (B: under 10L)", j.budgetStats?.lost === 10, JSON.stringify(j.budgetStats));
  check("budgetStats new=25 (C: 25L+)", j.budgetStats?.new === 25, JSON.stringify(j.budgetStats));
  check("budgetStats site_visit=0", j.budgetStats?.site_visit === 0, JSON.stringify(j.budgetStats));
  check("all six stat keys present", ["new","qualified","site_visit","quote_sent","won","lost"].every((k) => k in j.stats), JSON.stringify(j.stats));

  // 9) Admin pages reachable (list + board).
  res = await fetchRaw("GET", "/admin/leads", { cookie: cookieHeader(jar) });
  check("GET /admin/leads (list) -> 200", res.status === 200, res.status);
  res = await fetchRaw("GET", "/admin/leads/board", { cookie: cookieHeader(jar) });
  check("GET /admin/leads/board -> 200", res.status === 200, res.status);
  const body = await res.text();
  check("board page contains LeadKanban markup", body.includes("Lead pipeline") || body.includes("Board."), "no marker");

  // 10) Stats recompute after a status move (board/table both read GET).
  res = await fetchRaw("POST", `/api/leads/${c.id}/status`, {
    cookie: cookieHeader(jar),
    body: { status: "site_visit" },
  });
  j = await res.json().catch(() => ({}));
  check("C -> site_visit 200", res.status === 200, res.status);
  res = await fetchRaw("GET", "/api/leads", { cookie: cookieHeader(jar) });
  j = await res.json().catch(() => ({}));
  check("stats site_visit=1 after move", j.stats?.site_visit === 1, JSON.stringify(j.stats));
  check("stats new=0 after move", j.stats?.new === 0, JSON.stringify(j.stats));
  check("budgetStats site_visit=25 after move", j.budgetStats?.site_visit === 25, JSON.stringify(j.budgetStats));

  // 11) Cleanup the three smoke leads so the suite stays re-runnable.
  await qRun(
    "DELETE FROM leads WHERE email IN ('amit@example.com','bina@example.com','chetan@example.com')"
  );
  console.log("cleanup done");

  console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
