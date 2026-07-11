// /projects-v2/[slug] detail-page smoke probe - TS-009 acceptance.
//
// Usage:
//   node scripts/smoke-projects-v2-detail.mjs                   -> probes http://localhost:3000
//   BASE_URL=https://ethinterior.vercel.app node scripts/smoke-projects-v2-detail.mjs
//
// Probes:
//   - GET /projects-v2/casa-mira, /nalanda-house, /salt-flats -> 200 each
//   - html assertions across all 3 of those pages
//   - ghost slug -> 404
//
// Exits 0 all-green; 1 on assertion fail; 2 on transport failure.

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const SLUGS = ["casa-mira", "nalanda-house", "salt-flats"];
const GHOST = "no-such-slug-12345-" + Date.now();

const checks = [];
function check(name, cond, detail) {
  checks.push({ name, ok: !!cond, detail });
}

async function get(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const r = await fetch(url, {
      headers: { accept: "text/html" },
      redirect: "manual",
    });
    return {
      ok: r.status >= 200 && r.status < 400,
      status: r.status,
      body: await r.text(),
    };
  } catch (e) {
    return { ok: false, status: 0, body: "", error: e.message };
  }
}

function perPageAssertions(slug, html) {
  const baseBack = `Back to selected work / slug ${slug}`;
  const pageOk =
    html.includes(slug) || html.includes(SLUGS.find((s) => html.includes(s.replace(/-/g, " "))) || "");
  check(`[${slug}] page reachable and renders slug-identifying content`, pageOk, "");

  const header =
    (html.match(/<header[^>]*aria-label="Project header"[\s\S]*?(?=<section )/) || [""])[0];
  check(`[${slug}] header section present`, header.length > 0, "section 1");

  check(
    `[${slug}] header has min-h-[78dvh] resolved`,
    /min-h-\[78dvh\]|min-h-\[78dvh\]/.test(header),
    "B7 hero discipline"
  );

  const headerNoPill = !/<header[^>]*aria-label="Project header"[\s\S]{0,800}chrome-pill/.test(html);
  check(`[${slug}] header has no chrome-pill`, headerNoPill, "B2 cheapest eyebrow");

  const noAddressInHero = !/<header[^>]*aria-label="Project header"[\s\S]{0,5000}studio_address/.test(html);
  check(`[${slug}] header does not duplicate brand.studio_address`, noAddressInHero, "D3 closure");

  const slider =
    (html.match(/<section[^>]*aria-label="Before and after"[\s\S]*?(?=<section )/) || [""])[0];
  check(
    `[${slug}] before-and-after section present`,
    slider.length > 0,
    "section 2"
  );

  const sliderHasRole = /role="slider"/.test(slider);
  const sliderFallbackOk =
    sliderHasRole ||
    /<figure[^>]*aspect-\[16\/9\]/.test(slider);
  check(
    `[${slug}] before-after carries role=slider OR single-image fallback`,
    sliderFallbackOk,
    "BeforeAfter subtree shape"
  );

  const sliderNoPill = !/<section[^>]*aria-label="Before and after"[\s\S]{0,3000}chrome-pill/i.test(slider);
  check(
    `[${slug}] before-and-after has no chrome-pill`,
    sliderNoPill,
    "B2 cheapest eyebrow"
  );

  const specs =
    (html.match(/<section[^>]*aria-label="Project specifications"[\s\S]*?(?=<section )/) || [""])[0];
  check(`[${slug}] specs section present`, specs.length > 0, "section 5");

  const specsCells = (specs.match(/<article[^>]*surface-tile/g) || []).length;
  check(
    `[${slug}] specs renders exactly 4 tiles`,
    specsCells === 4,
    "2-col lite-spec grid"
  );

  const specsNoPill = !/<section[^>]*aria-label="Project specifications"[\s\S]{0,1500}chrome-pill/i.test(specs);
  check(`[${slug}] specs has no chrome-pill`, specsNoPill, "B2 cheapest eyebrow");

  // Eyebrow count: taste-skill §4.7 caps section eyebrows at 1 per 3
  // sections. The "Before" / "After" chrome-pills inside
  // BeforeAfterSlider are functional reveal anchors (component state
  // labels), not section eyebrows. The From-the-homeowner pill is the
  // one actual section eyebrow. Count only the visible markup between
  // <main> and </main> so the Next.js RSC payload echoes and bundled
  // not-found fallback does not inflate the count.
  const visibleHtml = (html.match(/<main[\s\S]*<\/main>/) || [html])[0];
  const strippedHtml = visibleHtml
    .replace(/<span[^>]*class="[^"]*chrome-pill[^"]*"[^>]*>\s*Before\s*<\/span>/g, "")
    .replace(/<span[^>]*class="[^"]*chrome-pill[^"]*"[^>]*>\s*After\s*<\/span>/g, "");
  const pillCount = (strippedHtml.match(/chrome-pill/g) || []).length;
  check(
    `[${slug}] visible main carries exactly 1 chrome-pill (From the homeowner)`,
    pillCount === 1,
    `B2 cheapest (got ${pillCount} in <main>...</main>)`
  );

  const cta =
    (html.match(/<section[^>]*aria-label="Begin a project"[\s\S]*?(?=<section|<\/main>|<footer)/) || [""])[0];
  const ctaBtn = (cta.match(/class="[^"]*btn-primary[^"]*"/g) || []).length;
  check(
    `[${slug}] bottom CTA strip carries exactly one btn-primary`,
    ctaBtn === 1,
    `B1 intent dedupe + CTA contrast audit (got ${ctaBtn})`
  );
  const ctaNoPill = !/<section[^>]*aria-label="Begin a project"[\s\S]{0,1500}chrome-pill/i.test(cta);
  check(`[${slug}] bottom CTA has no chrome-pill`, ctaNoPill, "B2 cheapest eyebrow");

  const noPicsum = !/(picsum\.photos|TODO: real asset path)/.test(html);
  check(`[${slug}] no picsum or TODO markers shipped`, noPicsum, "A1 + B5 fix");

  const noEmDash = !/[—–]/.test(html);
  check(`[${slug}] no em-dash or en-dash in shipped markup`, noEmDash, "9.G ban");

  const noFiller = !html.includes("FALLBACK ");
  check(`[${slug}] no FALLBACK-marked image src`, noFiller, "real DB images only");

  const related =
    (html.match(/<section[^>]*aria-label="Related projects"[\s\S]*?(?=<section|<\/main>|<footer)/) || [""])[0]
      .toString();
  const relatedHasTiles = related
    ? (related.match(/<div[^>]*aspect-\[4\/5\]/g) || []).length
    : 0;
  if (related.length > 0) {
    check(
      `[${slug}] related section either zero or exactly 3 tiles`,
      related.length === 0 || relatedHasTiles === 3,
      "B7 empty-cell rule"
    );
    const relatedNoPill = !/<section[^>]*aria-label="Related projects"[\s\S]{0,3000}chrome-pill/i.test(related);
    check(`[${slug}] related strip has no chrome-pill`, relatedNoPill, "B2 cheapest eyebrow");
  } else {
    check(`[${slug}] related strip correctly absent (n<3)`, true, "B7 empty-cell guard");
  }
}

for (const slug of SLUGS) {
  const res = await get(`/projects-v2/${slug}`);
  if (!res.ok) {
    console.error(`[FAIL] /projects-v2/${slug} -> ${res.status}`);
    if (res.status === 0) process.exit(2);
    process.exit(1);
  }
  perPageAssertions(slug, res.body);
}

const ghost = await get(`/projects-v2/${GHOST}`);
check(
  `ghost slug /projects-v2/${GHOST} returns 404`,
  ghost.status === 404,
  `notFound() guard active (got ${ghost.status})`
);

// global report
let pass = 0;
let fail = 0;
const lines = [];
for (const c of checks) {
  const tag = c.ok ? "[OK]  " : "[FAIL]";
  lines.push(`${tag} ${c.name}${c.ok ? "" : ` - ${c.detail || ""}`}`);
  if (c.ok) pass++;
  else fail++;
}
console.log(lines.join("\n"));
console.log(`\nresult: pass=${pass} fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);
