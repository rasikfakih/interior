#!/usr/bin/env node
/**
 * Render-probe smoke. Reads the live home page and asserts the
 * GSAP-driven animation markers we shipped earlier are still in
 * the rendered HTML. This catches shape regressions like the
 * JSONB/safeParse bug from 2026-06-28: a 200 with empty <h1>
 * would slip past API smokes.
 *
 * Hits are per build, evaluated against a one-off marker count
 * we know the home page reaches after a fresh deploy.
 */
const BASE = process.env.SMOKE_BASE_URL || "https://ethinterior.vercel.app";

let pass = 0;
let fail = 0;
function ok(label) {
  pass++;
  console.log("  PASS " + label);
}
function bad(label, detail) {
  fail++;
  console.log("  FAIL " + label + (detail ? ": " + detail : ""));
}
function head(label) {
  console.log("\n=== " + label + " ===");
}

const EXPECTED = {
  // Hero
  "ei-word": 3,
  // Selected work
  "ei-work-photo": 3,
  "ei-work-meta": 3,
  "ei-work-title": 1,
  // Services
  "ei-cap-photo": 4,
  "ei-cap": 4,
  "ei-cap-fade": 12,
  // Principles
  "ei-prin-num": 4,
  "ei-prin-label": 4,
  "ei-prin-body": 4,
  // Testimonials
  "ei-quote": 4,
  "ei-mono": 3,
  // Journal
  "ei-news-row": 3,
  "ei-news-line": 3,
  // Closing CTA
  "ei-cta-word": 16,
  // Stats
  "ei-stat-rule": 4,
  "ei-stat": 8,
  // Process (legacy sticky stack)
  "process-card": 5,
};

(async () => {
  head("Home page render");
  const r = await fetch(BASE + "/?z=" + Date.now(), {
    headers: { "Cache-Control": "no-cache" },
  });
  if (r.status !== 200) {
    bad("/ homepage", "status " + r.status);
    process.exit(1);
  }
  const html = await r.text();
  ok("/");
  if (html.length < 30000) {
    bad("home body length", "len=" + html.length + " (expected 60-70KB)");
  } else {
    ok("home body length=" + html.length);
  }

  for (const [marker, expected] of Object.entries(EXPECTED)) {
    const re = new RegExp(marker, "g");
    const actual = (html.match(re) || []).length;
    if (actual < expected) {
      bad(`${marker} count`, `expected >= ${expected}, got ${actual}`);
    } else {
      ok(`${marker} = ${actual}`);
    }
  }

  // Hero copy is non-empty and has the per-AGENTS comma-fixed join
  if (/, , /.test(html)) {
    bad("hero h1 double-comma", "string ', , ' present in hero region");
  } else {
    ok("hero copy has no double-comma");
  }
  if (!/Homes built around/.test(html)) {
    bad("hero h1", "missing 'Homes built around' headline");
  } else {
    ok("hero h1 'Homes built around' present");
  }
  // The rendered headline splits italic label from the rest
  // with React's interpolation comments and span wrappers
  // ("</span></em>,<!-- -->"); tolerate anything between the
  // italic close and the next word.
  if (/how you live.*?not how a catalogue looks/.test(html)) {
    ok("hero headline has 'how you live ... not how a catalogue looks' shape");
  } else {
    bad("hero headline", "expected 'how you live ... not how a catalogue looks' shape");
  }

  head("/projects/[slug] render");
  for (const slug of ["casa-mira", "nalanda-house", "salt-flats"]) {
    const r = await fetch(BASE + "/projects/" + slug);
    if (r.status !== 200) bad(`${slug}`, "status " + r.status);
    else ok(`/projects/${slug}`);
  }

  head("/journal/[slug] render");
  for (const slug of ["material-honesty", "why-the-kitchen-table", "spatial-design-vs-interior"]) {
    const r = await fetch(BASE + "/journal/" + slug);
    if (r.status !== 200) bad(`/journal/${slug}`, "status " + r.status);
    else ok(`/journal/${slug}`);
  }

  head("Summary");
  console.log(`pass=${pass} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
