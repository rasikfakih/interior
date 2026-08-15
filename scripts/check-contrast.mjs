#!/usr/bin/env node
/**
 * scripts/check-contrast.mjs
 *
 * The computed-contrast CI walker. Audits every rendered text surface
 * on the public site, the tenant admin console, and the superadmin
 * operator console for WCAG AA contrast (4.5:1 small / 3:1 large) in
 * both the light and dark themes, using real browser computed styles.
 *
 * Why a browser: token-level math (check-theme-presets.mjs) cannot
 * catch component-level breakage - e.g. the /themes catalog cards
 * that pinned a preset's LIGHT palette on the wrapper while inner
 * text flipped to DARK theme variables (measured 1.76:1), or preset
 * name chips at 3.8:1. Only computed styles over a real render can
 * see those.
 *
 * Run (assumes `npm run build` has run):
 *   node scripts/check-contrast.mjs
 *
 * Env:
 *   BASE_URL             audit an already-running server instead of
 *                        spawning `next start` (default spawns on a
 *                        fresh free port so a stale server can never
 *                        answer in place of the new build)
 *   CONTRAST_THEMES      comma list, default "light,dark"
 *   CONTRAST_ONLY        comma list of route prefixes to scope the run
 *   CONTRAST_ADMIN_EMAIL / CONTRAST_ADMIN_PASSWORD
 *                        tenant-admin creds for the NextAuth login.
 *                        Defaults to the repo's committed dev seed
 *                        (admin@etihadinteriors.com / admin123) seeded
 *                        by scripts/migrate.mjs, which also exists on
 *                        the live DB unless the operator changed it.
 *   CONTRAST_CREDS_FILE  path to a JSON file { "email", "password" }
 *                        for secrets-backed runs (nightly/live audits
 *                        in CI). Env vars above win over the file.
 *   CONTRAST_NO_ADMIN=1  skip the admin + superadmin surfaces
 *   CONTRAST_HEADLESS=0  run headed (debugging)
 *
 * Exit 1 on any failure. Routes that 404 are logged and skipped (a
 * missing route is a content problem, not a contrast failure).
 *
 * Known limitations (honest, documented):
 *   - Text sitting directly on a photographic image with no gradient
 *     overlay is skipped + logged ("image overlay"): the browser
 *     cannot tell us the photo's local color, so a ratio would be
 *     fabricated. Text over a gradient overlay (e.g. from-black/60)
 *     IS checked against the darkest stop (worst case).
 *   - Elements with opacity < 0.6 are skipped ("transient"): reveal
 *     animations, hover trails, decorative glows.
 *   - `aria-hidden` subtrees are skipped (decorative).
 *   - iframes (the 3D viewer) are not descended into.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const BASE_URL = process.env.BASE_URL || null;

// Pick a free loopback port per run. A fixed port lets a stale
// `next start` answer in place of the freshly spawned one, so the
// audit silently measures an old build (a failure mode seen on
// Windows: leftover servers serving files the rebuild deleted).
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}
const THEMES = (process.env.CONTRAST_THEMES || "light,dark")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s === "light" || s === "dark");
const ONLY = (process.env.CONTRAST_ONLY || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const HEADLESS = process.env.CONTRAST_HEADLESS !== "0";
const DO_ADMIN = process.env.CONTRAST_NO_ADMIN !== "1";
let ADMIN_EMAIL = process.env.CONTRAST_ADMIN_EMAIL || "admin@etihadinteriors.com";
let ADMIN_PASSWORD = process.env.CONTRAST_ADMIN_PASSWORD || "admin123";
// Secrets-backed runs (nightly live audits) pass a creds file so the
// plaintext password never lives in the command line or the workflow
// YAML. Env vars take precedence over the file.
const CREDS_FILE = process.env.CONTRAST_CREDS_FILE || null;
if (CREDS_FILE) {
  try {
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
    if (!process.env.CONTRAST_ADMIN_EMAIL && creds.email) ADMIN_EMAIL = creds.email;
    if (!process.env.CONTRAST_ADMIN_PASSWORD && creds.password) ADMIN_PASSWORD = creds.password;
  } catch (e) {
    console.error(
      `check-contrast: cannot read CONTRAST_CREDS_FILE ${CREDS_FILE}: ${e.message}`
    );
    process.exit(2);
  }
}

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------

const PUBLIC_ROUTES = [
  "/",
  // M1 (2026-08-15): the agency site moved under /demo; the root is
  // the Studio OS SaaS marketing site. Old paths 301 to /demo/*.
  "/demo",
  "/demo/work",
  "/demo/work/casa-mira",
  "/demo/work/nalanda-house",
  "/demo/work/salt-flats",
  "/demo/journal",
  "/demo/journal/spatial-design-vs-interior",
  "/demo/about",
  "/demo/contact",
  "/demo/voices",
  "/demo/themes",
  "/this-page-does-not-exist-404",
];

const ADMIN_ROUTES = [
  "/admin",
  "/admin/pages",
  "/admin/media",
  "/admin/projects",
  "/admin/journal",
  "/admin/testimonials",
  "/admin/team",
  "/admin/menus",
  "/admin/forms",
  "/admin/newsletter",
  "/admin/redirects",
  "/admin/theme",
  "/admin/site-identity",
  "/admin/users",
  "/admin/export-import",
  "/admin/settings",
  "/admin/install",
  "/admin/license",
];

const SUPERADMIN_ROUTES = [
  "/superadmin",
  "/superadmin/tenants",
  "/superadmin/tenants/new",
  "/superadmin/issue",
  "/superadmin/health",
  "/superadmin/metrics",
  "/superadmin/announcements",
  "/superadmin/backup",
  "/superadmin/rotate",
  "/superadmin/theme",
];

function inScope(route) {
  if (ONLY.length === 0) return true;
  return ONLY.some((p) => route === p || route.startsWith(p));
}

// ------------------------------------------------------------------
// Browser-side walker. Passed to page.evaluate AS A SINGLE FUNCTION:
// Playwright serializes only the function itself, so every helper must
// be defined inside it (references to outer scope are lost in the page).
// Hand-escaping regexes through template-literal interpolation double-
// escapes them, so keep this plain ES2019-safe function source.
// ------------------------------------------------------------------
function contrastWalkTheme() {
  // Color handling notes:
  //   - Modern Chromium returns `oklab(...)`/`oklch(...)` for Tailwind
  //     v4 alpha syntax (e.g. `from-black/60` -> `oklab(0 0 0 / 0.6)`);
  //     the L channel maps to a gray approximation with the alpha.
  //   - `<img>`/`<canvas>` elements in the backdrop chain are treated
  //     as an image backdrop: skipped unless a gradient overlay is
  //     present (then the darkest stop is the worst case).

function parseContrastColor(str) {
  if (!str || str === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  str = str.trim();
  if (str.startsWith("#")) {
    let h = str.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgb = str.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/
  );
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  // oklab(L a b / A) or oklch(L C H / A): L -> gray approximation.
  const lab = str.match(/okl(?:ab|ch)\(\s*([\d.]+)\s+[^/)]*(?:\/\s*([\d.]+))?\s*\)/);
  if (lab) {
    const L = Math.min(1, Math.max(0, Number(lab[1])));
    const v = Math.round(L * 255);
    return { r: v, g: v, b: v, a: lab[2] === undefined ? 1 : Number(lab[2]) };
  }
  return null;
}

function contrastLuminance(c) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function contrastRatio(a, b) {
  const la = contrastLuminance(a);
  const lb = contrastLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function compositeColors(top, bottom) {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
    g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
    b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
    a,
  };
}

function gradientStopsFrom(str) {
  const stops = [];
  const re = /rgba?\(\s*[\d.]+(?:\s|,\s*[\d.]+){2,3}(?:,\s*[\d.]+)?\)/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const c = parseContrastColor(m[0]);
    if (c) stops.push(c);
  }
  const reLab = /okl(?:ab|ch)\(\s*[\d.]+\s+[^)]*\)/g;
  let lm;
  while ((lm = reLab.exec(str)) !== null) {
    const c = parseContrastColor(lm[0]);
    if (c) stops.push(c);
  }
  return stops;
}

function contrastSelectorOf(el) {
  if (el.id) return "#" + el.id;
  const parts = [];
  let node = el;
  while (node && node !== document.documentElement && parts.length < 3) {
    let sel = node.tagName.toLowerCase();
    if (node.classList && node.classList.length)
      sel += "." + [...node.classList].slice(0, 3).join(".");
    parts.unshift(sel);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

function contrastBackdropOf(el, root) {
  let acc = { r: 255, g: 255, b: 255, a: 1 };
  // Walk UP from the element to the root (html), then iterate
  // root-first so backgrounds composite in paint order (ancestors
  // behind, the element on top).
  const chain = [];
  let n = el;
  while (n) {
    chain.push(n);
    if (n === root) break;
    n = n.parentElement;
  }
  chain.reverse();
  let imageSeen = false;
  let hasGradient = false;
  for (const node of chain) {
    if (node.tagName === "IMG" || node.tagName === "CANVAS") {
      imageSeen = true;
      continue;
    }
    // Photo heroes and project cards layer the image as a positioned
    // <img> child (absolute inset-0) rather than a background-image.
    // Treat a positioned img/canvas anywhere in this subtree as an
    // image backdrop; a gradient overlay on the same chain still wins.
    const positionedMedia = [...node.querySelectorAll("img, canvas")].some(
      (x) => {
        const p = getComputedStyle(x).position;
        return p === "absolute" || p === "fixed" || p === "relative";
      }
    );
    if (positionedMedia) imageSeen = true;
    const cs = getComputedStyle(node);
    // Do NOT split backgroundImage on commas: gradient color stops
    // themselves contain commas (oklab(0 0 0 / 0.6), rgba(0, 0, 0, 0)),
    // so a naive split chops the stops off the declaration.
    const bgImg = cs.backgroundImage || "none";
    const stops = [];
    if (bgImg !== "none") {
      if (bgImg.includes("url(")) imageSeen = true;
      if (bgImg.includes("linear-gradient") || bgImg.includes("radial-gradient")) {
        const s = gradientStopsFrom(bgImg);
        if (s.length) {
          hasGradient = true;
          stops.push(s);
        }
      }
    }
    const bg = parseContrastColor(cs.backgroundColor);
    if (bg && bg.a > 0) {
      acc = compositeColors(bg, acc);
      imageSeen = false; // opaque color covers anything beneath it
    } else if (stops.length) {
      // darkest stop first: worst-case for text over a photo
      const flat = stops.flat().sort((a, b) => contrastLuminance(a) - contrastLuminance(b));
      for (const s of flat) acc = compositeColors(s, acc);
    }
  }
  return { color: acc, imageSeen, hasGradient };
}

function contrastIsLarge(cs) {
  const size = parseFloat(cs.fontSize) || 0;
  const w = parseInt(cs.fontWeight, 10);
  const bold = w >= 700 || /bold/.test(cs.fontWeight);
  return size >= 24 || (size >= 18.66 && bold);
}

function contrastHasLowOpacity(el) {
  let n = el;
  while (n) {
    const o = parseFloat(getComputedStyle(n).opacity);
    if (!isNaN(o) && o < 0.6) return true;
    n = n.parentElement;
  }
  return false;
}

function contrastIsAriaHidden(el) {
  let n = el;
  while (n) {
    if (n.getAttribute && n.getAttribute("aria-hidden") === "true") return true;
    n = n.parentElement;
  }
  return false;
}

function contrastIsDisabled(el) {
  // WCAG 1.4.3 exempts inactive UI components. Skip text inside any
  // disabled control or aria-disabled region.
  let n = el;
  while (n) {
    if (n.getAttribute && n.getAttribute("aria-disabled") === "true") return true;
    if (n.disabled !== undefined && n.disabled === true) return true;
    n = n.parentElement;
  }
  return false;
}

function contrastCheckPlaceholder(el, acc, issues) {
  const ph = getComputedStyle(el, "::placeholder");
  if (!ph || !ph.color) return;
  const fg = parseContrastColor(ph.color);
  if (!fg) return;
  const fgOn = compositeColors(fg, acc.color);
  const ratio = contrastRatio(fgOn, acc.color);
  const need = contrastIsLarge(getComputedStyle(el)) ? 3 : 4.5;
  if (ratio < need) {
    issues.push({
      sel: contrastSelectorOf(el),
      what: "placeholder",
      ratio,
      need,
      color: ph.color,
      bg: JSON.stringify(acc.color),
    });
  }
}

function walkContrastTheme() {
  const root = document.documentElement;
  const issues = [];
  const skipped = { transient: 0, image: 0, aria: 0, empty: 0 };
  let checked = 0;
  const done = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  while ((node = walker.nextNode())) {
    const text = (node.textContent || "").trim();
    if (!text) {
      skipped.empty++;
      continue;
    }
    const el = node.parentElement;
    if (!el || SKIP_TAGS.has(el.tagName)) continue;
    if (done.has(el)) continue;
    done.add(el);
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      skipped.empty++;
      continue;
    }
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) === 0) {
      skipped.empty++;
      continue;
    }
    if (contrastIsAriaHidden(el)) {
      skipped.aria++;
      continue;
    }
    if (contrastIsDisabled(el)) {
      skipped.transient++;
      continue;
    }
    if (contrastHasLowOpacity(el)) {
      skipped.transient++;
      continue;
    }
    const acc = contrastBackdropOf(el, root);
    if (acc.imageSeen && !acc.hasGradient) {
      skipped.image++;
      continue;
    }
    const fg = parseContrastColor(cs.color);
    if (!fg) {
      skipped.empty++;
      continue;
    }
    const fgOn = compositeColors(fg, acc.color);
    const ratio = contrastRatio(fgOn, acc.color);
    const need = contrastIsLarge(cs) ? 3 : 4.5;
    checked++;
    if (ratio < need) {
      issues.push({
        sel: contrastSelectorOf(el),
        what: "text",
        ratio,
        need,
        color: cs.color,
        bg: JSON.stringify(acc.color),
        sample: text.slice(0, 40),
      });
    }
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA")
      contrastCheckPlaceholder(el, acc, issues);
  }
  return { issues, skipped, checked };
}
  return walkContrastTheme();
}
// ------------------------------------------------------------------
// Runner
// ------------------------------------------------------------------

let passes = 0;
let fails = 0;
let skips = 0;
const failures = [];

function logLine(kind, msg) {
  const tag = kind === "ok" ? "  PASS" : kind === "skip" ? "  SKIP" : "  FAIL";
  console.log(tag + " " + msg);
}

async function auditPage(page, baseUrl, route, theme) {
  const wantDark = theme === "dark";
  await page.emulateMedia({ colorScheme: theme });
  const resp = await page.goto(baseUrl + route, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  if (!resp || resp.status() === 404) {
    logLine("skip", `${route} (${theme}) -> route missing (404), skipped`);
    skips++;
    return;
  }
  // Wait for the ThemeProvider to apply the class, then for paint.
  await page
    .waitForFunction(
      (dark) => document.documentElement.classList.contains("dark") === dark,
      wantDark,
      { timeout: 8000 }
    )
    .catch(() => {});
  await page.evaluate(() => {
    // Freeze transitions (body fades 400ms on theme flip) and force
    // scroll-reveal content to its final state so it can be audited.
    const st = document.createElement("style");
    st.textContent =
      "*{transition-duration:0s !important;animation-duration:0s !important}.ei-reveal{opacity:1 !important;transform:none !important}";
    document.head.appendChild(st);
  });
  await page.waitForTimeout(1200);

  const result = await page.evaluate(contrastWalkTheme);
  const { issues, skipped } = result;
  for (const kind of Object.keys(skipped)) skips += skipped[kind];
  if (issues.length === 0) {
    logLine("ok", `${route} (${theme}) - ${result.checked} text surfaces checked`);
    passes++;
  } else {
    for (const i of issues) {
      const msg =
        `${route} (${theme}) ${i.sel} ${i.what} -> ${i.ratio.toFixed(2)}:1 ` +
        `need ${i.need}:1 (color ${i.color} on ${i.bg})` +
        (i.sample ? " `" + i.sample + "`" : "");
      failures.push(msg);
      logLine("fail", msg);
    }
    fails += issues.length;
  }
}

async function loginAdmin(page, baseUrl) {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(baseUrl + "/admin", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  // The submit button stays disabled until the CSRF token arrives.
  await page
    .waitForFunction(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn && !btn.disabled;
    }, { timeout: 10000 })
    .catch(() => {});
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  // LoginCard posts no callbackUrl, so NextAuth redirects to `/` on
  // success - NOT back to /admin. Waiting for a URL is therefore the
  // wrong signal (it was the original bug: the audit "bounced" even
  // though the login had succeeded). Two things matter here:
  //   1. Let the credentials navigation settle (POST -> 302 -> /)
  //      before any follow-up goto - an in-flight submit navigation
  //      interrupted by goto() aborts to chrome-error://chromewebdata
  //      and crashes the audit.
  //   2. Verify the authentication artifact itself: the session-token
  //      cookie must land.
  await page
    .waitForFunction(() => window.location.pathname !== "/admin", {
      timeout: 15000,
    })
    .catch(() => {});
  let session = false;
  for (let i = 0; i < 20; i++) {
    session = (await page.context().cookies()).some((c) =>
      /session-token/i.test(c.name)
    );
    if (session) break;
    await page.waitForTimeout(500);
  }
  if (!session) {
    throw new Error(
      `admin login failed for ${ADMIN_EMAIL}: no session cookie after submit. ` +
        "Set CONTRAST_ADMIN_EMAIL / CONTRAST_ADMIN_PASSWORD (or CONTRAST_CREDS_FILE " +
        "for a secrets-backed run) to a tenant-admin account that exists on the target."
    );
  }
  // With a valid session /admin renders the AdminShell console; a
  // failed or unauthorized login re-renders LoginCard. Distinguish the
  // two instead of trusting a redirect target.
  await page.goto(baseUrl + "/admin", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page
    .waitForSelector(".admin-topbar, .admin-nav-group", { timeout: 20000 })
    .catch(() => {});
  const authed = await page.evaluate(() =>
    Boolean(document.querySelector(".admin-topbar, .admin-nav-group"))
  );
  if (!authed) {
    throw new Error(
      `admin login: session cookie set but /admin did not render the console for ` +
        `${ADMIN_EMAIL}. The account may exist but lack the admin role.`
    );
  }
}

async function main() {
  let server = null;
  let base = BASE_URL;
  if (!base) {
    const buildId = path.join(repoRoot, ".next", "BUILD_ID");
    if (!fs.existsSync(buildId)) {
      console.error(
        "check-contrast: no build found (.next/BUILD_ID missing). Run `npm run build` first, or set BASE_URL."
      );
      process.exit(2);
    }
    const port = await findFreePort();
    // Windows cannot spawn .cmd shims directly; route through cmd.exe.
    // (shell:true + args triggers DEP0190 and unquoted concatenation.)
    const win = process.platform === "win32";
    const cmd = win ? process.env.ComSpec || "cmd.exe" : "npm";
    const args = win
      ? ["/d", "/s", "/c", `npm run start -- -p ${port}`]
      : ["run", "start", "--", "-p", String(port)];
    server = spawn(cmd, args, {
      cwd: repoRoot,
      stdio: "ignore",
      windowsHide: true,
    });
    base = `http://127.0.0.1:${port}`;
    // Wait for the server to answer.
    let answered = false;
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(base + "/");
        if (r.ok || r.status < 500) {
          answered = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!answered) {
      console.error(`check-contrast: spawned server on :${port} never answered`);
      process.exit(2);
    }
  }

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  // Clear any stored theme on every navigation so the emulated
  // prefers-color-scheme decides. (Runs as an init script because a
  // pre-goto evaluate hits localStorage on the about:blank document,
  // which throws SecurityError for an opaque origin.)
  await context.addInitScript(() => localStorage.removeItem("ei-theme"));
  const page = await context.newPage();

  try {
    for (const theme of THEMES) {
      for (const route of PUBLIC_ROUTES) {
        if (!inScope(route)) continue;
        await auditPage(page, base, route, theme);
      }
    }

    if (DO_ADMIN) {
      await loginAdmin(page, base);
      for (const theme of THEMES) {
        for (const route of ADMIN_ROUTES) {
          if (!inScope(route)) continue;
          await auditPage(page, base, route, theme);
        }
      }
      // Superadmin: the layout gate is a `superadmin_session` cookie;
      // set it so the operator console surfaces render for auditing.
      await context.addCookies([
        { name: "superadmin_session", value: "1", url: base + "/superadmin" },
      ]);
      for (const theme of THEMES) {
        for (const route of SUPERADMIN_ROUTES) {
          if (!inScope(route)) continue;
          await auditPage(page, base, route, theme);
        }
      }
    }
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  console.log(
    `\ncheck-contrast: ${passes} pass, ${fails} fail, ${skips} skipped surfaces (routes missing/transient/image-overlay/aria)`
  );
  if (failures.length) {
    console.error("\nWCAG AA contrast failures:");
    for (const f of failures) console.error("  " + f);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("check-contrast crashed:", e);
  process.exit(2);
});
