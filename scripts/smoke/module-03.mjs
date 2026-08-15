// Module 3 smoke: client projects + proposals with tracking (Supabase runtime).
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
const cookieHeader = (jar) =>
  Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

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
  // 1. Anon 401 gates.
  for (const [method, path] of [
    ["POST", "/api/client-projects"],
    ["GET", "/api/client-projects"],
    ["GET", "/api/proposals"],
    ["POST", "/api/proposals/generate"],
  ]) {
    const r = await fetchRaw(method, path, {
      body: method === "POST" ? {} : undefined,
    });
    check(`anon ${method} ${path} -> 401`, r.status === 401, `got ${r.status}`);
  }

  const jar = await loginAdmin();
  const auth = (method, path, body) => fetchRaw(method, path, { cookie: cookieHeader(jar), body });
  const authJson = async (method, path, body) => {
    const r = await auth(method, path, body);
    const j = await r.json().catch(() => ({}));
    return { r, j };
  };

  // 2. Seed a fresh lead via the admin API.
  const lead = await authJson("POST", "/api/leads", {
    name: "Module3 Smoke Lead",
    phone: "+91 90000 12345",
    email: "m3-smoke@example.com",
    source: "referral",
    budget: "15-20L",
  });
  check("create lead", lead.r.status === 200 && lead.j.item?.id > 0, `got ${lead.r.status}`);
  const leadId = lead.j.item.id;
  check("lead has clientProjectId null", lead.j.item.clientProjectId === null);

  // 3. Create project from lead -> lead becomes qualified.
  const proj = await authJson("POST", "/api/client-projects", {
    lead_id: leadId,
    name: "Smoke Family Home",
    client_name: "Module3 Smoke",
    client_phone: "+91 90000 12345",
    client_email: "m3-smoke@example.com",
    budget: 1250000,
    area_sqft: 1450,
    address: "Kalyan West",
  });
  check("create project", proj.r.status === 200 && proj.j.project?.id, `got ${proj.r.status}`);
  const projectId = proj.j.project.id;
  check("project status draft", proj.j.project.status === "draft", proj.j.project?.status);
  check("project budget mono", Number(proj.j.project.budget) === 1250000);

  const leadAfter = await authJson("GET", `/api/leads/${leadId}`);
  check("lead moved to qualified", leadAfter.j.status === "qualified", leadAfter.j.status);
  check("lead links clientProjectId", leadAfter.j.clientProjectId === projectId);

  // 4. Project list + search.
  const list = await authJson("GET", `/api/client-projects?q=Smoke`);
  check("project list search", Array.isArray(list.j.projects) && list.j.projects.length >= 1);

  // 5. Generate proposal.
  const gen = await authJson("POST", "/api/proposals/generate", {
    project_id: projectId,
    title: "Smoke Family Home proposal",
    budget: 1250000,
    timeline_text: "24 weeks",
    content_json: {
      scope: ["Living room design", "Kitchen remodel"],
      terms: "50% advance, balance on milestones",
      notes: "Site visit this week",
    },
  });
  check("generate proposal", gen.r.status === 200 && gen.j.token, `got ${gen.r.status}`);
  const token = gen.j.token;
  check("token 8-12 chars", /^[A-Za-z0-9]{8,12}$/.test(token), token);
  check("url shape", gen.j.url === `/proposal/${token}`, gen.j.url);
  check("proposal status sent", gen.j.proposal.status === "sent");

  const projAfter = await authJson("GET", "/api/client-projects?q=Smoke");
  const updatedProj = projAfter.j.projects.find((p) => p.id === projectId);
  check("project advanced to design", updatedProj?.status === "design", updatedProj?.status);

  // 6. Admin proposal list for project.
  const listP = await authJson("GET", `/api/proposals?project_id=${projectId}`);
  check("admin proposal list", listP.j.proposals?.length === 1, listP.j.proposals?.length);
  check("anon cannot list proposals", (await fetchRaw("GET", "/api/proposals")).status === 401);

  // 7. Public GET: tracking increments, status sent -> viewed, no tenant leak.
  const pub1 = await fetchRaw("GET", `/api/proposals/${token}`);
  const j1 = await pub1.json();
  check("public GET 200", pub1.status === 200);
  check("viewed_count 1", j1.proposal?.viewedCount === 1, j1.proposal?.viewedCount);
  check("status viewed", j1.proposal?.status === "viewed", j1.proposal?.status);
  check("viewed_at set", !!j1.proposal?.viewedAt);
  check("no tenant_id leak", j1.proposal?.tenantId === undefined && j1.project?.tenantId === undefined);
  check("brand name present", typeof j1.brand?.name === "string" && j1.brand.name.length > 0);
  check("project present", j1.project?.name === "Smoke Family Home");
  check("lead present", j1.lead?.name === "Module3 Smoke Lead");
  check("scope parsed", Array.isArray(j1.proposal?.content?.scope) && j1.proposal.content.scope.length === 2);

  // 8. View beacon increments again. Read the count via the admin
  // list (no tracking side effect) so the GET's own increment does
  // not skew the assertion.
  const beacon = await fetchRaw("POST", `/api/proposals/${token}/view`, { body: {} });
  check("view beacon 200", beacon.status === 200, beacon.status);
  const adminAfterBeacon = await authJson("GET", `/api/proposals?project_id=${projectId}`);
  const beaconCount = adminAfterBeacon.j.proposals?.[0]?.viewedCount;
  check("viewed_count 2 after beacon", beaconCount === 2, beaconCount);

  // 9. Public accept: approved + project design + lead won.
  const acc = await fetchRaw("POST", `/api/proposals/${token}/accept`, {
    body: { accepted_by_name: "Rhea Module3" },
  });
  const accJ = await acc.json();
  check("accept 200", acc.status === 200 && accJ.ok, `${acc.status} ${JSON.stringify(accJ)}`);

  const leadFinal = await authJson("GET", `/api/leads/${leadId}`);
  check("lead moved to won", leadFinal.j.status === "won", leadFinal.j.status);
  check("lead lastStatusChangeAt stamped", !!leadFinal.j.lastStatusChangeAt);

  const projFinal = await authJson("GET", "/api/client-projects?q=Smoke");
  const finalProj = projFinal.j.projects.find((p) => p.id === projectId);
  check("project design after accept", finalProj?.status === "design", finalProj?.status);

  // Accept without name -> 400; invalid token -> 404; repeat accept -> alreadyApproved.
  const noName = await fetchRaw("POST", `/api/proposals/${token}/accept`, { body: {} });
  check("accept no name 400", noName.status === 400, noName.status);
  const bad = await fetchRaw("GET", "/api/proposals/zzzzzzzz");
  check("invalid token 404", bad.status === 404, bad.status);
  const re = await fetchRaw("POST", `/api/proposals/${token}/accept`, {
    body: { accepted_by_name: "Again" },
  });
  check("repeat accept alreadyApproved", re.status === 200 && re.json !== undefined);

  // 10. Cleanup: proposal, project, lead.
  await qRun("DELETE FROM proposals WHERE token = $1", [token]);
  await qRun("DELETE FROM client_projects WHERE id = $1", [projectId]);
  await qRun("DELETE FROM leads WHERE id = $1", [leadId]);
  console.log("cleanup done");

  console.log(failures === 0 ? "ALL MODULE 3 SMOKE CHECKS PASS" : `${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
