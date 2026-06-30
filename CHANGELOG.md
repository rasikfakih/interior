CHANGELOG

# Etihad Interiors Theme - Built For Sale + Resell

## v1.2.0 - 2026-06-30 (DEPLOYED) - Production-grade persistence + admin operator polish

### Status

Shipped to `ethinterior.vercel.app` on top of v1.1.2. The
buyer-visible chrome is byte-equivalent; the durability story
is the operative change.

### What landed

- Production-grade persistence: Postgres-first runtime with
  `DATABASE_URL` env on Vercel. SQLite hot-copy
  (`/tmp/etihad-{region}.db`) retained as the no-DATABASE_URL
  branch so local dev and buyers who self-host without Postgres
  still boot from a bundled SQLite. Cross-coldstart durability
  proven by `scripts/smoke-api.mjs` (writes survive two cold
  fetches) and `scripts/smoke-coldstart.mjs` (90-second Vercel
  Hobby idle window).
- Tiered role gate: `requireSuperadmin()` on
  `/api/admin/license` POST + `/api/admin/demo-reset` POST.
  `/api/admin/whoami` exposes role. Admin role gets 403 from
  superadmin-only routes with reason "This route is
  superadmin-only." Anon still gets 401. Smoke harness:
  `scripts/smoke-role.mjs`.
- Admin write-paths now persist. Snake_case row hydration across
  `description_json` / `before_image` / `after_image` /
  `model_3d` / `is_published` / `cover_image` / `content_json` /
  `author_name`. `AdminProjectForm` and `AdminJournalForm`
  initialize from `r.description_json ?? r.descriptionJson`,
  camel-or-snake both acceptable going forward.
- Read-side fix: `RichTextRenderer` accepts string OR object
  for the `json` prop. Postgres JSONB driver returns parsed
  object; the renderer no longer JSON.parse-throws on object
  input and silently falls back to plain text.
- Walk-through section: pin-and-scrub horizontal track on
  vertical scroll. `SpatialWalkthroughs.tsx` rewritten with
  ScrollTrigger (`start: top top`, `pin: true`, `scrub: 1`,
  `end: () => +${distance}`, `anticipatePin: 1`). Reduced-motion
  and `< 768px` paths fall back to horizontal snap-scroll.
- `OPERATOR.md`: §13 "Going to v1.2" items closed.
  Multi-domain licenses (`LICENSE_SERVER_URL` /
  `LICENSE_PUBLIC_KEY`) remain offline HMAC-signed per the
  v1.0.0 buyer contract; an upgrade to a hosted verify endpoint
  is opt-in only when a buyer specifically asks.

### Verification

- `npm run verify:deploy` -> 19/19 green
- `npm run build` -> green
- `npx tsc --noEmit` -> exit 0
- `scripts/smoke-routes.mjs` -> 36/36
- `scripts/smoke-render.mjs` -> 32/32
- `scripts/smoke-admin-live.mjs` -> ALL GREEN
- `scripts/smoke-api.mjs` -> writes survive two cold-starts
- `scripts/smoke-role.mjs` -> 401 anon / 403 admin / 200 admin
  on /api/projects (gating holds)

### Operating notes

Cross-coldstart durability on Vercel requires `DATABASE_URL`
set. Without it, the runtime falls back to the bundled SQLite
hot-copy path and `smoke-coldstart.mjs` exits 3 with a clear
"Postgres bridge not configured" message. The local-dev path
(env unset, no `VERCEL`) is unaffected.

### What does NOT change in v1.2

- Buyer-visible design tokens, palette, fonts, layout: no
  changes from v1.1.2 close-out
- Theme.distro.json + studio-brand.json + the white-label
  contract: unchanged
- `/install` and the offline HMAC license signer: unchanged
- The freeze marker remains rolled to v1.2.0 as the gate for
  any future product work

## v1.1.2 - 2026-06-28 (DEPLOYED) - WordPress-grade admin + Postgres runtime

### Status

Shipped to `ethinterior.vercel.app`. The runtime is
Postgres-first when `DATABASE_URL` is set, SQLite hot-copy
(`/tmp/etihad-{region}.db`) otherwise. All four entity CRUD
surfaces (pages, projects, journal, testimonials, team) have
dedicated admin routes; the page builder is now schema-driven
per block type with TipTap rich text and the MediaPicker for
images. Login + admin write durability proven across two
cold-starts via `/admin/smoke-api`.

### What landed

**Phase 0 (intake + dump):**
- `data/etihad-backup-2026-06-27.json` operator-state archive.
- `scripts/export-sqlite.mjs` reads the bundled SQLite and
  dumps rows to JSON for pre-cutover insurance.

**Phase 1 (Postgres-first runtime):**
- `src/lib/pg.ts`: pgPool / pgQuery / pgOne / pgMany / withPgTx
  / ensureMigrated. `ensureMigrated` boots `supabase-bootstrap.sql`
  behind a Postgres advisory lock, once per cold start.
- `src/lib/db.ts`: legacy shim. `openDb` / `openReadonlyDb` return
  `any`-typed proxies that throw at runtime. `db: any` proxy same.
- `src/lib/auth.ts`: credentials provider queries `users` via
  `pg.ts`. Login no longer reads SQLite.
- Prerender-critical pages ported: `src/app/(public)/projects/page.tsx`,
  `src/app/(public)/projects/[slug]/page.tsx`,
  `src/app/(public)/journal/[slug]/page.tsx`,
  `src/app/api/sitemap/route.ts`,
  `src/lib/pages.ts`. Without these the next `next build` would
  crash at static generation.
- Operator console ported from SQLite to Postgres across every
  API route, the operator-store, license.ts/appendAudit, the
  public about page, the admin pages/[id] editor, the superadmin
  tenants pages, and the Envato webhook.

**Phase 2 (media pipeline):**
- `src/lib/storage.ts`: Supabase Storage REST abstraction with
  per-kind cap (image 8MB / glb 25MB / video 80MB / pdf 25MB /
  raw 50MB).
- `src/lib/sqlite-fallback-ddl.ts`: portable DDL mirroring
  `supabase-bootstrap.sql` so the no-DATABASE_URL path carries
  the same schema.
- `app/api/media/{upload,list,[id],[id]/sign}/route.ts`: POST,
  GET cursor-paginated, DELETE, signed-GET. Auth-gated upload.
- Media-library UI at `/admin/media` with GLB inline preview via
  lazy three.js, video poster, PDF object render. `MediaPicker`
  modal reused by PagesAdmin, MediaGrid, and AdminProjectForm.

**Phase 3 (media UI):**
- `src/components/admin/GLBThumb.tsx` (lazy three.js viewer).
- `src/components/admin/media-types.ts` (per-kind cap map).
- `src/components/admin/MediaGrid.tsx` (full library UI).
- `src/components/admin/MediaPicker.tsx` (modal picker).
- `src/app/api/media/[id]/route.ts`: PATCH added for alt /
  original_name / mime updates.

**Phase 4 (page builder schema-driven):**
- `src/components/admin/block-schemas.ts`: one BlockSchema per
  block type. Field kinds (text / longtext / number / select /
  richtext / media / toggle).
- `src/components/admin/BlockEditor.tsx`: schema-driven renderer.
  Field primitive delegates to RichTextEditor (existing)
  and MediaPicker (existing). ArrayEditor with reorder + remove +
  defaults factory.
- `src/components/admin/PageBuilder.tsx`: SortableBlock now
  expands to BlockEditor instead of a raw JSON textarea. Save
  calls PUT /api/pages/[id] (meta) and PUT /api/pages/[id]/blocks
  (blocks). Cmd/Ctrl-S still works. "Saved HH:MM:SS" indicator
  in the header. Open-state on the editor row tracks drag-reorder.
- PagesAdmin + AdminShell + PageBuilder switched to /api/pages*
  prefix. Orphan `/api/admin/pages/route.ts` deleted.

**Phase 5 (project CRUD):**
- `src/components/admin/AdminProjectsIndex.tsx`: client-side
  list + search + sort. Publish toggle (PUT). Edit, View-site,
  Delete (DELETE). credentials:'include' across.
- `src/app/admin/projects/page.tsx` and
  `src/app/admin/projects/[id]/page.tsx` new server route.
- `AdminShell.tsx`: ProjectsRoutePanel routes the Projects tab
  through /admin/projects.
- `scripts/seed-content.mjs`: canonical Postgres-or-SQLite seed.
  Three projects / three journal / three testimonials / three team
  / three media rows. Branches on DATABASE_URL. Old
  `scripts/seed-content-supabase.mjs` deleted.

**Phase 6 (journal CRUD + slug audit):**
- `src/components/admin/AdminJournalIndex.tsx`: search / sort /
  publish toggle.
- `src/app/admin/journal/page.tsx` and
  `src/app/admin/journal/[id]/page.tsx` new server route.
- `src/app/api/journal/[id]/route.ts`: GET added. Auth-gated.
- `src/components/admin/AdminJournalForm.tsx`: slug derivation
  matches the API regex `[^a-z0-9\s-]` strip -> trim -> spaces to
  dashes; "Use derived slug" hint surfaces when input is dirty.
- `src/app/(public)/journal/page.tsx`: rewrote from a hard-coded
  six-item array to a `pgMany` read of `journal_posts WHERE
  is_published = TRUE`. Slug audit: every seeded slug now resolves
  through /journal/<slug>. force-dynamic so cold-start pages
  read the bundled SQLite hot-copy.
- `AdminShell.tsx`: JournalRoutePanel mirrors ProjectsRoutePanel.

**Phase 7 (testimonials + team CRUD):**
- `src/components/admin/AdminTestimonialsIndex.tsx` and
  `AdminTestimonialForm.tsx` (name / role / quote / photo).
- `src/components/admin/AdminTeamIndex.tsx` and
  `AdminTeamForm.tsx` (name / role / bio / photo / order with
  inline up-down reorder against PUT order).
- `src/app/admin/testimonials/page.tsx`, `/admin/testimonials/[id]`,
  `/admin/team/page.tsx`, `/admin/team/[id]` all new server
  routes.
- `src/app/api/testimonials/[id]/route.ts` and
  `src/app/api/team/[id]/route.ts`: GET added.
- `AdminShell.tsx`: TestimonialsRoutePanel and TeamRoutePanel.

**Phase 8 (acceptance):**
- `scripts/smoke-api.mjs`: login -> POST -> cold-start probe ->
  GET round-trip -> DELETE cleanup. Proves admin writes persist
  across two cold-starts.
- `scripts/smoke-phase2.mjs` (media gating),
  `scripts/smoke-phase5.mjs` (projects),
  `scripts/smoke-phase6.mjs` (journal + slug resolver),
  `scripts/smoke-phase7.mjs` (testimonials + team).
- `scripts/smoke.mjs` (direct DB durability proof).

### Verification

- `npm run verify:deploy` - 19/19 checks green.
- `npm run build` - green, 38+ pages prerender.
- Live Vercel probes (post-deploy):
  - `/api/projects` returns 200 with the seeded rows.
  - `/api/journal` returns 200 with the seeded rows; each slug
    round-trips through `/journal/<slug>` to 200.
  - `/admin/{projects,journal,testimonials,team}` all 200.
  - Login via NextAuth credentials with the operator-known
    admin ID succeeds; session cookie rides subsequent requests.
  - smoke-api: 16-step flow proven across two cold-starts.

### Removed / replaced

- `src/app/api/admin/pages/route.ts` deleted (stub).
- `scripts/seed-content-supabase.mjs` deleted (replaced by
  `scripts/seed-content.mjs`).

### Carry-forward

- Tiered admin/superadmin role gate. Currently both roles pass
  `requireLicense('admin')`. Operator to confirm if a distinct
  superadmin gate is required beyond same-route access.
- Past v1.1.x add-ons go through the 3-buyer-counter rule in
  `AGENT_BEST_PRACTICES.md`.

## v1.1.2 - 2026-06-25 (Phase 1 connectivity - infra only, not yet shipped to runtime)

### Status

**NOT deployed.** This entry documents the pieces that landed on
`main`. None of them are active on the live Vercel runtime yet. The
runtime continues to read from the bundled SQLite copy of
`data/etihad.db`. Activation happens once Phase 2 ports the
raw-sqlite call sites AND Phase 3 fixes the admin login page.
At that point this entry rolls forward in release status (rather
than `in-progress`) with the freeze marker bumped.

### What landed in this series

- `supabase-bootstrap.sql`: idempotent CREATE TABLE IF NOT EXISTS
  DDL mirroring every SQLite table in `src/lib/schema.ts`, plus
  the `before_image` and `after_image` columns on `projects`
  (which were already in `schema.ts` but never had a UPLOAD path
  wired up). Postgres-typed columns with proper SERIAL PK,
  JSONB for the JSON text columns, TIMESTAMPTZ for timestamps.

- `src/lib/db-postgres.ts`: drizzle-orm/pg-core mirror of
  `src/lib/schema.ts`. Same column names and table names so the
  SQL DDL is symmetrical between the two engines. Exports a
  `drizzlePostgres(pool)` factory used by the runtime.

- `src/lib/auth.ts`: Postgres-aware credentials provider via
  a new `lookupUser()` helper. When DATABASE_URL is set, opens
  a pg.Pool and queries the Supabase `users` table; otherwise
  falls back to the existing SQLite openReadonlyDb path. No
  change to local dev.

- `src/lib/db.ts`: openPostgres() lazy helper. The `db` proxy
  itself still resolves to the SQLite drizzle handle because
  the env-branching version caused Turbopack prerender errors
  ("i is not a function"); Phase 2 will resolve that.

- `scripts/migrate-to-supabase.mjs` ('npm run migrate:supabase'):
  reads DATABASE_URL from .env.local, applies
  supabase-bootstrap.sql, then runs INSERT ... ON CONFLICT DO
  UPDATE for users, tenants, site_identity, settings, pages,
  page_blocks, menus, menu_items. Each row preserves its
  original id from the bundled SQLite. Idempotent.

- `scripts/seed-content-supabase.mjs` ('npm run seed:content'):
  inserts a representative content set (3 projects,
  3 journal_posts, 3 testimonials, 3 team_members). Uses ON
  CONFLICT DO NOTHING and skips tables that already have
  operator content, so re-runs are safe.

- `scripts/inspect-db.mjs` ('npm run db:inspect'): prints table
  row counts from the bundled SQLite.

- `src/lib/db-postgres.ts`: required peer to `db-postgres.ts`
  above the runtime path - a `require('./db-postgres')` call
  inside `db.ts` to break circularity.

### What is NOT yet fixed

- The `/admin` and `/superadmin` login pages still look the same
  as the v1.1.0 demo: form submits silently because the CSRF
  hidden input only carries the token half. Six commits in
  this session attempted to fix it (5265787, 58eb775, c9d68d6,
  fd17531, 23da701, 0a002ca) and were reverted by eaeb1db.
  Phase 3 needs to read the actual NextAuth v4 csrf route
  (next-auth/lib/web/spec/routes/csr + next-auth/core/lib/cookie)
  and pick a single approach validated with a curl-driven
  live probe.

- 91 raw-sqlite call sites across lib/pages.ts, lib/media.ts,
  lib/auth.ts (SQLite branch unchanged), lib/operator-store.ts,
  lib/license.ts, lib/initDb.ts, and the api routes still
  target the SQLite copy. They will continue to evaporate
  across Vercel cold starts until Phase 2 ports them.

- The admin project form has no input for `before_image` /
  `after_image` even though the columns now exist on the
  Prock Postgres `projects` table.

- Run `npm run verify:deploy` before any deploy - per AGENTS.md
  session protocol. This commit did not run it.

### Public runtime impact

None at the moment. The Vercel Production runtime sees only
the SQLite copy. Once Phase 2 lands AND Phase 3 lands AND
the operator sets DATABASE_URL on Vercel, the deletions below
become visible.

---

## v1.1.1 - 2026-06-25 (v1.1.0 post-deploy hotfix)

### Fixes

- `/admin` and `/superadmin` had the marketing navbar mounted
  on top of them. The fixed-position `<Navbar />` was rendered
  in `src/app/layout.tsx` for every route, so the public chrome
  overlapped the operator login forms. Marketing pages
  (`/`, `/about`, `/contact`, `/projects`, `/project/[slug]`,
  `/journal`, `/journal/[slug]`, `/install`) moved into a new
  `(public)` route group with its own `layout.tsx`. Root layout
  now only provides SessionProvider + ThemeProvider +
  I18nProvider. URLs unchanged because route groups do not
  affect routing. Commit `4650a06`.

- Two Unsplash image IDs in seed fallback components returned
  HTTP 404 (`photo-1613553497126-a44624272013` and
  `photo-1600585154340-be6161a89a2c`). Replaced at the same
  call sites with two verified-living residential interiors
  URLs (`photo-1565538810643-b5bdb714032a` and
  `photo-1600585154526-990dced4db0d`) in `SelectedWork.tsx`,
  `SpatialWalkthroughs.tsx`, `(public)/projects/page.tsx`, and
  `(public)/projects/[slug]/page.tsx`. `next.config.mjs`
  `images.remotePatterns` already allowed `images.unsplash.com`.
  Same commit `4650a06`.

- The home process sticky-stack ignored live changes to
  prefers-reduced-motion. `src/components/ProcessStickyStack.tsx`
  read `window.matchMedia("(prefers-reduced-motion: reduce)").matches`
  inline at effect mount, did not subscribe to subsequent MQL
  change events, and did not include the value in the effect
  dependency array. Result: an OS-level reduce-motion toggle
  could not release pinned siblings back to natural layout.
  Replaced with React-state-driven reduceMotion, MQL change
  subscription with cleanup, and a useEffect key that re-runs
  on change. Commit `14cbb39`.

- Run hygiene gap: session log LLM intended to run
  `npm run verify:deploy` before the v1.1.1 push; it did not.
  Carried forward into Phase 6.

### Public runtime impact

- Admin and superadmin login forms render without the public
  navbar overlay, so credentials can now be seen / submitted.
- Project image fallbacks resolve to 200 instead of 404 on
  the homepage and the projects list.
- The home process section collapses to natural scroll under
  reduce-motion.

### Important caveat

The attempt in this series to fix the CSRF chain itself
(commit `e7e7669`) was incomplete - `getCsrfToken()` returns
the bare token, but NextAuth's cookie verifier expects
`<token>%<urlEncoded hash>`. As of v1.1.1 the form still ships
a token-only value and submit still appears to "do nothing"
against the live URL. **The user-visible CSRF bug re-surfaces
in v1.1.2 from this gap**, and Phase 3 of v1.1.2 will close it.

---

## v1.1.0 - 2026-06-23 (current shipped release on runtime)

### What changed

This release converts the codebase from a single-license demo
into a multi-tenant commercial product. The buyer-visible site
stays in its v1.0.0 contract. New product surfaces live under
a separate carve-out so they cannot accidentally ship into a
buyer install.

### New surfaces (operator-only - not visible to buyers)

- **`/superadmin`** - tenant + license console (gated by
  `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` env).
  - Tenants list + filter
  - Tenant detail: edit tier, set expiration, mark revoked,
    change domain, paste distro
  - Issue license action: tenant HMAC-signed offline license
    payload
  - Theme distro apply: distribute `theme.distro.json` overrides
    per tenant
  - Rotate HMAC action: re-sign a tenant key; buyers re-stamp
    at /install
  - Metrics tile: total/active/pending/revoked/by-tier/
    expiring-7d/audit-7d

- **`/api/operator/**`** - seven operator-only routes (login,
  tenants CRUD, issue, rotate-hmac, metrics).
- **`/api/envato/webhook`** - Envato purchase intake, manual
  operator approval (no auto-issue).
- **`scripts/apply-distro.mjs`** - apply a `theme.distro.json`
  to a tenant locally.

### Tenant model

- `tenants` table: slug, studio_name, owner_email, domain,
  tier, state, hmac_key, installed_at, expires_at, revoked_at.
- `tenant_data` table: per-tenant JSON sidecar (distro, future
  settings overrides).
- All legacy tables preserved unchanged. Seed data + schema
  are backward-compatible.

### White-label pass (studio demo neutralised)

- `site_identity` default brand name: `Etihad Interiors` ->
  `Your Studio`.
- Default settings rows: `contact_email`, `studio_address`, etc
  become placeholders.
- `seed-pages.mjs` hero copy: Etihad-specific line removed,
  eyebrow becomes `Residential Studio`.
- `data/theme.distro.json`: the Etihad-themed override lives
  here (read by `tenant-brand.ts`).
- `data/studio-brand.json`: white-label default surface used
  when a tenant has no distro row.

The studio demo at `https://ethinterior.vercel.app` keeps
painting as Etihad because the studio tenant's row 1 has
`data/theme.distro.json` applied. Removing that distro row
paints the demo as `Your Studio`.

### Public runtime impact

None. The demo at `/`, `/install`, `/admin`, `/projects`,
`/journal`, `/contact` renders identically to v1.0.0. Buyers
on a fresh install see neutral defaults until they (or the
superadmin) apply a distro.

### Session continuity

- `docs/CONTEXT.md` - written so any new opencode session
  reads it first and picks up the build state, freeze status,
  and known tradeoffs.
- `AGENTS.md` patched to point at it on every session start.

### Verify-deploy gate additions (`scripts/verify-deploy.mjs`)

Added gates for: tenants row present, theme.distro.json
present, studio-brand.json present, operator page tree present,
envato webhook route present, GLB > 1 KB (rejects the 369-byte
stub), demo JPGs (>= 8), upload JPGs (9 required paths).

## Lifecycle roll-forward

See `FREEZE-MARKER` for the new carve-outs:

- v1.0.0 freeze remained in effect for buyer-visible code.
- v1.1.0 added an explicit operator carve-out (above).
- White-label edits changed `seed-pages.mjs` and `site_identity`
  default content (string-only); no schema or route changes.
- v1.1.1 hotfix applied bug fixes without breaking the
  v1.0.0 contract; no schema changes (see Important caveat
  above re: the CSRF claim).
- v1.1.2 in progress: Phase 1 Supabase connectivity landed
  on `main` but not yet shipped to runtime.

## Post-deploy checklist (operator fills in)

- Deploy to `https://ethinterior.vercel.app` (auto-deploys
  from `rasikfakih/interior/main`).
- Verify `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` env vars
  are set in Vercel Production scope.
- Once v1.1.2 ships to runtime, also set `DATABASE_URL` and
  the Supabase publishable/secret keys in Vercel Production.
- Run the SHIP.md sec 5 incognito smoke (4 checks) on the live
  URL after every release.
- Stamp CHANGELOG when first-visit passes.

### Status

- **Status (operator fills in after deploy)**: `_PENDING_ -
  enter timestamp here on first success_`. v1.1.0 has been in
  PENDING for the merged v1.1.1 hotfix; upgrade after v1.1.2
  deploy lands.

---

## v1.0.0 - 2026-06-18 (historic)

### Scope freeze

This release was feature-frozen for sale to buyers:

- Hard freeze date: Day 2 of Room 0 (2026-06-18).
- Hard freeze scope: every code change after this point was
  bug-fix, copy edit, doc edit, or accessibility fix only.
- Hard freeze intent: a freshly installed v1.0 keeps behaving
  exactly like what is in this build.

Anything new was queued in `docs/feature-decisions.md` for
v1.1 / Room 1 / Room 2. The next room landed in v1.1.0 (this
release) after one freeze-roll-forward session.

### Public runtime (v1.0.0)

- Public site reads from `pages_blocks` (CMS Room 0).
- `/install` stamps the license from purchase code, domain,
  tier.
- `/admin` requires login + valid license.
- License FeatureMatrix:
  - `feature.3d-viewer`: Personal = off, Business = on
  - `feature.multilingual`: Personal = off, Business = on
  - `feature.unlimited-pages` / `feature.unlimited-media`:
    Personal = capped, Business = unlimited
  - `feature.multi-domain`: Personal = 1 site, Business = 5
    sites

### Migration hooks (v1.0.0)

- `node scripts/migrate.mjs` is idempotent. Re-runnable. Always
  safe to run.
- `node scripts/seed-pages.mjs` is conditional. Only seeds if
  `home` page row is missing.
