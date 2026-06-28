#!/usr/bin/env node
/**
 * One-shot: seed the 'home' page on Postgres with the studio's block list.
 * POST /api/pages  -> creates the row
 * PUT  /api/pages/[id] -> updates meta
 * PUT  /api/pages/[id]/blocks -> persists blocks (atomic replace)
 *
 * Reads admin creds from SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD; uses
 * the same mismatch detection as scripts/smoke-admin-live.mjs.
 */

const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";
const EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

async function csrfAndCookie() {
  const r = await fetch(BASE + "/api/auth/csrf");
  const setCookie = r.headers.get("set-cookie") || "";
  const cookies = {};
  for (const c of setCookie.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const [k, ...v] = pair.split("=");
    cookies[k] = v.join("=");
  }
  const data = await r.json();
  return { csrfToken: data.csrfToken, cookies };
}
function cookieHeader(jars) {
  return Object.entries(jars)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}
async function login(email, password) {
  const { csrfToken, cookies } = await csrfAndCookie();
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: BASE + "/admin",
    json: "true",
  });
  const r = await fetch(BASE + "/api/auth/callback/credentials?json=true", {
    method: "POST",
    redirect: "manual",
    headers: {
      Cookie: cookieHeader(cookies),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const setCookie = r.headers.get("set-cookie") || "";
  for (const c of setCookie.split(/, (?=[A-Za-z0-9._-]+=)/)) {
    const [pair] = c.split(";");
    const [k, ...v] = pair.split("=");
    if (k) cookies[k] = v.join("=");
  }
  return { cookies, status: r.status };
}

const BLOCKS = [
  {
    type: "hero",
    data: {
      eyebrow: "Residential Studio",
      headlinePlain: "Homes built around",
      headlineItalic: "how you live",
      afterPlain: "not how a catalogue looks",
      subtext:
        "A residential interior studio. Twenty-four weeks. One team. Drawings, materials, and on-site direction from the same hands.",
      photoUrl:
        "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1600&auto=format&fit=crop",
      studioNote: "Every project supervised on-site. No remote hand-offs.",
      stats: [
        { label: "EST.", value: "2017" },
        { label: "Residences delivered", value: "60+" },
        { label: "Avg. project weeks", value: "24" },
        { label: "Studio base", value: "Kalyan, MH" },
      ],
    },
  },
  {
    type: "principles",
    data: {
      title: "Four standards we hold ourselves to.",
      lede:
        "Drawn from the studio's first seven years. Decisions and standards, not copy.",
      items: [
        { label: "One team", body: "Drawings, materials, and site direction from the same studio. No hand-offs." },
        { label: "Five phases", body: "A repeat process. Watched weekly. Reported in writing, not in chat." },
        { label: "On-site direction", body: "Weekly site visits. Snag lists with photographs. Final handover document." },
        { label: "No catalogue swap", body: "Materials are specified against the brief. Substitutions need a conversation." },
      ],
    },
  },
  {
    type: "services",
    data: {
      title: "A studio that draws, specifies, and ",
      titleEm: "builds",
      afterEm: "from one desk",
      lede:
        "Four capabilities. An interior studio that doesn't farm out drawings or hand off a material board at week six and disappear.",
      cells: [
        {
          title: "Spatial design",
          body: "Plans, sections, and elevations drawn in-house. Locked before any material is chosen.",
          photo: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop",
        },
        {
          title: "Material specification",
          body: "Stone, wood, textile, finish — sourced and specified against your brief.",
          photo: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop",
        },
        {
          title: "On-site direction",
          body: "Weekly site visits. Written reports. Contractors work to drawings.",
          photo: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=1600&auto=format&fit=crop",
        },
        {
          title: "Furniture & styling",
          body: "Custom joinery and made-to-order soft furnishing. Everything accounted for.",
          photo: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop",
        },
      ],
    },
  },
  {
    type: "selected-work",
    data: {
      sectionTitle: "Selected work",
      lede:
        "Three recent residences. Drawings archived, photographs kept. No full client list published.",
      projectSlugs: ["casa-mira", "nalanda-house", "salt-flats"],
    },
  },
  {
    type: "process",
    data: {
      eyebrow: "How we work",
      title: "Five phases. Twenty-four weeks. One team.",
      phases: [
        { number: "01", title: "Brief", body: "We start at the kitchen table, not the mood board.", deliverable: "Site survey, spatial brief, budget frame", duration: "Week 1-2" },
        { number: "02", title: "Spatial design", body: "Plans, sections, and elevations drawn to scale.", deliverable: "Architectural plans, furniture grids", duration: "Week 3-6" },
        { number: "03", title: "Material", body: "Stone, wood, metal, textile. We source from quarries, mills and workshops.", deliverable: "Material board, vendor list, samples", duration: "Week 6-9" },
        { number: "04", title: "Build", body: "Site direction, weekly visits, written reports.", deliverable: "Weekly reports, snag list, QC photos", duration: "Week 10-24" },
        { number: "05", title: "Handover", body: "Furniture placed, art hung, lighting tuned.", deliverable: "As-built manual, vendor contacts", duration: "Final week" },
      ],
    },
  },
  {
    type: "testimonials",
    data: {
      title: "Words from the homes.",
      lede:
        "Three clients, three completions. Names abbreviated on request.",
      items: [
        { body: "They drew every drawing on paper. The site team worked to those drawings. The home we live in today looks like the drawings.", name: "Rhea D.", role: "Homeowner", location: "Casa Mira, Bandra" },
        { body: "No surprise substitutions. No margin pad on the bill. The handover manual is a document we still open before guests arrive.", name: "Aravind K.", role: "Homeowner", location: "Nalanda House, Kalyan" },
        { body: "We came in with a Pinterest folder and a budget. We left with a home and an instruction manual. Twenty-four weeks exactly.", name: "Mira S.", role: "Homeowner", location: "Salt Flats, Alibaug" },
      ],
    },
  },
  {
    type: "journal-preview",
    data: {
      sectionTitle: "Studio Journal",
      sectionTitleEm: "Studio",
      lede:
        "Field notes from the studio. Written by hand. Published when ready.",
      count: 3,
    },
  },
  {
    type: "spatial-walkthroughs",
    data: {
      eyebrow: "Walk through",
      title: "Spatial studies, in 3D",
      lede:
        "Tap to load. Rotate. Reduced-motion skips animation.",
      projectSlugs: ["nalanda-house", "casa-mira", "salt-flats"],
    },
  },
  {
    type: "closing-cta",
    data: {
      text: "A home you'll live in for twenty years. Let's start with a kitchen table conversation.",
      em: "twenty years",
      buttonLabel: "Start a project",
      buttonHref: "/contact",
    },
  },
];

(async () => {
  if (!EMAIL || !PASSWORD) {
    console.error("Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD env.");
    process.exit(2);
  }
  console.log("=== Login ===");
  const { cookies } = await login(EMAIL, PASSWORD);
  const ck = cookieHeader(cookies);

  // Inspect
  const list = await fetch(BASE + "/api/pages", { headers: { Cookie: ck } });
  const rows = await list.json();
  const existingHome = rows.find((p) => p.slug === "home");
  let id;
  if (existingHome) {
    id = existingHome.id;
    console.log("home exists with id=" + id);
  } else {
    console.log("home missing, creating...");
    const created = await fetch(BASE + "/api/pages", {
      method: "POST",
      headers: { Cookie: ck, "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "home",
        title: "Etihad Interiors — Residential Design Studio",
        status: "published",
        isFront: true,
        seoTitle: "Etihad Interiors — Residential Design Studio",
        seoDescription:
          "A residential studio shaping considered homes across Maharashtra.",
      }),
    });
    const cj = await created.json();
    id = cj?.id;
    console.log("created status=" + created.status + " id=" + id);
  }
  if (!id) {
    console.error("failed to obtain id, body: " + JSON.stringify(rows));
    process.exit(1);
  }

  console.log("=== PUT meta ===");
  const meta = await fetch(BASE + "/api/pages/" + id, {
    method: "PUT",
    headers: { Cookie: ck, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Etihad Interiors — Residential Design Studio",
      slug: "home",
      status: "published",
      isFront: true,
      seoTitle: "Etihad Interiors — Residential Design Studio",
      seoDescription:
        "A residential studio shaping considered homes across Maharashtra.",
    }),
  });
  console.log("meta status=" + meta.status);

  console.log("=== PUT blocks ===");
  const bk = await fetch(BASE + "/api/pages/" + id + "/blocks", {
    method: "PUT",
    headers: { Cookie: ck, "Content-Type": "application/json" },
    body: JSON.stringify({ blocks: BLOCKS }),
  });
  console.log("blocks status=" + bk.status);
  console.log("blocks body=" + (await bk.text()).slice(0, 200));

  console.log("=== Confirm ===");
  const home = await fetch(BASE + "/", { headers: { Cookie: ck } });
  const html = await home.text();
  const okHero = html.includes("Homes built around");
  const okBlocks = html.includes("Words from the homes");
  console.log("status=" + home.status + " heroBlockPresent=" + okHero + " closingBlock=" + okBlocks);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
