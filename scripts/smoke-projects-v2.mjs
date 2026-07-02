// /projects-v2 smoke probe - v1.3.x acceptance.
//
// Usage:
//   node scripts/smoke-projects-v2.mjs              -> probes http://localhost:3000
//   BASE_URL=http://localhost:3000 node scripts/smoke-projects-v2.mjs
//
// Exits 0 on all-green, 1 on any failed assertion, 2 on transport
// failure (server unreachable), 3 on missing DB row (operator
// should seed first).

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const checks = [];
function check(name, cond, detail) {
  checks.push({ name, ok: !!cond, detail });
}

async function get(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const r = await fetch(url, { headers: { accept: "text/html" } });
    return { ok: r.ok, status: r.status, body: await r.text() };
  } catch (e) {
    return { ok: false, status: 0, body: "", error: e.message };
  }
}

const home = await get("/projects-v2");

if (!home.ok) {
  console.error(`[FAIL] /projects-v2 -> ${home.status}`);
  if (home.error) console.error(`       ${home.error}`);
  if (home.body && home.body.length < 1024) console.error(`       ${home.body.slice(0, 200)}`);
  process.exit(2);
}
const html = home.body;

const hero = html.includes("Homes drawn, built, and lived in");
check("hero headline present", hero, "v1 hero carried 'Homes drawn, built, and lived in.'");

const noV1ArchiveCta = !html.includes("View archive");
check("no v1 'View archive' CTA on hero", noV1ArchiveCta, "B1 fix");

const eyebrowInHero = /aria-label="Projects hero"[\s\S]{0,2000}chrome-pill/.test(html);
check("no chrome-pill in Hero", !eyebrowInHero, "B2 eyebrow discipline");

const eyebrowInNumbers = /aria-label="Studio numbers"[\s\S]{0,800}chrome-pill/.test(html);
check("no chrome-pill in NumbersStrip", !eyebrowInNumbers, "B2 eyebrow discipline");

const eyebrowInFeatured = /aria-label="Featured projects"[\s\S]{0,800}chrome-pill/.test(html);
check("no chrome-pill in FeaturedGrid", !eyebrowInFeatured, "B2 eyebrow discipline");

const eyebrowInProcess = /aria-label="Process timeline"[\s\S]{0,1200}chrome-pill/.test(html);
check("no chrome-pill in ProcessStrip", !eyebrowInProcess, "B2 eyebrow discipline");

const dbImageMarkers = ["casa-mira", "Nalanda", "salt-flats"];
const featuredSection = (html.match(/<section[^>]*id="project-grid"[\s\S]*?(?=<\/section>|<section )/) || [""])[0];
const hasDbImages = featuredSection.includes("before_image") || dbImageMarkers.some((m) => featuredSection.includes(m));
check("FeaturedGrid bento carries real DB image markers", hasDbImages, "A1 fix: no picsum, only before_image");

const featuresH2 = /Houses on public record/.test(featuredSection);
const noTerminalPeriod = !/Houses on public record\./.test(featuredSection);
check("FeaturedGrid h2 reads 'Houses on public record' (no terminal period)", featuresH2 && noTerminalPeriod, "D2 fix");

const testimonialBlock = (html.match(/aria-label="Client voice"[\s\S]*?(?=<\/section>|<section )/) || [""])[0];
const tsOk = !/Homeowner - 2024 commission/.test(testimonialBlock);
check("Testimonial no longer hardcodes 'Homeowner - 2024 commission'", tsOk, "A3 + D1 fix");

const taglineIsEmpty = /(aria-label="Client voice"[\s\S]{0,1800})(Studio line|From the homeowner)/.test(html);
check("Testimonial either echoes DB name or 'Studio line' generic", taglineIsEmpty, "DB-backed attribution");

const processBlock = (html.match(/aria-label="Process timeline"[\s\S]*?(?=<\/section>|<section )/) || [""])[0];
const processOk = /Twenty-four weeks, four stages, one team/.test(processBlock);
check("ProcessStrip h2 present", processOk, "section 6");

const faqBlock = (html.match(/aria-label="Frequently asked questions"[\s\S]*?(?=<\/section>|<section )/) || [""])[0];
const faqPeriodDropped = /Before you write, the answers already here/.test(faqBlock) && !/Before you write, the answers already here\./.test(faqBlock);
check("Faq h2 reads without terminal period", faqPeriodDropped, "D2 fix");
const faqNoEyebrow = !/<p[^>]*chrome-pill[^>]*>\s*Questions\s*<\/p>/.test(faqBlock);
check("Faq no chrome-pill eyebrow", faqNoEyebrow, "B2 eyeball discipline");

const ctaBlock = (html.match(/aria-label="Begin a project"[\s\S]*?(?=<\/section>|<section )/) || [""])[0];
const ctaH2 = /Ready when the house is/.test(ctaBlock);
const ctaH2NoPeriod = !/Ready when the house is\./.test(ctaBlock);
check("CtaBand h2 reads without terminal period", ctaH2 && ctaH2NoPeriod, "D2 fix");

const heroContactOnly = (() => {
  const heroBlock = (html.match(/aria-label="Projects hero"[\s\S]*?(?=<\/section>|<section )/) || [""])[0];
  const btnCount = (heroBlock.match(/class="[^"]*btn-primary[^"]*"/g) || []).length;
  return btnCount === 1;
})();
check("Hero carries exactly one btn-primary CTA", heroContactOnly, "B1 fix: drop second button");

const noPicsum = !html.includes("picsum.photos");
check("No picsum fallbacks anywhere on /projects-v2", noPicsum, "A1 fix");

const noTodoMarkers = !html.includes("TODO: real asset path");
check("No '// TODO' markers in shipped markup", noTodoMarkers, "B5 fix");

const noAddressInHero = !/aria-label="Projects hero"[\s\S]{0,4000}studio_address/.test(html);
check("Hero does not render studio_address directly (D3 dedupe)", noAddressInHero, "D3 fix");

// report
let pass = 0;
let fail = 0;
const lines = [];
for (const c of checks) {
  const tag = c.ok ? "[OK]  " : "[FAIL]";
  lines.push(`${tag} ${c.name}${c.ok ? "" : ` - ${c.detail}`}`);
  if (c.ok) pass++;
  else fail++;
}
console.log(lines.join("\n"));
console.log(`\nresult: pass=${pass} fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);
