# Session Findings - 2026-07-06

Audit, best-practices, and roadmap document. Plain technical
reference; not subject to taste-skill marketing rules per
AGENTS.md carve-out. No emojis. No em-dashes. Monospace IDs.

Owner: opencode session. Operator is the human reviewer.

Source commit at session start: `d53e325` (v1.3.0 DEPLOYED).
Source commits logged in `git log --oneline -15`:
`d53e325` `3a62d82` `f51828a` `5165017` `88ce2af` `c0f5508`
`90f06f8` `a42f06c` `f36af2f` `08face0` `b9f8098` `8443084`
`b3ebd24` `e11a0e4` `bdd8995`.

---

## 1. State summary at session start

- Working tree clean at `d53e325`.
- Version: `package.json` `1.3.0`. `FREEZE-MARKER` stamped
  `v1.3.0 - 2026-07-01 (DEPLOYED)`.
- Live URL: `https://ethinterior.vercel.app`.
- All smokes green per 2026-07-02 logs:
  - `scripts/smoke-routes.mjs` 36/36
  - `scripts/smoke-render.mjs` 32/32
  - `scripts/smoke-projects-v2.mjs` 18/18 (live)
  - `scripts/smoke-admin-live.mjs` ALL GREEN
  - `scripts/smoke-api.mjs` 16/16 (two cold starts)
  - `scripts/smoke-role.mjs` 401/403/200 split holds
  - `scripts/smoke-coldstart.mjs` 5/5 (90s Vercel Hobby idle)
- Open workstream: `docs/SESSION-TODO.md` TS-006
  (Make-everything-editable admin scope), plan drafted at
  `docs/PLAN-EDITABLE.md`, awaiting operator pre-confirmations
  before code ships.

---

## 2. Findings (architecture + state audit)

### 2.1 Route group split is correct

- `src/app/layout.tsx:55-75` is the root layout: providers
  (SessionProvider -> ThemeProvider -> I18nProvider),
  fonts (Geist Sans + Geist Mono + Cormorant Garamond
  display serif), GA4, body chrome.
- `src/app/(public)/layout.tsx:8-24` adds the marketing
  chrome (Navbar, Footer, LicenseBanner, SmoothScroll,
  GrainOverlay, CursorFollower). Lives inside the route
  group so admin / superadmin do NOT inherit it.
- `src/app/superadmin/layout.tsx:9-26` is its own shell
  driven by the `superadmin_session` cookie.
- No `src/app/admin/layout.tsx`; admin routes render
  their own `<section className="pt-24 md:pt-28 pb-24">`
  chrome inline.

### 2.2 Runtime database modes

`src/lib/pg.ts` runs three modes selected by environment:

| Mode | Trigger | Behaviour |
|---|---|---|
| Postgres | `DATABASE_URL` set | `pg.Pool` (max 10, idle 30s). `ensureMigrated()` runs `supabase-bootstrap.sql` under `pg_advisory_xact_lock(7421971972240957)` on first cold start. |
| Local SQLite | no `DATABASE_URL` + no `VERCEL`/`VERCEL_ENV` | Opens `data/etihad.db` via `better-sqlite3`. Applies `SQLITE_FALLBACK_DDL` from `src/lib/sqlite-fallback-ddl.ts`. Used by local dev. |
| Vercel hot-copy | no `DATABASE_URL` + `VERCEL` set | `/tmp/etihad-<region>.db` hot-copy. Read-only semantics: writes return `{ __ephemeral_writable: true }` so mutation routes can detect the failure loudly. |

`src/lib/db.ts` is a legacy shim. `openDb()`, `openReadonlyDb()`,
`getDrizzle()`, `getSqliteDrizzle()`, `openPostgres()`, and the
`db` proxy all throw at runtime with a message directing callers
to `@/lib/pg`. Re-exports `isPostgres` from `pg.ts` for type-only
import sites. Still-listed callers (carry-forward):

- `src/lib/tenant-brand.ts` (`openReadonlyDb()` shim). Returns
  `[]` in prod -> falls through to FALLBACK brand. Slated for
  port to `pg.ts` in a follow-up - tracked at finding 2.7.
- `src/lib/settings.ts` (`db.select().from(settings)` proxy).
  Throws at runtime, caught by try/catch, returns `DEFAULTS`.
  No live impact. Should port to `pg.ts` when TS-006 Phase A
  ships (settings editor needs a real read path).
- `src/lib/media.ts` opens `data/etihad.db` with
  `better-sqlite3` directly (NOT routed through `pg.ts`).
  Broken for the Postgres runtime. Slated for replacement -
  tracked at finding 2.7.

### 2.3 Tier-gate is correctly split

`src/lib/license-gate.ts` exports:

- `requireLicense(gate)` - license-only. Gates = `read-public`
  (short-circuit ok), `admin` (license check only). Used by
  public reads and license/admin read paths.
- `requireAdminSession()` - license + NextAuth session.
  Returns `{ ok: true, role }` or
  `{ ok: false, response: NextResponse(401) }`. The 2026-06-29
  auth-gap close-out wired this on `/api/pages` POST,
  `/api/pages/[id]` PUT/DELETE, `/api/pages/[id]/blocks` PUT.
- `requireSuperadmin()` - license + session + role ===
  `"superadmin"`. Admin role gets 403 with
  `{ reason: "This route is superadmin-only." }`. Anon gets 401.
  Wired on `/api/admin/license` POST (`src/app/api/admin/license/route.ts`)
  and `/api/admin/demo-reset` POST (`src/app/api/admin/demo-reset/route.ts`).

Probe endpoint: `/api/admin/whoami` exposes role via NextAuth
`getServerSession`. Admin -> 403. Superadmin -> 200.

### 2.4 CRUD admin shape is consistent across entities

Per `src/app/admin/`:

- `/admin/<entity>` renders the index (list + search + sort +
  per-row Publish + Delete).
- `/admin/<entity>/[id]` renders the editor. `id` accepts the
  literal `"new"` or numeric. `id === "new"` -> blank form
  (POST); numeric -> server-side `pgOne` row look-up +
  `<AdminXForm initial={row}>`.
- API at `/api/<entity>` (GET, POST) and `/api/<entity>/[id]`
  (GET, PUT, DELETE). Every fetch from the client sets
  `credentials: "include"` so NextAuth CSRF + session cookies
  ride across cross-site requests.

Entities shipping this shape: `projects`, `journal`,
`testimonials`, `team`, `pages` (pages also has the
`/api/pages/[id]/blocks` PUT bulk-update endpoint).

### 2.5 Snake_case <-> camelCase boundary discipline

`pgOne` and `pgMany` return rows with snake_case column names
(`description_json`, `model_3d`, `before_image`, `after_image`,
`is_published`, `cover_image`, `content_json`, `author_name`).
Admin form useState initializers must read both shapes. The
canonical pattern after the 2026-06-30 v1.2.0 fix:

```ts
const [descriptionJson, setDescriptionJson] = useState(
  initial?.description_json ?? initial?.descriptionJson ?? ""
);
```

Live in `src/components/admin/AdminProjectForm.tsx` and
`src/components/admin/AdminJournalForm.tsx`. Adding a new admin
form must follow this pattern or the form will silently save
defaults on every save and wipe the rich-text content.

### 2.6 Block editor schema layer

`src/components/admin/block-schemas.ts` declares a `BlockSchema`
per block type from `src/cms/blocks/registry.ts`. Field kinds:
`text`, `longtext`, `number`, `select`, `richtext`, `media`,
`mediaGallery`, `toggle`. `ArrayEditor` wraps each item with
up/down/remove/add. Adding a new block type is a two-line change:
one entry in `registry.ts`, one matching `BlockSchema` entry in
`block-schemas.ts`. No codegen.

The 14 registered block types per `src/cms/blocks/registry.ts`:
`hero`, `principles`, `services`, `selected-work`, `process`,
`testimonials`, `journal-preview`, `spatial-walkthroughs`,
`closing-cta`, `rich-text`, `image`, `image-grid`, `divider`,
`spacer`.

### 2.7 Carry-forwards not blocked by TS-006

| Item | File | Status | Action |
|---|---|---|---|
| Tenant-brand.ts still using legacy `db.ts` shim | `src/lib/tenant-brand.ts` | Returns `[]` in prod, falls through to FALLBACK brand | Port to `pg.ts` in a Phase 7 follow-up post-TS-006 |
| media.ts SQLite-only shim | `src/lib/media.ts` | Broken for the Postgres runtime | Replacement needed before deploying a media-library smoke that exercises Postgres |
| smoke-routes does not include `/projects-v2` | `scripts/smoke-routes.mjs` | The v2 probe runs as `smoke-projects-v2.mjs` | Future session can extend smoke-routes to 37 routes |
| Operator-uploaded before/after image defaults | demo seed | Content decision, not code | Operator-only |
| `src/components/AdminProjectForm.tsx` (root-level orphan) | `src/components/AdminProjectForm.tsx` | Zero live importers per grep; the canonical one is `src/components/admin/AdminProjectForm.tsx` imported at `src/app/admin/projects/[id]/page.tsx:2` | Deletion candidate (TS-006 plan or follow-up) |

### 2.8 Config precedence bug (fixed this session)

`next.config.ts` (empty 7-line stub) and `next.config.mjs` (the
real config with `images.remotePatterns` + security headers)
both existed. Next 16's config-loader accepts `.ts` ahead of
`.mjs`, so the empty `.ts` was silently winning. Effect: the
`images.remotePatterns` block (allowing `images.unsplash.com`
+ `ethinterior.vercel.app`) and the security headers
(X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
Permissions-Policy) were not applied at runtime.

Fix this session: deleted `next.config.ts`. `next.config.mjs` is
now the singular config. `FREEZE-MARKER` lists
`next.config.mjs` in the frozen manifest; `next.config.ts` was
not listed and was added before the freeze marker was rolled
forward to capture the .mjs form.

### 2.9 `/projects-v2` route acceptance pattern

The `/projects-v2` ship pattern is the template for future
post-deploy live verification:

1. `docs/PLAN-PROJECTS-V2.md` drafts scope split before code.
2. New route lives at `src/app/(public)/projects-v2/page.tsx`
   with components at `src/components/projects-v2/`. Live
   routes are untouched.
3. `scripts/smoke-projects-v2.mjs` carries 18 assertions
   against the rendered HTML: hero headline, no picsum, no
   // TODO markers, no chrome-pill eyebrows on numbered
   sections, no terminal periods on H2s, exactly one
   btn-primary on hero, no Hero address print,
   Testimonial echoes DB row or generic Studio line.
4. Acceptance: BASE_URL probe green + smoke-routes 36/36 +
   smoke-render 32/32 stay green (v1 untouched).
5. Live URL probe after Vercel rebuild: `smoke-projects-v2.mjs`
   18/18 PASS.
6. CONTEXT.md `2026-07-02 - /projects-v2 ship` entry records
   the outcome.

### 2.10 Smoke harnesses inventory

| Smoke | Purpose | Current |
|---|---|---|
| `smoke.mjs` | Phase A two-pool reopen durability | green |
| `smoke-api.mjs` | Phase 8 cold-start round-trip (login + POST 4 entities + GET + DELETE) | 16/16 green |
| `smoke-admin-live.mjs` | Live admin login + 19+ CRUD writes per entity | ALL GREEN |
| `smoke-coldstart.mjs` | 90s Vercel Hobby idle write survival | 5/5 green |
| `smoke-durability.mjs` | Same-container row round-trip | 5/5 green |
| `smoke-media-e2e.mjs` | /api/media/list + /api/media/upload round-trip | green |
| `smoke-mobile.mjs` | Mobile-viewport guarantees | green |
| `smoke-phase2.mjs` | Storage abstraction gating (no-auth) | 4/4 green |
| `smoke-phase5.mjs` | Project CRUD no-auth gating | 6/6 green |
| `smoke-phase6.mjs` | Journal CRUD + slug-resolver self-check | 11/11 green |
| `smoke-phase7.mjs` | Testimonials + team CRUD no-auth | 12/12 green |
| `smoke-projects-v2.mjs` | /projects-v2 18-assertion render probe | 18/18 green (live) |
| `smoke-render.mjs` | Home GSAP markers + hero copy shape + slider assertion | 32/32 green |
| `smoke-role.mjs` | 401/403/200 split on /api/admin/{license,demo-reset,whoami} | green |

Each new surface ships with a new smoke. The pattern: no-auth
gating probe (401 on anonymous mutate) PLUS role-gated probe
(403 for admin on superadmin routes) PLUS live URL probe after
Vercel rebuild.

### 2.11 White-label + license surface

- `data/studio-brand.json` overrides the hardcoded `DEFAULTS`
  in `src/lib/studio-brand.ts:1-69`. Cached at module scope.
  Used by all `projects/` and `projects-v2/` pages.
- `data/theme.distro.json` is the per-tenant override applied
  by `scripts/apply-distro.mjs`. Called in `postinstall` for
  the studio tenant.
- License: HMAC-signed offline `data/license.json`. Verified
  at request time via `src/lib/license.ts` +
  `src/lib/license-key.test.ts`. Tier matrix (`personal` vs
  `business`) controls 3D + multilingual via `hasFeature()`.
- Buyers without a distro see neutral defaults
  ("Your Studio", placeholders). Removing the studio distro
  row repaints the demo with `Your Studio` defaults.
- Public reads stay open without a license
  (`requireLicense("read-public")` short-circuits). Admin
  and 3D return `423` on tier-missing.

---

## 3. Session changes (this session)

### 3.1 next.config.ts deleted

`next.config.ts` deleted (the empty stub). `next.config.mjs`
is now the singular config. `images.remotePatterns` and
security headers (X-Frame-Options, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy) load correctly.

### 3.2 Irrelevant-file candidates (listed only; no deletions)

Per operator call "List only, no deletions" this session.
Candidates for a follow-up cleanup pass:

| Candidate | Size | Tracking | Why candidate |
|---|---|---|---|
| `.next/` | ~47 MB, 24 entries | gitignored, untracked | Build cache, regenerates on `next build` |
| `dev.log` | 0 bytes | gitignored, untracked | Empty process leftover from a prior `next dev` |
| `dev.pid` | 14.8 KB | gitignored, untracked | Process ID snapshot; no live process |
| `src/components/AdminProjectForm.tsx` | root-level | TRACKED | Zero live importers; canonical one at `src/components/admin/AdminProjectForm.tsx`. Deletion touches a frozen path - needs operator approval. |

All three untracked candidates are gitignored, so deletion
touches zero tracked files. `src/components/AdminProjectForm.tsx`
is git-tracked and lives under the freeze marker's `src/components/**`
boundary; deletion needs operator approval and should ship with
a TS-ID.

---

## 4. Graphify status

### 4.1 Cross-check against `https://github.com/Graphify-Labs/graphify`

Upstream repo at session time:

- Branch: `v8`. Commit count: 988 across the v8 branch.
- Package: `graphifyy` on PyPI (double-y). Other `graphify*`
  packages on PyPI are NOT affiliated per upstream README.
- CLI binary name: `graphify`.
- Latest tag at fetch time: `v8` (the branch itself is the
  release line).
- Repo carries: folders `docs/`, `graphify/`, `tests/`,
  `tools/`, `worked/`. Top-level files include `AGENTS.md`,
  `ARCHITECTURE.md`, `BENCHMARKS.md`, `CHANGELOG.md`,
  `Dockerfile`, `LICENSE`, `pyproject.toml`, `uv.lock`.
- YC S26 company. Discord + GitHub Sponsors linked.
- README.doc summary: "AI coding assistant skill (Claude Code,
  Codex, OpenCode, Cursor, Gemini CLI, and more). Turn any
  folder of code, SQL schemas, R scripts, shell scripts, docs,
  papers, images, or videos into a queryable knowledge graph."

### 4.2 Install prerequisites (per upstream README)

Required:

- Python 3.10+. Check: `python --version`.
- `uv` (recommended) OR `pipx` (alternative). Check:
  `uv --version`.
- Windows quick install: `winget install astral-sh.uv`.

Install command (recommended):

```
uv tool install graphifyy
```

Alternatives:

```
pipx install graphifyy
pip install graphifyy   # may need PATH setup
```

Register skill with OpenCode (this repo's setup):

```
graphify opencode install
```

This writes:
- An `AGENTS.md` Graphify section.
- A `.opencode/plugins/graphify.js` hook.
- A `.opencode/opencode.json` plugin registration.

All three are present in the repo from a prior session, so the
skill registration survived across agent sessions.

### 4.3 Local install gap

- This session's environment: Windows PowerShell 5.1,
  `npm.cmd` callable, `py` launcher present (Python 3.14.6),
  `npx tsc` works (5.9.3).
- `uv` is NOT installed: `where.exe uv` returns nothing.
  `winget install astral-sh.uv` not run on this machine.
- `graphifyy` package is NOT installed in Python 3.14.6:
  `py -m pip show graphifyy` -> "Package(s) not found".
- No `graphify*` binary on PATH. Scanned:
  `$env:USERPROFILE\.local\bin`,
  `$env:USERPROFILE\AppData\Local\uv`,
  `$env:USERPROFILE\AppData\Roaming\uv`,
  `$env:USERPROFILE\.cargo\bin`,
  `$env:APPDATA\Python\Scripts`,
  `$env:LOCALAPPDATA\Programs\Python\Python*\Scripts`,
  plus every dir on PATH - zero matches.
- No LLM key environment variables set: `OPENAI_API_KEY`,
  `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`,
  `GRAPHIFY_LLM_KEY` all unset. Confirmed via direct
  `$env:<NAME>.Length` probe.

### 4.4 Decision

`graphify .` (full semantic re-extraction) and
`graphify update .` (AST-only rebuild) both require the
`graphify` CLI on PATH. Neither can run this session.

The `graphify-out/` artifacts in the repo (`graph.json`,
`graph.html`, `GRAPH_REPORT.md`, `manifest.json`,
`.graphify_labels.json`, `.graphify_root`) are checked-in
from a prior session on a different machine (per 2026-06-25
CONTEXT entry). They are stale but persisted; codebase
questions can still be answered using the stale graph (with a
caveat that the AST churn since `97f228eb` is NOT reflected
there - the prior 2026-06-26 entry already noted the refresh
to 938 nodes / 1251 edges / 93 communities).

For this session: no `graphify update .` runs. Next session
with `uv` installed should run:

```
winget install astral-sh.uv
uv tool install graphifyy
uv tool update-shell
# open a new terminal, then in the repo:
graphify update .
```

This rebuilds `graphify-out/` AST-only from the current
working tree. No LLM key needed. The full semantic
re-extraction (`graphify .`) is opt-in per session and
requires one of:
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`,
`MOONSHOT_API_KEY`, `DEEPSEEK_API_KEY`, `AZURE_OPENAI_*`,
`AWS_*` (Bedrock uses IAM, no API key), or a running
Ollama instance at `OLLAMA_BASE_URL`. None are configured.

---

## 5. Best practices (extracted from the repo)

### 5.1 Session protocol

Per `AGENTS.md`:

1. Read `docs/CONTEXT.md` end-to-end before touching anything.
2. For any frontend decision, also read the taste-skill file.
3. Run `npm run verify:deploy` before any deploy.
4. Do not use emojis or em-dashes anywhere visible to the user.
5. End every session by appending to the "Last session log"
   section of `docs/CONTEXT.md`.
5a. Before ending the session, run `npm run graphify:update`
    so the knowledge graph reflects every code change made
    this session. (Skipped this session per finding 4.4.)
5b. If the user types `/graphify`, invoke the skill tool with
    `skill: "graphify"` before answering, and refresh the
    graph first if it has not been touched in 5+ commits
    since HEAD.
5c. Read `docs/SESSION-TODO.md` at the start of every
    session. For each entry with `@todo` / `@inprogress` /
    `@blocked`, decide: close, continue, split, or escalate.
    End the session by appending a session-end summary.

Every shipped change is traceable through a TS-ID that closes
on the matching commit OR carries a justification line in an
active block. `docs/SESSION-TODO.md` is the structured gate;
`docs/CONTEXT.md` §9 is the prose narrative.

### 5.2 Tier-gate pattern

```
requireLicense("read-public") -> short-circuit ok
requireLicense("admin")      -> license check only
requireAdminSession()        -> license + NextAuth session
requireSuperadmin()          -> license + session + role === "superadmin"
```

Response contract:

- Anon -> 401 (no session).
- Authenticated admin on a superadmin route -> 403 with
  `{ reason: "This route is superadmin-only." }`.
- Authenticated admin on an admin route -> 200.
- Authenticated superadmin -> 200.

Use `/api/admin/whoami` as the role probe endpoint. Admin -> 403,
superadmin -> 200. `scripts/smoke-role.mjs` is the durable
assert against this split.

### 5.3 CRUD admin shape

Per entity:

- `/admin/<entity>` - index. Client component. Search, sort,
  per-row Publish toggle (PUT), Edit deep link, View-site
  deep link, Delete with confirm (DELETE).
- `/admin/<entity>/[id]` - editor. Server route. `id === "new"`
  -> blank form (POST). Numeric `id` -> server-side
  `pgOne("SELECT * FROM <table> WHERE id=$1")` +
  `<AdminXForm initial={row}>`. `notFound()` for missing ids.
- API at `/api/<entity>` (GET, POST) and `/api/<entity>/[id]`
  (GET, PUT, DELETE).
- Every client fetch sets `credentials: "include"` so
  NextAuth CSRF + session cookies ride across.

### 5.4 Snake_case <-> camelCase hydration

`pgOne` and `pgMany` return snake_case column names. Admin
form useState initializers must read both shapes:

```ts
const [descriptionJson, setDescriptionJson] = useState(
  initial?.description_json ?? initial?.descriptionJson ?? ""
);
```

Failure pattern (silent bug): initialize from one shape only
-> form saves defaults on every save -> rich-text content +
before/after images + model URL + publish flag get wiped
silently.

### 5.5 Block editor schema layer

Adding a block type:

1. Add an entry in `src/cms/blocks/registry.ts` with default
   seed data.
2. Add a matching `BlockSchema` entry in
   `src/components/admin/block-schemas.ts` with `Field[]`
   (kinds: text, longtext, number, select, richtext, media,
   mediaGallery, toggle) and optional `ArraySchema`.

`BlockEditor` renders the schema-driven form. Adding a new
field to an existing block is one line in
`block-schemas.ts`. No codegen, no schemas-to-migrate.

### 5.6 Smoke harnesses

11+ smokes. Add a new one per new surface:

- No-auth gating probe (401 on anonymous mutate).
- Role-gated probe (403 for admin on superadmin routes).
- Live URL probe after Vercel rebuild.
- Cold-start round-trip when persistence is the change
  (login -> POST -> assert visible on a fresh /api GET).

The pattern is the `/projects-v2` acceptance gate
(finding 2.9). New smokes assert against rendered HTML, not
just status codes - the `safeParse` regression on the home
page (2026-06-28 fix) slipped past every API smoke because
the page returned 200 with empty `<h1>`.

### 5.7 White-label + license discipline

- Brand copy lives in `data/studio-brand.json` (or
  `data/theme.distro.json` for per-tenant override).
  Never hardcode brand copy in a component.
- `src/lib/studio-brand.ts` reads + caches at module scope.
  Override surface is the JSON file; `DEFAULTS` is the
  fallback.
- License is HMAC-signed offline. `verifySignature()` falls
  back to HMAC `testVerify` from `license-key.test.ts` when
  `LICENSE_PUBLIC_KEY` is unset, so a fresh install with an
  HMAC-signed license verifies without an RSA keypair.
- `hasFeature()` reads tier (`personal` vs `business`).
  Missing tier returns `423` on 3D + multilingual routes.

### 5.8 Documentation carve-out

`FREEZE-MARKER` documentation carve-out lists files that are
NOT under the buyer-visible freeze and can be edited freely:

- `CHANGELOG.md`, `OPERATOR.md`, `DEPLOY.md`, `INSTALL.md`,
  `README.md`, `SHIP.md`, `LICENSE.md`,
  `AGENT_BEST_PRACTICES.md`, `docs/feature-decisions.md`
- `docs/CONTEXT.md` (session continuity harness)
- `docs/CLIENT_HANDOFF.md`, `docs/OPERATOR_QUICKREF.md`,
  `docs/SALES_NOTES.md`, `docs/envato-sales-brief.md`,
  `docs/theme-distro.schema.md`,
  `docs/theme-distro.example.json`, `docs/v112-plan.md`,
  `docs/PLAN-EDITABLE.md`, `docs/PLAN-PROJECTS-V2.md`,
  `docs/PROJECTS-AUDIT.md`, `docs/SESSION-TODO.md`,
  `docs/SESSION-FINDINGS-2026-07-06.md` (this file),
  `docs/screenshot-bag.md`, `docs/thumbs/**`
- `.env.example`, `.env.local.example`
- `FREEZE-MARKER` (this file)
- `AGENTS.md`, `CLAUDE.md`

Code changes under `src/app/**`, `src/components/**`,
`src/lib/**`, `src/cms/**`, `scripts/migrate.mjs`,
`scripts/seed-pages.mjs` need operator approval before code
ships. The next.config.ts delete this session was a carve-out
exception: the frozen manifest lists `next.config.mjs`
(preserved) but did NOT list `next.config.ts` (the empty stub
added before the freeze roll).

### 5.9 Skill rules (the hard directives)

Per `docs/CONTEXT.md` §3 + AGENTS.md:

| Rule | Reason |
|---|---|
| No emojis anywhere in code, comments, chat, or visible text. | Hard directive from project owner. |
| No em-dashes (`-`) in any user-visible text. | Top LLM tell. |
| No `Inter` as default font. Use `Geist`, `Outfit`, `Cabinet Grotesk`, `Satoshi`, or project-appropriate serif (Cormorant Garamond in this repo) only when justified. | Skill rule. |
| No 3-column equal feature cards for marketing pages. | Skill rule. |
| `prefers-reduced-motion` for anything above static. | Skill rule + a11y. |
| One accent color, locked per page. | Skill rule. |
| One corner-radius scale, locked per page. | Skill rule. |
| Real images, not div-based fake screenshots. | Skill rule. |
| `min-h-[100dvh]`, never `h-screen`. | Skill rule. |
| Marketing pages: max 1 eyebrow per 3 sections. | Skill rule. |
| Marketing pages: never center hero unless editorial. | Skill rule. |

For operator/admin surfaces the marketing-page-specific rules
(hero discipline, bento repetition, eyebrow count) do not
apply. Form density, monospace IDs, clear labels - those do.

---

## 6. Roadmap

### 6.1 Immediate (this session, completed)

- `next.config.ts` deleted (finding 2.8).
- This findings doc written.
- `docs/CONTEXT.md` §9 session log appended.
- `docs/SESSION-TODO.md` TS-006 amendments entry appended.
- `npm run verify:deploy` re-run after the .ts delete.

### 6.2 TS-006 single v1.4.0 release

Per operator confirmations this session:

- Single v1.4.0 release (Phase A-D + Phase E + Phase F
  collapsed into one ship).
- Phase B (site-identity editor) includes `logo_url` +
  `favicon_url` in addition to the four default fields
  (`brand_name`, `tagline`, `accent_mode`, `footer_credit`).
- Phase A-D admin routes emit `appendAudit` entries on
  writes (superadmin precedent is in
  `src/lib/operator-store.ts`).
- Remaining defaults preserved: tier-gate preserved, soft-
  delete newsletter, read-with-advance install, two-pane
  settings editor.

Ship gates per phase:

#### Phase A - Settings editor

- `src/app/api/settings/[key]/route.ts` (new): GET, PUT, DELETE
  for one settings key. `requireAdminSession`.
- `src/app/admin/settings/page.tsx` (new): server passthrough
  mounting `<AdminSettings>`.
- `src/components/admin/AdminSettings.tsx` (new): two-pane
  key/value editor.
- `scripts/smoke-settings.mjs` (new): no-auth gating +
  admin/superadmin CRUD probe + audit-log assertion.
- `appendAudit` on every put/delete.

#### Phase B - Site identity editor

- `src/app/api/site-identity/route.ts` (new): GET
  (admin-gated for editor), PUT (admin-gated). Single-row
  upsert.
- `src/app/admin/site-identity/page.tsx` (new): server
  passthrough.
- `src/components/admin/AdminSiteIdentity.tsx` (new): single
  form. Fields: `brand_name`, `tagline`, `accent_mode`
  (select: light | dark | auto), `footer_credit`,
  `logo_url`, `favicon_url`.
- `scripts/smoke-site-identity.mjs` (new).
- `appendAudit` on every put.

#### Phase C - Newsletter subscribers viewer

- `src/app/api/newsletter-subscribers/route.ts` (new): GET
  (admin-gated). Returns id + email + created_at. DELETE
  on `/api/newsletter-subscribers/[id]` (soft-delete via
  `is_active` flag).
- `src/app/admin/newsletter/page.tsx` (new).
- `src/components/admin/AdminNewsletterList.tsx` (new):
  virtualised list (max 500 visible; older paginated),
  search by email substring, per-row deactivate (DELETE).
- `scripts/smoke-newsletter.mjs` (new).
- `appendAudit` on every deactivate.

#### Phase D - Install metadata viewer

- `src/app/api/install/stamp/route.ts` (verify shape,
  extend with PUT to advance the stamp).
- `src/app/admin/install/page.tsx` (new).
- `src/components/admin/AdminInstallView.tsx` (new):
  read-only stamp display + "Advance stamp" button.
- `scripts/smoke-install.mjs` (new): no-auth gating +
  PUT/GET role check.
- `appendAudit` on every advance. Superadmin `rotate-hmac`
  stays on `/superadmin`.

#### Phase E - Consolidation cold-start smoke

- Single cold-start round-trip across all editable surfaces:
  login -> create + edit + delete on each new endpoint ->
  assert rows survive an admin-process restart
  (cross-container) -> audit_log entries present for
  every mutation.

#### Phase F - Final close-out

- `package.json` 1.3.0 -> 1.4.0.
- `CHANGELOG.md` v1.4.0 entry with phase-by-phase callout.
- `FREEZE-MARKER` v1.4.0 increment.
- `docs/CONTEXT.md` §9 entry.
- `docs/SESSION-TODO.md` TS-006-A through TS-006-F
  child rows stamped `@done`.

### 6.3 Carry-forwards not blocked by TS-006

| Carry-forward | Audit trace | Action |
|---|---|---|
| `smoke-routes.mjs` extend to 37 routes (add `/projects-v2`) | TS-004 outcome note | Future session |
| `src/lib/tenant-brand.ts` port to `pg.ts` | finding 2.7 | Phase 7 post-TS-006 |
| `src/lib/media.ts` SQLite-only shim broken on Postgres | finding 2.7 | Replace before any media-smoke against Postgres |
| `src/components/AdminProjectForm.tsx` root-level orphan | finding 2.7 | Deletion candidate; needs operator approval (touches `src/components/**` freeze marker) |
| Operator-uploaded before/after image defaults | TS-006 outcome | Content decision, not code |
| Rotate `ADMIN_PASSWORD` / `SUPERADMIN_PASSWORD` on Vercel | 2026-06-27 chat | Operator offline action; docs left as history per operator call this session |
| Confirm `DATABASE_URL` still set on Vercel | Phase 1 acceptance | Operator check |
| Confirm `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set on Vercel | Phase 2 acceptance | Operator check |

### 6.4 Graphify follow-up

- Install `uv` on this machine: `winget install astral-sh.uv`.
- Install Graphify CLI: `uv tool install graphifyy`.
- Update PATH: `uv tool update-shell`, then open a new
  terminal.
- In the repo: `graphify update .` (AST-only, no LLM key
  needed, no API cost) - this rebuilds `graphify-out/` to
  reflect the next.config.ts delete + this findings doc +
  the CONTEXT/SESSION-TODO appends.
- For full semantic re-extraction (`graphify .`): set one of
  `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`,
  `MOONSHOT_API_KEY`, `DEEPSEEK_API_KEY`, `AZURE_OPENAI_*`,
  or run an Ollama instance at `OLLAMA_BASE_URL` and pass
  `--backend ollama`. None are configured this session.

### 6.5 v1.4+ future-version asks

Per `AGENT_BEST_PRACTICES.md` 3-buyer-counter rule and
`docs/feature-decisions.md` log:

| Date | Decision | Counter | Buyer | Reason |
|---|---|---|---|---|
| 2026-06-18 | ONE-OFF | 1 | alpha-test | "Can we export pages as PDF for client decks?" - single buyer pre-launch |
| 2026-06-18 | ONE-OFF | 1 | alpha-test | "I'd like to add a guest bookings table" |
| 2026-06-18 | ONE-OFF | 1 | alpha-test | "Center the hero, the asymmetric split looks weird" |

Nothing promotes to MERGE until 3 buyers ask and the 4-week
window since v1.0 ship has elapsed. All three are at counter 1
since 2026-06-18 - none eligible for merge in v1.4.

---

## 7. TS-006 plan amendments (recorded for next execution session)

These amendments to `docs/PLAN-EDITABLE.md` §4 are confirmed
by the operator this session and recorded here for the next
TS-006 execution session:

1. Approved scope = all four phases A-D as one v1.4.0 release
   (single ship).
2. Tier-gate preservation confirmed (yes - default).
3. Settings editor shape = two-pane (yes - default).
4. Site identity editor fields = the four default fields
   (`brand_name`, `tagline`, `accent_mode`, `footer_credit`)
   PLUS `logo_url` + `favicon_url` (operator override
   confirmed this session).
5. Newsletter subscribers soft-delete (yes - default).
6. Install metadata read-with-advance (yes - default).
7. Audit-log entries on `/admin` writes (operator override
   confirmed this session - default was no).
8. v1.4.0 single release (yes - per q1).

---

## 8. Acceptance contract for the next session

Ship-ready state when TS-006 Phase A-F all pass:

- `npm run verify:deploy` 19/19.
- `npx tsc --noEmit` exit 0.
- `npm run build` green.
- All previously-passing smokes still pass:
  - `smoke-routes.mjs` 36/36 (extend to 37 with `/projects-v2`
    optional this session).
  - `smoke-render.mjs` 32/32.
  - `smoke-admin-live.mjs` ALL GREEN.
  - `smoke-api.mjs` 16/16.
  - `smoke-role.mjs` 401/403/200 split holds.
  - `smoke-coldstart.mjs` 5/5.
- New smokes per phase: `smoke-settings.mjs`,
  `smoke-site-identity.mjs`, `smoke-newsletter.mjs`,
  `smoke-install.mjs`.
- Phase E consolidation: one cold-start round-trip across all
  four new endpoints with audit_log assertions per mutation.
- Live probes:
  - `/admin/settings` 200 with all rows visible.
  - `/admin/site-identity` 200 with the six fields editable.
  - `/admin/newsletter` 200 with subscriber rows visible.
  - `/admin/install` 200 with stamp display + Advance button.
- Anonymous PUT/DELETE on `/api/settings/[key]`,
  `/api/site-identity`, `/api/newsletter-subscribers/[id]`,
  `/api/install/stamp` -> 401.
- Authenticated admin on those routes -> 200 (with audit_log
  row written).
- Authenticated superadmin on those routes -> 200.
- `package.json` 1.4.0. `CHANGELOG.md` v1.4.0 entry.
  `FREEZE-MARKER` v1.4.0 increment.

---

## 9. Session-close protocol checklist

End of session, the next agent should:

1. Run `npm run verify:deploy` (19/19 green expected after
   this session's next.config.ts delete).
2. Run `npx tsc --noEmit` (exit 0 expected).
3. Append a `2026-07-06 - findings doc + next.config
   precedence fix` entry to `docs/CONTEXT.md` §9.
4. Append the TS-006 amendments entry to
   `docs/SESSION-TODO.md` active todos block.
5. Run `graphify update .` - if `uv` + `graphifyy` are
   installed by then. Otherwise document the gap (this file
   finding 4.4).
6. The single code change this session is the `next.config.ts`
   deletion. The single doc addition is this file plus the
   CONTEXT/SESSION-TODO appends. No TS-006 code ships.
7. Single commit per operator call (if committing):
   `chore(config): delete empty next.config.ts stub + add
   session findings doc + TS-006 amendments`.

---

End of document.
