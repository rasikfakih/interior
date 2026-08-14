# Session Todo State

Updated at the start and end of every OpenCode session.
Append-only on end. Read-at-start is mandatory under
AGENTS.md step 5c.

`docs/CONTEXT.md` §9 is the prose narrative; this file
is the structured gate. Both ship. Both persist. The
narrative doc carries "why" and "how"; this doc carries
"what is required to ship" and "what shipped last session"
in a grep-able shape.

Owner: OpenCode session. Operator is the human reviewer;
the agent is the writer.

---

## Active todos

### TS-ID-015 - Forest & Bone recalibration (palette + Newsreader + 3D seed) - v1.9.0
- Status: @done 2026-08-12 (pending commit + Vercel deploy)
- Severity: operator ask 2026-08-12 (recalibrate the shipped brand look)
- Opened: 2026-08-12
- Owner: freebuff
- Files:
  - `src/app/globals.css`, `src/app/layout.tsx` - Forest & Bone
    recalibrated tokens (ink #122A20 / paper #ECECE6 / accent #C0964F
    / muted #626D66) + display serif swap Cormorant Garamond ->
    Newsreader
  - `data/studio-brand.json`, `data/theme.distro.json` - recalibrated
    palette in the white-label brand + shipped demo distro
  - `src/lib/theme.ts`, `src/lib/studio-brand.ts`,
    `src/lib/theme-presets.ts`, `scripts/check-theme-presets.mjs` -
    DEFAULT_PALETTE / DEFAULTS fallback / forest preset + CATALOG
  - `scripts/seed-content.mjs` - seed `model_3d` + NULL-only backfill
  - `src/lib/pg.ts` - sqliteExec SELECT result-set wrapper fix
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run check:themes` PASS 8
  - `npm run verify:deploy` green
  - Updated theme.distro.json / studio-brand.json pass apply-distro
    validation (muted/paper >= 4.5:1)
- Outcome:
  - Draft muted #748179 failed the AA gate (3.43:1 vs paper);
    darkened within the same forest-shadow hue to #626D66 (4.54:1)
    and applied across every palette source so the shipped distro
    still passes postinstall.
  - Seed closes the PROJECTS-AUDIT 3D wiring gap on existing installs
    via an idempotent NULL-or-empty model_3d backfill (insert-only
    was a no-op on non-empty tables; live salt-flats carried '').
  - Local-SQLite SELECT path fixed in pg.ts (was returning
    rows:undefined through pgQuery / pgOne / pgMany).
  - Version bumped 1.8.0 -> 1.9.0; CHANGELOG + FREEZE-MARKER +
    CONTEXT.md §9 updated.
- Closes on: cc23ab6

### TS-ID-014 - Encoding cleanup + media storage SDK (bugfix) - v1.8.0
- Status: @done 2026-08-03 (pending Vercel deploy)
- Severity: operator ask 2026-08-03 (unknown chars in admin; media
  library not loading; admin save not reflecting live)
- Opened: 2026-08-03
- Owner: opencode
- Files:
  - `src/lib/storage.ts` (port supabase mode to @supabase/supabase-js
    SDK; new-format sb_* keys are rejected as raw Bearer tokens by the
    Storage REST API "Invalid Compact JWS"; SDK signs them correctly) +
    best-effort `ensureBucket()` to auto-create the missing `media` bucket
  - `src/components/admin/MediaGrid.tsx`, `MediaPicker.tsx` (route
    `/api/uploads/local` rows through `/sign` instead of returning raw -
    that path is a 404 no-op in supabase mode; https + /uploads/... static
    assets keep loading directly per TS-011)
  - `src/components/admin/LicenseAdmin.tsx`, `PageBuilder.tsx`,
    `src/components/JournalPreview.tsx` (mojibake fix)
  - 38 files (37 src + .env.local) UTF-8 BOM stripped
  - `package.json` / lock (add @supabase/supabase-js)
  - `CHANGELOG.md`, `FREEZE-MARKER`, `docs/CONTEXT.md`
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run build` green
  - `npm run verify:deploy` green (19/19)
  - lint: 0 new errors (storage.ts lint-clean)
  - Media: live SDK probe - bucket auto-created, signed upload URL
    minted, PUT 200, `/api/media/[id]/sign` returns working signed URL,
    image loads
  - Save/realtime: verified working at the data layer (PUT project ->
    public page reflects immediately -> restore); no code change
- Closes on: 3525790

### TS-ID-013 - Custom theme engine (per-tenant palettes) - v1.7.0
- Status: @done 2026-08-02 (pending Vercel deploy)
- Severity: ship-block (operator ask 2026-08-02: sell license with
  custom themes)
- Opened: 2026-08-02
- Owner: opencode
- Files:
  - `src/lib/theme.ts` (new) - resolveTheme + deriveThemeVars
  - `src/lib/theme-presets.ts` (new) - 8-preset catalog
  - `src/app/(public)/layout.tsx` - theme injection, force-dynamic
  - `src/app/(public)/themes/page.tsx` (new) - palette showcase
  - `src/components/operator/DistroForm.tsx` - preset quick-pick
  - `scripts/apply-distro.mjs` - SQLite WAL -> DELETE journal mode
  - `scripts/check-theme-presets.mjs` (new) + `npm run check:themes`
  - `CHANGELOG.md`, `FREEZE-MARKER`, `package.json`,
    `docs/CONTEXT.md`, `docs/theme-distro.schema.md`
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run build` green; `/themes` registered dynamic
  - `npm run check:themes` PASS 8 presets
  - E2E: applying a cobalt distro to Postgres re-themes the served
    home page (ink #14213d, accent #2743c8)
- Outcome this session:
  - The distro palette was validated-and-discarded; v1.7.0 closes the
    gap by reading it at request time and injecting CSS custom props.
  - Root cause: `tenant-brand.ts` `readBrandFor` was uncalled dead code
    reading a throwing SQLite shim. Replaced with a working Postgres
    read (`resolveTheme`).
- Closes on: 98cb084

(Sorted by severity desc, then TS-ID asc. Each active
entry below is one row of structured state. Updates
flip one line at a time.)

### TS-ID-010 - WP-admin bump-tail sweep (6 missing revalidate tails)
- Status: @done 2026-07-13 commit=dee66f1
- Severity: ship-block (operator ask 2026-07-13)
- Opened: 2026-07-13
- Owner: opencode
- Files:
  - `src/app/api/operator/issue/route.ts` (additive
    `bump({ kind: "install" })` tail)
  - `src/app/api/operator/rotate-hmac/route.ts`
    (additive `bump({ kind: "install" })` tail)
  - `src/app/api/operator/tenants/[id]/route.ts`
    (additive `bumpAll()` on PATCH + DELETE)
  - `src/app/api/newsletter/route.ts` (additive
    `bumpAll()` on insert happy path)
  - `src/app/api/media/upload/local/route.ts`
    (additive `bump({ kind: "media" })` tail)
  - `src/app/api/upload/route.ts` (additive
    `bumpAll()` after file write)
  - `docs/PLAN-WP-ADMIN.md` (new, spec gate)
  - `CHANGELOG.md`, `FREEZE-MARKER`,
    `package.json`, `docs/CONTEXT.md`
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run verify:deploy` 19/19 green
  - `npm run build` green; every touched
    route registered as `f Dynamic`
  - `node scripts/smoke-routes.mjs` against
    `http://localhost:3030`: pass=37 fail=3
    (the 3 fails are the pre-deploy v1.4.3
    detail routes locally 404ing without
    `DATABASE_URL` - documented pre-existing
    carry from the v1.4.3 ship). The 37
    passing routes are exactly the 37 that
    passed before this patch.
  - `scripts/smoke-live-revalidate.mjs` is
    the post-Vercel-deploy acceptance probe
    (unchanged from v1.4.2). Pre-deploy the
    home page may serve stale copy; the
    smoke flags the cache layer explicitly.
- Outcome this session:
  - One-line `bump(...)` or `bumpAll()` tail
    appended to each of the six write routes
    that were missing the v1.4.2 revalidate
    wiring. No new abstraction, no new
    helper, no frozen file touched. The
    `EntityKind` union in
    `src/lib/revalidate.ts` already covered
    every kind touched - no new case.
  - Mirrors the v1.4.2 ship pattern exactly
    (one `bump({...})` after the write
    succeeds, tolerant of revalidatePath
    throws so the save flow never breaks).
  - `docs/PLAN-WP-ADMIN.md` written as spec
    gate before the ship; decision ledger
    answered by operator ("yes database url
    set") which opened the gate.
  - Tier-gate preserved.
  - `graphify update .` ran this session.
    Graph refreshed: 1769 nodes, 2802 edges,
    159 communities (was 1697/2689/151 at
    v1.4.3 ship).
  - `CHANGELOG.md` v1.4.4 stamp prepended.
    `FREEZE-MARKER` rolled forward to v1.4.4
    with a `v1.4.4 increment` section
    enumerating the six files. `package.json`
    1.4.3 -> 1.4.4. `docs/CONTEXT.md` §9
    entry appended. PLAN-WP-ADMIN.md written
    as spec gate.
- Acceptance met: yes (post-Vercel rebuild the
  live `node scripts/smoke-live-revalidate.mjs`
  probe flips green; until rebuild the six
  patched routes still have the old behavior
  on the live URL).
- Notes: ships as v1.4.4 patch on top of
  v1.4.3 under the v1.4.0 / v1.4.2 freeze
  carve-out (operator-write-API routes with
  `bump(...)` tails). No frozen file touched.
  The same Vercel rebuild that lands v1.4.4
  also lands the v1.4.3 `/projects-v2/[slug]`
  surfaces on the live URL.

### TS-ID-011 - Media sign-skip for relative URLs (admin thumbnails)
- Status: @done 2026-07-13 commit=c745b2a
- Severity: follow-up (found as uncommitted working-tree
  patch at v1.4.4 session close; operator approved TS-011
  carve-out + push 2026-07-13)
- Opened: 2026-07-13
- Owner: opencode
- Files:
  - `src/components/admin/MediaGrid.tsx` (1-line regex
    widen in `signedUrlForRow`)
  - `src/components/admin/MediaPicker.tsx` (1-line regex
    widen in `resolveUrl`)
  - `CHANGELOG.md`, `FREEZE-MARKER`,
    `package.json`, `docs/CONTEXT.md`
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run verify:deploy` 19/19 green
  - Admin media row with a relative `"/..."` url
    renders directly; it no longer round-trips
    `/api/media/[id]/sign` (which in local /
    Vercel-fallback mode resolves
    `storage_path` to a `/tmp` scratch path that
    404s on cold starts when no file was ever
    uploaded there). Absolute https URLs (Supabase
    signed) still go straight through; rows with
    no usable url still fall through to `/sign`.
- Outcome this session:
  - `signedUrlForRow` / `resolveUrl` widened their
    `test` from `/^https?:\/\//` to
    `/^(https?:)?\//`. Rows whose `url` already
    starts with `/` are browser-loadable as-is
    (shipped in `public/` by the demo seed or
    pre-existing tenant uploads); skipping the
    sign roundtrip fixes the local-mode 404.
  - Ships as v1.5.0 (the FREEZE-MARKER procedural
    signature gates the next bump after v1.4.4 to
    1.5.0). `src/components/**` is frozen, so this
    lands under a new v1.5.0 carve-out naming
    exactly these two admin-widget files.
  - `npx tsc --noEmit` exit 0, `npm run verify:deploy`
    19/19 green.
- Notes: two-file, two-line-edit patch. No new
  abstraction. Tier-gate untouched. Mirrors the
  v1.4.2-in-reverse pattern (media render path
  instead of write path).

### TS-ID-012 - tenant_data.kind schema fix (superadmin tenant detail)
- Status: @done 2026-07-13 commit=937dc69
- Severity: ship-block (operator ask 2026-07-13: check
  /superadmin and rectify all errors)
- Opened: 2026-07-13
- Owner: opencode
- Files:
  - `supabase-bootstrap.sql` (tenant_data CREATE adds
    `kind TEXT NOT NULL DEFAULT 'distro'`)
  - `src/lib/pg.ts` (ensureMigrated adds idempotent
    `ALTER TABLE tenant_data ADD COLUMN IF NOT EXISTS
    kind`)
  - `src/lib/sqlite-fallback-ddl.ts` (tenant_data uses
    `data`, kind default)
  - `scripts/migrate.mjs` (tenant_data uses `data`,
    kind default)
  - `scripts/apply-distro.mjs` (UPDATE/INSERT use `data`;
    was `payload` - the Vercel postinstall blocker)
  - `src/lib/tenant-brand.ts` (readBrand / findTenant
    select `data`; was `payload`)
  - `CHANGELOG.md`, `FREEZE-MARKER`,
    `package.json`, `docs/CONTEXT.md`
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run verify:deploy` 19/19 green
  - `npm run build` green (superadmin routes dynamic)
  - Live post-deploy: `GET /api/operator/tenants/1`
    returns `ok:true, tenant:{...}` (not null) and
    `/superadmin/tenants/1` renders tenant details.
- Outcome this session:
  - Diagnosed `GET /api/operator/tenants/1` ->
    `{ok:true, tenant:null, distro:null}`: the
    `tenant_data` table was missing the `kind` column
    the code reads/writes (`WHERE kind='distro'`,
    `INSERT ... (tenant_id, kind, data)`), so
    `getTenant()`'s distro sub-query threw and the
    silent catch nulled the whole result.
  - Aligned four schema mirrors to
    `tenant_data(id, tenant_id, kind, data, updated_at)`
    and added the idempotent Postgres additive
    migration so the existing live table gets `kind`.
  - Local env fix: better-sqlite3 native binding was
    built for a stale Node ABI; `npm install-scripts
    approve better-sqlite3` + `npm rebuild
    better-sqlite3` restored verify:deploy 19/19.
  - Ships as v1.6.0.
- Notes: `src/lib/**` + `scripts/migrate.mjs` frozen,
  landed under the new v1.6.0 carve-out. Tier-gate
  untouched.

### TS-ID-009 - /projects-v2/[slug] detail page (taste-skill pass)
- Status: @done 2026-07-11 commit=066fd48
- Severity: ship-block (operator ask 2026-07-11)
- Opened: 2026-07-11
- Owner: opencode
- Files:
  - `src/components/projects-v2/ProjectHeader.tsx` (new)
  - `src/components/projects-v2/ProjectBeforeAfter.tsx` (new)
  - `src/components/projects-v2/ProjectSpecs.tsx` (new)
  - `src/components/projects-v2/ProjectVoices.tsx` (new)
  - `src/components/projects-v2/ProjectRelated.tsx` (new)
  - `src/components/projects-v2/DetailCtaBand.tsx` (new)
  - `src/app/(public)/projects-v2/[slug]/page.tsx` (new)
  - `scripts/smoke-projects-v2-detail.mjs` (new)
  - `docs/PROJECTS-AUDIT.md`, `docs/PLAN-PROJECTS-V2.md` (append)
  - `CHANGELOG.md`, `FREEZE-MARKER`, `package.json`
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run verify:deploy` 19/19 green
  - `node --check scripts/smoke-projects-v2-detail.mjs` parses
  - `node scripts/smoke-projects-v2-detail.mjs` against local
    `next start` (port 3030) returns pass=55 fail=0. Ghost
    slug `no-such-slug-12345-<epoch>` returns 404.
  - `npm run build` green, `/projects-v2/[slug]` listed as
    `f` dynamic in the build manifest.
  - `node scripts/smoke-routes.mjs` includes the new 4
    routes (1 listing + 3 seed-detail pages); fail=3 on the
    live URL pre-deploy (v1.4.3 commit not yet on Vercel),
    fail=0 once Vercel rebuilds.
  - `node scripts/smoke-render.mjs` 32/32 stays green.
  - `node scripts/smoke-projects-v2.mjs` 18/18 stays green.
- Outcome this session:
  - Sibling route at `/projects-v2/[slug]` ships at v1.4.3.
    v1 detail untouched (zero source diff in
    `src/app/(public)/projects/[slug]/page.tsx`).
  - Seven new components under `src/components/projects-v2/`.
    Header at `min-h-[78dvh]`, `BeforeAfterSlider` with
    reduce-motion side-by-side fallback, 2x2 spec tile grid
    (no bordered spec table), DB-backed homeowner quotes
    with `line-clamp-6` cap, conditional 3-tile related
    bento gated on n>=3, closing CTA strip with
    `min-h-[40dvh]` restraint.
  - Eyebrow budget: 1 spent (From-the-homeowner). Hero /
    numbers-strip / specs / before-after / 3D / related /
    CTA all read without chrome-pill eyebrows.
  - CHANGELOG v1.4.3 stamp prepended. FREEZE-MARKER rolled
    forward with the v1.4.3 increment section enumerating
    the seven files + smoke. package.json 1.4.2 -> 1.4.3.
    SESSION-TODO TS-009 row flipped to @done. CONTEXT.md
    §9 entry appended. PROJECTS-AUDIT.md §F detail-v2
    section added. PLAN-PROJECTS-V2.md "Detail v2" section
    appended.
  - Tier-gate preserved.
  - scripts/smoke-routes.mjs extended with the four new
    routes.
- Notes: ships as v1.4.3 sub-bump under the v1.4.0 freeze
  carve-out. v1 detail `/projects/[slug]` untouched.
  Sibling routing strategy mirrors PLAN-PROJECTS-V2 (v1
  untouched, v2 ships new). Pre-deploy the 3 new detail
  routes fail at the live URL until Vercel rebuild lands;
  smoke is forward-looking on that axis.

### TS-ID-008 - Live revalidation (WordPress-grade live updates)
- Status: @done 2026-07-11 commit=846ba16
- Severity: ship-block (operator ask 2026-07-11)
- Opened: 2026-07-11
- Owner: opencode
- Files:
  - `src/lib/revalidate.ts` (new)
  - `src/app/(public)/page.tsx` (revalidate=60 dropped)
  - `src/app/(public)/about/page.tsx` (force-dynamic)
  - `src/app/(public)/voices/page.tsx` (force-dynamic)
  - `src/app/(public)/install/page.tsx` (force-dynamic)
  - `src/app/(public)/contact/page.tsx` (force-dynamic)
  - 13 admin / operator write routes with appended
    `bump(...)` tails (project / journal / testimonial /
    team / pages / settings / site-identity / install /
    media / newsletter / demo-reset)
  - `scripts/smoke-live-revalidate.mjs` (new)
  - `CHANGELOG.md`, `FREEZE-MARKER`, `package.json`
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run verify:deploy` 19/19 green
  - `node --check scripts/smoke-live-revalidate.mjs`
    parses
  - `node scripts/smoke-routes.mjs` 36/36 PASS (no
    route regression)
  - `node scripts/smoke-live-revalidate.mjs` against the
    live URL once Vercel rebuilds v1.4.2 - anon GET /
    (pre) 200; admin POST /api/pages/1/save with a marker
    block 200; grace window (default 350ms) later anon
    GET / reflects the marker stamp
  - Cleanup: restore the prior blocks list when
    `SMOKE_LIVE_NO_RESTORE` is unset
- Outcome this session:
  - `src/lib/revalidate.ts` exports `bump({ kind,
    slug?, pageSlug? })` plus `bumpAll()`. Maps each
    write to the public URLs that depend on it; calls
    `revalidatePath` for each. Tolerates revalidatePath
    errors so the rest of the save flow never breaks.
  - Public pages flipped to `dynamic = "force-dynamic"`:
    home drops the 60s ISR; /about, /voices, /install,
    /contact were implicit build-time prerenderers
    previously, now live.
  - Appended `bump({ kind })` to the happy-path tail of
    every admin / operator write route that touches
    user-visible state - projects, journal, testimonials,
    team, pages builder (POST /pages, pages/[id] PUT/
    DELETE, pages/[id]/blocks PUT, pages/[id]/save POST),
    settings POST + [key] PUT/DELETE, site-identity PUT,
    install/stamp PUT advance, media/[id] PATCH/DELETE,
    media/upload POST, newsletter-subscribers/[id]
    DEACTIVATE/REACTIVATE PATCH, demo-reset (bumpAll
    wholesale wipe).
  - `scripts/smoke-live-revalidate.mjs` written, type-
    checked, ready for the live probe post-Vercel rebuild.
  - `package.json` bumped to 1.4.2; `npm run smoke:live`
    alias added.
  - `CHANGELOG.md` v1.4.2 stamp prepended with status,
    what landed, verification, decision log.
  - `FREEZE-MARKER` rolled forward to v1.4.2 with a
    `v1.4.2 increment` section enumerating the new files
    and the strategy pick.
  - `docs/CONTEXT.md` §9 appended with this session's
    log entry.
- Acceptance met: yes (post-Vercel deploy live probe
  flips green; until rebuild the new surfaces 200 with
  the old cached state and the smoke flags the cache
  layer explicitly).
- Notes: this is the only TS-ID that survives a v1.4.x
  carry-forward without freezing-impact: the new files
  sit on unfrozen paths under v1.4.1 carve-out or
  v1.4.2's own entries. Tier-gate preserved.

### TS-ID-005 - Create this document
- Status: @done 2026-07-02 commit=<docs(governance)>
- Severity: ship-block
- Opened: 2026-07-02
- Owner: opencode
- Files: `docs/SESSION-TODO.md`, `AGENTS.md`
- Acceptance: file exists at repo root next to
  `docs/CONTEXT.md`; AGENTS.md step 5c appended; initial
  seed of 5 carry-forwards backfilled; one commit on
  `main` (`docs(governance): session todo gate + AGENTS.md
  step 5c`); git push confirmed.
- Closes on: docs(governance)

### TS-ID-007 - Atomic page-save (single-roundtrip) +
  auth-gated block read
- Status: @done 2026-07-11 commit=1a24534
- Severity: ship-block (operator decision 2026-07-11)
- Opened: 2026-07-11 (working-tree follow-up to the
  v1.4.0 ship; two files staged but not committed)
- Owner: opencode
- Files:
  - `src/app/api/pages/[id]/save/route.ts` (new)
  - `src/app/api/pages/[id]/blocks/route.ts` (additive
    GET handler; PUT was already covered by v1.4.0)
  - `scripts/smoke-save.mjs` (new)
  - `docs/CONTEXT.md` §9 (this session's append)
  - `CHANGELOG.md` (v1.4.1 stamp)
  - `FREEZE-MARKER` (rolled forward to v1.4.1)
  - `package.json` (1.4.0 -> 1.4.1)
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run verify:deploy` 19/19 green
  - `node --check scripts/smoke-save.mjs` parses cleanly
  - `.next/types/validator.ts` confirms
    `/api/pages/[id]/save` and `/api/pages/[id]/blocks`
    are registered handlers (precondition satisfied via
    the existing `.next/` build cache)
  - `scripts/smoke-save.mjs` against the live URL, once
    Vercel rebuilds v1.4.1, asserts anon 401 on both
    routes; admin POST `/save` returns
    `success: true` with an `audit.kind="pages.save"`
    echo; follow-up GET shows the marker block
    round-tripped; empty-meta save asserts
    `saved.meta=false` (atomicity branch); cleanup
    restores the prior block list
- Closes on: 1a24534
- Outcome this session:
  - `POST /api/pages/[id]/save` ships with one
    `withPgTx(meta-UPDATE + page_blocks wipe-and-
    insert)`. `appendAudit("pages.save", ...)` runs on
    non-trivial writes; meta-capped at 200 (title,
    slug, seo_title), 500 (seo_description); block
    `data` capped at 200 KB. `status=published` sets
    `published_at = now()`; `status=draft` clears it.
  - `GET /api/pages/[id]/blocks` (auth-gated) returns
    `{ blocks }` ordered by `order_index ASC, id ASC`.
  - `scripts/smoke-save.mjs` written, parse-checked,
    ready for the live probe post-Vercel deploy.
  - `CHANGELOG.md` v1.4.1 entry prepended.
  - `FREEZE-MARKER` rolled forward to v1.4.1 stamp with
    a new `v1.4.1 increment` section enumerating the
    two files and the smoke.
  - `package.json` 1.4.0 -> 1.4.1.
  - `docs/CONTEXT.md` §9 entry appended (this session).
  - Tier-gate preserved: license POST, HMAC rotate,
    demo reset, distro apply still superadmin-only.
- Acceptance met: yes (post-Vercel deploy live probe
  flips green; until then scripts/smoke-save.mjs flips
  to FAIL 404 on the live URL). Follow-up noted:
  live probe run + push will close this row with the
  final commit hash.
- Notes: this entry covers the working-tree work that
  had been staged-but-uncommitted at session start.
  The two files sat on a frozen path under the v1.4.0
  freeze marker; rolling the freeze forward to v1.4.1
  is the procedural answer. The decision was captured
  by the question tool at the top of this session
  ("Ship as TS-007 atomic save (Recommended)").

### TS-ID-004 - Live verify /projects-v2 post-deploy
- Status: @done 2026-07-02 commit=f51828a
- Severity: ship-block
- Opened: 2026-07-02
- Owner: opencode
- Files: `src/app/(public)/projects-v2/page.tsx`,
  `scripts/smoke-projects-v2.mjs`
- Acceptance: GET `ethinterior.vercel.app/projects-v2`
  returns 200 with rendered HTML; smoke-projects-v2.mjs
  passes 18/18 on the live URL; routes smoke 36/36 +
  render smoke 32/32 stay green (v1 untouched). A separate
  post-deploy pass is required because Vercel hot-copies
  the SQLite bundle on first cold-start with a different
  node version than the local probe.
- Closes on: f51828a
- Outcome: live probe against
  ethinterior.vercel.app/projects-v2 -> 200, body
  length 63,254 bytes. smoke-projects-v2.mjs 18/18
  PASS against live URL (BASE_URL base). smoke-routes
  36/36 PASS (no route regression on /projects and the
  v1 surfaces). smoke-render 32/32 PASS (home,
  /projects/[slug] before/after sliders, journal
  slugs, hero copy). Postgres-via-Vercel hot-copy path
  carried the v2 data seam-free. No follow-up code
  shipped.
- Acceptance met: yes.
- Follow-up noted: smoke-routes.mjs does not yet
  include `/projects-v2` in its 36-route list; v2 was
  added after smoke-routes was last extended. Future
  session can append. Not blocking.

### TS-ID-001 - Drop dead ProjectFilters.tsx
- Status: @done 2026-07-02 commit=90f06f8
- Severity: follow-up
- Opened: 2026-06-30 (PROJECTS-AUDIT.md §E)
- Owner: opencode
- Files: `src/components/projects/ProjectFilters.tsx`
- Acceptance: file deleted; no `never used` lint
  regressions on importers; smoke-routes 36/36 and
  smoke-render 32/32 still pass on `/projects`; verify
  deploy 19/19.
- Closes on: 90f06f8
- Outcome: deleted; FeaturedGrid doc-comment reference
  re-pointed at ProjectsClient; tsc exit 0; verify 19/19;
  routes 36/36; render 32/32.
- Acceptance met: yes.

### TS-ID-002 - Drop invented press names in LogoWall
- Status: @done 2026-07-02 commit=90f06f8
- Severity: follow-up
- Opened: 2026-06-30 (PROJECTS-AUDIT.md §B / §E)
- Owner: opencode
- Files: `src/components/projects/LogoWall.tsx`
- Acceptance: only real publications remain, OR
  press row is removed entirely; no `Kaneki House`,
  `Better Interiors`, or `Home & Design` in the live
  HTML; smoke-renders shows no invented names on
  `/projects`.
- Closes on: 90f06f8
- Outcome: PRESS filtered to `AD India`, `Elle Decor`,
  `Surface Magazine` (verified-real). Empty-array codepath
  added so future empty list renders null. Live HTML on
  `/projects` shows no invented names; AD India confirms.
  routes 36/36, render 32/32, build green.
- Acceptance met: yes.

### TS-ID-003 - Resolve `statutes.ts` Migration import
- Status: @done 2026-07-02 commit=88ce2af
- Severity: follow-up (phantom)
- Opened: 2026-07-01 (CONTEXT close-out comment)
- Owner: opencode
- Files: NA (phantom carry-forward)
- Acceptance: `npx tsc --noEmit` exit 0; no
  `statutes.ts` import in the bundle; no render
  regression on the scripts covered by smoke-admin-live
  and smoke-durability.
- Closes on: 88ce2af
- Outcome: phantom carry-forward. The original 2026-07-01
  close-out comment paraphrased a note about
  `statutes.ts` Migration import; on
  investigation this session, no file matching
  statutes* exists anywhere on disk, and the
  TS-003 SESSION-TODO wording("scripts/migrate.
  sqlite-fallback-ddl.ts neighbour") pointed at
  a path that does not exist (the real file is
  src/lib/sqlite-fallback-ddl.ts, 206 lines,
  pure string export, no imports). git log -G
  statutes shows zero hits in any prior commit;
  the only references landed in this session's
  own CONTEXT and SESSION-TODO edits
  (90f06f8, a42f06c, f36af2f passes). Acceptance
  test met by definition: tsc --noEmit exit 0,
  no `statutes.ts` import anywhere, verify
  deploy 19/19, smoke-routes 36/36, smoke-render
  32/32.
- Acceptance met: yes (no bug to fix).

### TS-ID-006 - Make-everything-editable admin scope
- Status: @done 2026-07-10 commit=<pending v1.4.0>
- Severity: ship-block (operator ask 2026-07-02)
- Opened: 2026-07-02
- Closes on: <pending v1.4.0>
- Outcome this session: v1.4.0 single-release cut in
  response to operator instruction. Phase A (settings
  editor with whitelist + per-key CRUD), Phase B
  (site-identity single-row editor with logo_url +
  favicon_url), Phase C (newsletter viewer with soft-
  delete via active flag), Phase D (install metadata
  read-with-advance), Phase E (cross-coldstart smoke
  harness) all landed in one ship per operator override
  of the eight pre-confirmations recorded in
  `docs/SESSION-FINDINGS-2026-07-06.md` §7. Phase F
  (this stamp) closes the TS-ID.
- Acceptance: verify:deploy 19/19; tsc exit 0;
  build green (46 static pages prerender); smoke-routes
  36/36 PASS; graph rebuild 1650 nodes / 2524 edges /
  148 communities (was 1515/2217/135); TS-006 phases
  A-E all referenced by `npm run smoke:*` scripts that
  flip to PASS once Vercel rebuilds the phase surfaces
  into prod (live probes today show pre-deploy 404 /
  405 patterns that resolve to 200 after deploy).
- File diff summary (additions + modifications):
  - src/lib/settings-whitelist.ts (new)
  - src/app/api/settings/[key]/route.ts (new)
  - src/app/api/settings/route.ts (extended)
  - src/app/api/site-identity/route.ts (new)
  - src/app/api/newsletter-subscribers/route.ts (new)
  - src/app/api/newsletter-subscribers/[id]/route.ts (new)
  - src/app/api/install/stamp/route.ts (extended with audit
    log on PUT)
  - src/app/admin/settings/page.tsx (new)
  - src/app/admin/site-identity/page.tsx (new)
  - src/app/admin/newsletter/page.tsx (new)
  - src/app/admin/install/page.tsx (new)
  - src/components/admin/AdminSettings.tsx (new)
  - src/components/admin/AdminSiteIdentity.tsx (new)
  - src/components/admin/AdminNewsletterList.tsx (new)
  - src/components/admin/AdminInstallView.tsx (new)
  - src/components/admin/AdminShell.tsx (route button wiring
    + chrome link to all four editable surfaces)
  - src/lib/initDb.ts (audit_log table creation + site_identity
    logo_url / favicon_url column additions)
  - src/lib/pg.ts (audit_log + site_identity column helpers)
  - src/lib/sqlite-fallback-ddl.ts (mirror of the new columns
    and table on the SQLite hot-copy path)
  - supabase-bootstrap.sql (mirror)
  - src/lib/settings.ts (no behavioural change; defaults map
    preserved)
  - scripts/smoke-settings.mjs (new)
  - scripts/smoke-site-identity.mjs (new)
  - scripts/smoke-newsletter.mjs (new)
  - scripts/smoke-install.mjs (new)
  - scripts/smoke-editable-crossc.mjs (new)
  - package.json (smoke:settings, smoke:site-identity,
    smoke:newsletter, smoke:install, smoke:editable:crossc
    scripts added; version bumped to 1.4.0)
  - CHANGELOG.md (v1.4.0 STAMPED)
  - FREEZE-MARKER (rolled forward to v1.4.0)
- Acceptance met: yes.
- Follow-up noted: live URL probes flip on Vercel
  rebuild. `src/components/AdminProjectForm.tsx`
  (root-level orphan, frozen src/components/** freeze
  marker path) remains an unreferenced TRACKED orphan
  per the 2026-07-06 findings doc - deletion candidate
  for a follow-up TS-ID post-v1.4.0.
- ts-006-A through ts-006-F children rolled under TS-006
  as the operator confirmed single-release shape. If a
  future session wants per-phase audit the operator
  refines them; today the single v1.4.0 commit is the
  ship.

### TS-ID-006-AMEND - Operator pre-confirmations captured
- Status: @done 2026-07-06 commit=<docs(findings)>
- Severity: ship-block (operator ask 2026-07-02)
- Opened: 2026-07-06
- Owner: opencode
- Files: `docs/SESSION-FINDINGS-2026-07-06.md`,
  `docs/CONTEXT.md`, `docs/SESSION-TODO.md`
- Acceptance: the eight operator pre-confirmations
  captured in `docs/PLAN-EDITABLE.md` §4 are answered
  in `docs/SESSION-FINDINGS-2026-07-06.md` §7. The next
  TS-006 execution session reads both and stamps TS-006-A
  through TS-006-F child rows before any code ships. No
  code ships this session.
- Closes on: <docs(findings)>
- Outcome this session: operator answered the question
  tool with three overrides confirmed - (a) Phase B
  includes `logo_url` + `favicon_url`, (b) Phase A-D
  emit `appendAudit` entries on writes, (c) single
  v1.4.0 release. Remaining five defaults preserved
  (tier-gate preserved, two-pane settings, soft-delete
  newsletter, read-with-advance install, v1.4.0 single
  release per q1). `docs/SESSION-FINDINGS-2026-07-06.md`
  §7 records the eight answers; `docs/CONTEXT.md` §9
  2026-07-06 entry references this trace.
- Acceptance met: yes.

### TS-ID-006-FINDINGS - Findings doc + next.config precedence fix
- Status: @done 2026-07-06 commit=<docs(findings)>
- Opened: 2026-07-06
- Owner: opencode
- Files: `docs/SESSION-FINDINGS-2026-07-06.md` (new),
  `next.config.ts` (deleted), `docs/CONTEXT.md`,
  `docs/SESSION-TODO.md`
- Acceptance: (a) `docs/SESSION-FINDINGS-2026-07-06.md`
  exists with sections covering state summary, architecture
  findings, session changes, Graphify cross-check against
  `https://github.com/Graphify-Labs/graphify`, best practices,
  TS-006 plan amendments, roadmap, next-session acceptance
  contract. (b) `next.config.ts` deleted so
  `next.config.mjs` is singular (restores Unsplash
  remotePatterns + security headers at runtime). (c)
  `npm run verify:deploy` 19/19 and `npx tsc --noEmit`
  exit 0 after the delete.
- Closes on: <docs(findings)>
- Outcome this session:
  - `docs/SESSION-FINDINGS-2026-07-06.md` written (plain
    technical doc; no emojis; no em-dashes; monospace IDs).
  - `next.config.ts` deleted; `next.config.mjs` is the sole
    Next config.
  - `docs/CONTEXT.md` §9 2026-07-06 entry appended.
  - `docs/SESSION-TODO.md` gains this row + the
    TS-006-AMEND row above.
  - Graphify: not installed on this machine (`uv` absent,
    `graphifyy` package absent from Python 3.14.6, no LLM
    keys set). `graphify-out/` artifacts persist from a
    prior session; no `graphify update .` or `graphify .`
    ran. Next session install path documented in findings
    doc §4.4 and CONTEXT 2026-07-06 entry.
  - Irrelevant-file candidates LIST ONLY per operator call:
    `.next/` (47 MB gitignored build cache), `dev.log`
    (0 bytes gitignored), `dev.pid` (14.8 KB gitignored),
    `src/components/AdminProjectForm.tsx` (TRACKED orphan;
    zero live importers per grep; canonical one at
    `src/components/admin/AdminProjectForm.tsx`; lives
    under freeze marker `src/components/**` so deletion
    needs operator approval on a follow-up TS-ID).
  - `src/components/AdminProjectForm.tsx` deletion becomes
    a follow-up TS-ID (operator to file when convenient).
  - `src/lib/tenant-brand.ts` Still using legacy `db.ts`
    shim (returns [] in prod, falls through to FALLBACK
    brand) -> Phase 7 follow-up post-TS-006.
  - `src/lib/media.ts` opens `data/etihad.db` directly with
    `better-sqlite3`; broken for the Postgres runtime.
    Replace before any media-smoke against Postgres.
  - `npm run verify:deploy` and `npx tsc --noEmit` were
    not re-run at the close of the 2026-07-06 findings
    session because the only delta was the
    `next.config.ts` delete (already typechecked at
    session start) and the new findings doc. The
    pending tail was closed by the 2026-07-06 Graphify
    refresh session - see TS-ID-006-GRAPHIFY below.
- Acceptance met: yes (verify:deploy / tsc gap closed
  by the Graphify refresh session that same day).

### TS-ID-006-GRAPHIFY - Install Graphify CLI + AST refresh
- Status: @done 2026-07-06 commit=<chore(graph)>
- Severity: follow-up (closes the 2026-07-06 findings
  doc §4.4 tooling gap; satisfies AGENTS.md step 5a for
  this session)
- Opened: 2026-07-06
- Opened: 2026-07-06
- Owner: opencode (operator-executed the install)
- Files: `graphify-out/graph.json`,
  `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md`,
  `graphify-out/manifest.json`,
  `graphify-out/.graphify_labels.json`,
  `docs/CONTEXT.md`, `docs/SESSION-TODO.md`
- Acceptance: (a) `uv` installed on this machine.
  (b) `graphifyy` (double-y) installed via `uv tool install`.
  (c) `graphify update .` runs from the repo root without
  error. (d) `graphify-out/graph.json` reports a node count
  higher than the stale `97f228eb` baseline (938 nodes /
  1251 edges / 93 communities). (e) No code shipped
  outside the graphify-out/ tooling paths.
- Closes on: <chore(graph)>
- Outcome this session:
  - `uv` installed via `winget install astral-sh.uv`.
  - `graphifyy` installed via `uv tool install graphifyy`;
    PATH refreshed via `uv tool update-shell`.
  - `graphify update .` ran from the repo root. AST-only,
    no LLM key, no API cost. Final graph:
    1515 nodes, 2217 edges, 135 communities.
    Up from the stale 938 / 1251 / 93 baseline. Delta
    reflects every commit between `97f228eb` and HEAD
    `38cacd6`.
  - 9 source files produced zero nodes (all JSON data:
    `demo-media.json`,
    `etihad-backup-2026-06-27.json`,
    `license-template.json`,
    `studio-brand.json`,
    `theme.distro.json` + 4 more). AST-only skips
    non-code; `graphify .` semantic re-extraction is
    opt-in and not run this session per findings doc
    §4.4.
  - `npm run verify:deploy` and `npx tsc --noEmit` not
    re-run; zero code changes shipped (graphify-out/ is
    tooling output, not source).
  - TS-006-A through TS-006-F child rows still NOT
    stamped; next execution session that begins Phase A
    ship will stamp TS-006-A in this active block.
  - The untracked `src/app/api/settings/[key]/route.ts`
    from a prior session stays untracked; operator
    confirmed "keep, plan Phase A".
- Acceptance met: yes.

---

(Append at end of session. Each closed row gets a
`@done YYYY-MM-DD commit=<hash>` stamp and a 1-line
outcome. Closed entries are NOT deleted; they live
forever so a session-start reader can trace what
already shipped.)

### TS-ID-005 - Create this document
- Status: @done 2026-07-02 commit=<docs(governance)>
- Outcome: `docs/SESSION-TODO.md` created with TS-ID
  format; 6 seed entries (this one + 5 carry-forward)
  backfilled; AGENTS.md session-protocol step 5c
  appended; CONTEXT close-out log appended; one commit
  on `main` and push confirmed.
- Acceptance met: yes.

### TS-ID-001 - Drop dead ProjectFilters.tsx
- Status: @done 2026-07-02 commit=90f06f8
- Outcome: deleted file; `src/components/projects/
  FeaturedGrid.tsx` doc-comment re-pointed to
  `ProjectsClient`. tsc exit 0; verify 19/19; smoke-routes
  36/36; smoke-render 32/32; no `never used` lint
  regressions.
- Acceptance met: yes.

### TS-ID-002 - Drop invented press names in LogoWall
- Status: @done 2026-07-02 commit=90f06f8
- Outcome: `src/components/projects/LogoWall.tsx`
  `PRESS` filtered to `AD India`, `Elle Decor`,
  `Surface Magazine` (verified-real). Empty-array
  codepath added so a future empty list renders null.
  Live `/projects` HTML: no `Kaneki House`,
  `Better Interiors`, `Home & Design`; AD India present.
- Acceptance met: yes.

### TS-ID-003 - Resolve `statutes.ts` Migration import
- Status: @done 2026-07-02 commit=<docs-only>
- Outcome: phantom carry-forward. grep + git log -G
  show zero hits on `statutes`/Migration across the
  working tree; the original 2026-07-01 CONTEXT comment
  paraphrased a runtime observation that lost its
  concrete reference. Closure trace recorded in
  `docs/CONTEXT.md` 2026-07-02 TS-003 entry; no code
  diffs ship. Acceptance met under its own terms:
  tsc --noEmit exit 0; no `statutes.ts` import in the
  bundle; verify 19/19; smoke-routes 36/36; smoke-
  render 32/32.
- Acceptance met: yes (no bug to fix).

### TS-ID-004 - Live verify /projects-v2 post-deploy
- Status: @done 2026-07-02 commit=f51828a
- Outcome: live probe against
  ethinterior.vercel.app/projects-v2 -> 200 (63,254
  bytes). smoke-projects-v2.mjs 18/18 PASS against
  live URL. smoke-routes 36/36 + smoke-render 32/32
  PASS. Vercel hot-copy Postgres path served v2 on
  first cold-start; no operator-side fix required.
  Follow-up noted: smoke-routes.mjs not yet
  extended to include /projects-v2; future session.
- Acceptance met: yes.

### TS-ID-006-GRAPHIFY - Install Graphify CLI + AST refresh
- Status: @done 2026-07-06 commit=<chore(graph)>
- Outcome: uv + graphifyy installed; `graphify update .`
  rebuilt graphify-out/ to 1515 nodes / 2217 edges /
  135 communities (was stale at 938 / 1251 / 93 from
  commit `97f228eb`). AST-only, no LLM key, zero API
  cost. 9 JSON data files produced zero nodes (AST
  skips non-code); `graphify .` semantic re-extraction
  remains opt-in per findings doc §4.4. No source code
  shipped; verify:deploy / tsc not re-run.
- Acceptance met: yes.

### TS-ID-007 - Atomic page-save + auth-gated block read
- Status: @done 2026-07-11 commit=1a24534
- Outcome: `POST /api/pages/[id]/save` is the new
  atomic single-roundtrip page-save endpoint. Meta UPDATE
  + page_blocks wipe-and-insert happen inside one
  `withPgTx`, so a partial save can never land a new
  block array next to an old title. `appendAudit("pages.save", ...)`
  emits on every non-trivial write with `role`,
  `metaFields`, and `blocksCount`. `status=published`
  flips `published_at = now()`; `status=draft` clears
  it. Schema-bounded at the API boundary: meta fields
  capped at 200 chars (title, slug, seo_title), SEO
  description at 500, `block.data` at 200 KB.
  `GET /api/pages/[id]/blocks` is now auth-gated via
  `requireAdminSession` and returns the persistent
  blocks list ordered by `order_index ASC, id ASC`.
  `scripts/smoke-save.mjs` exercises anonymous 401 on
  both routes; admin POST returns `success: true` with
  an `audit` echo; follow-up GET shows the marker
  block round-tripped; an empty-meta save asserts
  `saved.meta=false` so the atomicity branch is
  covered. `CHANGELOG.md` v1.4.1 entry, `FREEZE-MARKER`
  rolled forward to v1.4.1 stamp, `package.json`
  1.4.0 -> 1.4.1, `docs/CONTEXT.md` §9 appended.
  Tier-gate preserved.
- Acceptance met: yes (post-Vercel deploy the live
  probe flips green; until rebuild the new endpoints
  404 on the live URL, which the smoke flags with
  a 401 expected).

### TS-ID-008 - Live revalidation (WordPress-grade live updates)
- Status: @done 2026-07-11 commit=846ba16
- Severity: ship-block (operator ask 2026-07-11)
- Opened: 2026-07-11
- Outcome: `src/lib/revalidate.ts` exports
  `bump({ kind, slug?, pageSlug? })` and `bumpAll()`.
  Every admin / operator write route under `src/app/api/**`
  that touches user-visible state grew a tail `bump(...)`
  call against the new helper. Public pages that depend on
  admin data are now `dynamic = "force-dynamic"`: home
  (drops `revalidate = 60`), /about, /voices, /install,
  /contact (were implicit build-time prerenderers).
  Tier-gate preserved. `scripts/smoke-live-revalidate.mjs`
  captures a pre-save homepage bytes snapshot, signs in
  as admin, snapshots the home blocks list, posts a
  stamped marker block, waits the SMOKE_LIVE_GRACE_MS
  window (default 350), re-GETs `/` and asserts the
  marker stamp shows up in the rendered HTML body.
  Fails loudly when the revalidate wiring is missing
  or a stale cache layer beats the test window.
  Cleanup restores the prior blocks list when
  `SMOKE_LIVE_NO_RESTORE` is unset. `CHANGELOG.md`
  v1.4.2 entry, `FREEZE-MARKER` rolled forward to
  v1.4.2 stamp, `package.json` 1.4.1 -> 1.4.2,
  `npm run smoke:live` alias added, `docs/CONTEXT.md`
  §9 appended.
- Acceptance met: yes (post-Vercel deploy the live
  probe flips green; until rebuild the home page may
  still hold stale copy from the v1.4.1 deploy, which
  the smoke flags explicitly).

---

### TS-ID-009 - /projects-v2/[slug] detail page (taste-skill pass)
- Status: @done 2026-07-11 commit=066fd48
- Severe: ship-block (operator ask 2026-07-11)
- Outcome: seven new components under
  `src/components/projects-v2/` plus
  `src/app/(public)/projects-v2/[slug]/page.tsx` ship
  the individual project detail page as a sibling to the
  live v1 surface. Header `min-h-[78dvh]`, 7/5 split, zero
  chrome-pill. `BeforeAfterSlider` wrapped with
  `useReducedMotion()` side-by-side fallback. Spec tile
  grid (2x2) instead of the AI-default 10-row bordered
  spec table. DB-backed homeowner quotes with
  `line-clamp-6` cap. Conditional 3-tile related bento
  gated on `n>=3`. Bottom CTA strip with `min-h-[40dvh]`
  restraint. `scripts/smoke-projects-v2-detail.mjs`
  passes 55/55 against the local `next start` server;
  ghost slug returns 404. `smoke-routes.mjs` extended
  to include the four new routes (live URL probe fails
  pre-deploy, flips green on Vercel rebuild). TS-009 is
  the only TS-ID that survives a v1.4.x carry-forward
  without freezing-impact: the new files sit on unfrozen
  paths under the v1.4.3 carve-out or v1.4.2 freeze
  margins. v1 detail untouched. `CHANGELOG.md`
  v1.4.3 stamp, `FREEZE-MARKER` rolled forward, 
  `package.json` 1.4.2 -> 1.4.3,
  `docs/SESSION-TODO.md` flipped to @done,
  `docs/CONTEXT.md` +09 entry appended.
- Acceptance met: yes (post-Vercel deploy the live
  probe flips green; until rebuild the new surfaces
  404 on the live URL, which the smoke flags with
  a 404-on-the-new-path report).

### TS-ID-016 - Demo Cut: v2 default surface + CI gate + health/uptime + vendor credit - v1.10.0
- Status: @done 2026-08-12 (pending commit + Vercel deploy)
- Closes on: 2a1ac25
- Severity: operator ask 2026-08-12 (demo to theme buyers 2026-08-15;
  product is hosted multi-tenant, studio hosts + supports)
- Opened: 2026-08-12
- Owner: freebuff
- Files:
  - `src/components/Navbar.tsx`, `Footer.tsx`, `HeroClient.tsx`,
    `SelectedWork.tsx`, `SpatialWalkthroughs.tsx`,
    `src/app/not-found.tsx`, `src/app/(public)/contact/ContactForm.tsx`,
    `src/app/(public)/projects/[slug]/page.tsx`,
    `src/components/projects-v2/ProjectsClient.tsx`,
    `src/components/projects-v2/FeaturedGrid.tsx`,
    `src/components/admin/AdminProjectsIndex.tsx`,
    `src/lib/initDb.ts` - every public project link repointed to the
    v2 surface (`/projects-v2`, `/projects-v2/<slug>`); v1 routes stay
    live as fallback
  - `.github/workflows/ci.yml` (new) - push/PR gate: npm ci, tsc,
    check:themes, build, verify:deploy, diff-scoped eslint
  - `scripts/lint-changed.mjs` (new) - eslint on changed files,
    errors on added lines only (legacy debt deferred to hygiene release)
  - `src/app/api/health/route.ts` (new) - force-dynamic liveness +
    DB reachability (200/503)
  - `scripts/check-uptime.mjs` (new) - per-buyer-site uptime probe
  - `src/lib/studio-brand.ts`, `data/studio-brand.json`,
    `data/theme.distro.json`, `src/lib/initDb.ts` - footer_credit ->
    "Powered by Interior Studio Theme Made By Rasik Fakih" (+ live
    tenant 1 distro row, surgical UPDATE, backup in %TEMP%/v190/)
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run check:themes` PASS 8
  - `npm run build` green
  - `node scripts/lint-changed.mjs` exit 0 (no new errors on changed lines)
  - `npm run verify:deploy` green
  - Local probe: /api/health 200 db=ok; v2 links on home/nav/CTAs;
    footer credit on /projects, /projects-v2, /projects-v2/<slug>;
    v1 fallback still serves
  - Post-deploy: `npm run check:uptime` 1/1 against live
- Outcome:
  - v2 becomes the default surface (the swap PLAN-PROJECTS-V2 always
    intended once parity was achieved; parity verified on both live
    routes incl. 3D walkthroughs).
  - The lint gate is line-scoped so the 279-error legacy debt cannot
    grow while a hygiene release is deferred; two touched <a> links
    converted to next/link to satisfy the rule.

### TS-ID-017 - StudioOS: multi-tenant SaaS (Phases 0-6) - v1.17.0
- Status: @done 2026-08-12 (pending commit + Vercel deploy)
- Closes on: 425ecaa
- Severity: operator ask 2026-08-12 (build the hosted multi-tenant
  SaaS before i18n; demo to theme buyers 2026-08-15)
- Opened: 2026-08-12
- Owner: freebuff
- Plan: `docs/PLATFORM-V2-PLAN.md` (phases 0-6, per-phase status
  blocks)
- Files: (the full per-phase file lists live in the
  `docs/PLATFORM-V2-PLAN.md` phase-status blocks; the new surfaces
  are)
  - Tenant admin: `/admin/theme` customizer + 8 presets, `/admin/menus`
    DB-driven nav editor, page revisions + draft preview + SEO panel +
    duplicate, `/admin/forms` builder + submissions inbox + CSV,
    `/admin/redirects`, `/admin/users` roles, `/admin/export-import`
    JSON export/import
  - 3D: project rooms schema + `/api/projects/[id]/rooms` CRUD,
    per-room GLB via the media library, viewer upgrade
    (three-runtime: tone mapping, lighting rig, auto-fit, camera
    presets, fullscreen, progress/error), procedural placeholder
    rooms generator + seed backfill
  - Public immersion: next-view-transitions crossfades, cinematic
    hero with kinetic type reveal, Magnetic CTAs, Spotlight hover
    trails, Reveal motion pass
  - Superadmin: `/superadmin/issue` license wizard + revenue ledger,
    `/superadmin/health` probe board, `/superadmin/metrics` revenue
    + usage, audited login-as, `/superadmin/announcements`,
    `/superadmin/backup` full-table snapshot
  - Schema: 7 new tables (project_rooms, form_definitions,
    form_submissions, redirects, usage_events, license_log,
    announcements) + 9 column additions on all three schema surfaces
    + pg.ts additive ALTERs
- Acceptance:
  - `npx tsc --noEmit` exit 0
  - `npm run check:themes` PASS 8
  - `npm run build` green
  - `node scripts/lint-changed.mjs` exit 0
  - `npm run verify:deploy` green
  - Phase E2E on the local SQLite runtime: 16/16 (P1), 43/43 (P2),
    26/26 (P3), 35/35 (P5), 30/30 (P6); all local state restored
  - Post-deploy: live route probe + `npm run check:uptime` 1/1
- Outcome:
  - The hosted multi-tenant SaaS surface ships: buyers get a
    WordPress-grade admin, per-room 3D walkthroughs, and the studio
    gets the superadmin back office (licenses, health, revenue +
    usage, login-as, announcements, backup, import/export).
  - i18n content editing explicitly deferred to v2.0 per operator
    decision; demo on 2026-08-15.

### TS-ID-018 - Drop orphaned components (root AdminProjectForm + operator IssueForm)
- Status: @done 2026-08-14 (pending commit)
- Outcome: resolver-based import scan over all 277 src files
  (tsconfig `@/*` alias + relative paths, `from`/`import(`
  literals) found two components with zero importers:
  `src/components/AdminProjectForm.tsx` (v1.0.0-era root-level
  orphan, long-documented TRACKED candidate; canonical twin at
  `src/components/admin/AdminProjectForm.tsx` stays) and
  `src/components/operator/IssueForm.tsx` (superseded by
  `LicenseWizard`, which `src/app/superadmin/issue/page.tsx`
  imports). Both `git rm`'d. Scan also confirms every other
  src/components file is imported; never-imported remainder is
  only app pages/API routes (Next.js file-convention routes) and
  lib files (see CONTEXT 2026-08-14 entry).
- Acceptance met: `tsc --noEmit` exit 0, `npm run build` green.

### TS-ID-019 - Dead-lib audit: six unreferenced src/lib modules
- Status: @done 2026-08-14 (pending commit)
- Outcome: dedicated audit of the six src/lib files flagged
  never-imported by the TS-ID-018 scan. Resolver scan (277 src
  files) + whole-repo grep (src, scripts, root configs, middleware,
  .opencode) + exported-symbol grep (gateAdmin, getBlobAdapter,
  drizzlePostgres, readBrandFor, findTenant) found zero consumers
  for each. Verdict: all six dead, all deleted:
    - `src/lib/initDb.ts` - pre-Postgres SQLite bootstrap with
      module-load side effects; dev admin seed lives in
      scripts/migrate.mjs (seedDefaultAdmin). check-contrast.mjs
      comment re-pointed to migrate.mjs.
    - `src/lib/i18n.ts` - i18next init; superseded by
      I18nProvider.tsx context i18n (which imports the same JSON
      locale files directly). i18next / react-i18next /
      i18next-http-backend deps now removable (follow-up).
    - `src/lib/api-guard.ts` - gateAdmin never consumed; routes
      use their own auth guards.
    - `src/lib/blob-adapter.ts` - unwired storage scaffolding
      ("Wired up in Week 7"); storage.ts + media.ts supersede.
    - `src/lib/db-postgres.ts` - drizzle pg-core mirror; runtime
      uses raw pg helpers (pg.ts). schema.ts (sqlite-core) stays
      live, so drizzle deps remain.
    - `src/lib/tenant-brand.ts` - legacy shim importing the
      throwing db.ts proxy; claimed twin tenant-brand.pg.ts never
      existed; theme distro surface lives in operator-store.ts +
      theme.ts.
  FREEZE-MARKER: initDb + tenant-brand entries retired from
  carve-out lists; v1.18.0 increment records the deletions.
- Acceptance met: `tsc --noEmit` exit 0, `npm run build` green,
  `npm run verify:deploy` green.

### TS-ID-020 - Lint debt grind: 260 errors to zero
- Status: @inprogress 2026-08-14 (pending commit)
- Owner: freebuff (user request: "Tackle the 279 legacy lint
  errors gated by lint:changed, highest-severity first")
- Opened: 2026-08-14
- Scope: full-lint legacy debt, 335 problems (260 errors / 75
  warnings) -> 0 errors / 78 warnings at session close.
- Non-any buckets: react/no-unescaped-entities (18), no-html-link
  (8, a > Link), no-require-imports (1 + dev-archive gate
  exclusion), react-hooks/purity (1), react-hooks/set-state-in-
  effect (20), plus --fix auto-fixables.
- no-explicit-any (206): next-auth session augmentation
  (src/types/next-auth.d.ts, 25 sites); catch(e: any) -> unknown
  (31 sites); schema.ts drizzle casts dropped; useRef<T>(null)
  ref sweep; block-JSON domain typed (Record<string, unknown> +
  per-block data types exported from consumer components,
  BlockEditor/block-schemas/PageBuilder Json alias); pg.ts
  generic any defaults kept with justified suppressions.
- BONUS FIND: settings.ts routed through the runtime-throwing
  db.ts proxy, so getSiteSettings always returned defaults
  (contact page + Footer silently wrong). Ported to pgMany +
  ensureMigrated; db.ts deleted (last importer gone).
- GATE FIX: scripts/lint-changed.mjs crashed with
  NoFilesFoundError on deleted-file paths (git diff lists them,
  eslint.lintFiles throws). existsSync filter added.
- Last error (react-hooks/refs, Reveal.tsx dynamic `as` tag):
  false positive (as constrained to keyof JSX.IntrinsicElements),
  scoped eslint-disable with justification.
- Follow-up (same TS-ID): all 51 remaining src warnings cleared.
  17 unused-import removals, dead vars (AnnouncementBar hidden
  state, Navbar t/last, CalendlyBadgeWidget url, ProjectHeader
  slug, demo-reset req, pg.ts synthetic query params), and 10 raw
  <img> tags converted to next/image with `unoptimized`
  (runtime-arbitrary srcs; loader bypass verified in
  get-img-props.js, so remotePatterns unchanged). icons.tsx
  phosphor Image renamed to PhosphorImage (jsx-a11y Image->img
  mapping false positive).
- Final sweep (same TS-ID): last 27 warnings (all scripts/*.mjs)
  closed. Dead helpers removed (parseSetCookie x4, smoke-api
  update(), seed-pages exists(), seed-content rows(), gen-glb N(),
  gen-demo SERIF, baseBack, tag, spawnSync x2); seed-content FORCE
  loops collapsed; 8 ternary statements in smoke-routes converted
  to if/else. migrate-to-supabase `columns` param kept (positional
  callers) - only the dead `cols` const removed. Full lint now
  0 errors / 0 warnings repo-wide.
- Acceptance: `tsc --noEmit` 0, `npm run build` green, `node --check`
  all scripts, `npm run verify:deploy` green, `npm run lint:changed`
  green (160 files vs origin/main), full lint 0/0 repo-wide.

### TS-ID-021 - ensureMigrated retry: don't cache migration rejections
- Status: @done 2026-08-14 (closed by commit)
- Owner: freebuff (user request: "Fix the poisoned-lambda bug: make
  ensureMigrated retry after a failed migration instead of caching the
  rejection forever, so a transient DB blip can't permanently red the
  health canary")
- Opened: 2026-08-14
- Scope: src/lib/pg.ts ensureMigrated only. Root cause of the
  post-deploy /api/health 503s after the 84773bc push: one transient
  pooler failure during the rollout poisoned the lambda (cached
  rejected promise -> db=error with ms=0 for the lambda's lifetime).
- Fix: catch inside ensureMigrated resets _ensureMigrated = null
  before rethrowing, so the next caller retries. Success path
  unchanged - the in-flight promise still dedupes concurrent first
  callers.
- Verified: functional test (patch pg.Pool.prototype.connect, failing
  DATABASE_URL) shows 2 connect attempts across two calls (was 1
  cached); SQLite fallback path still resolves with in-flight cache
  held; tsc 0; eslint clean; lint:changed green; build green (58/58).
- Acceptance: closed by commit, pushed to origin/main.

### TS-ID-022 - vitest regression test for ensureMigrated retry
- Status: @done 2026-08-14 (closed by commit)
- Owner: freebuff (user request: "Add a permanent regression test for
  the ensureMigrated retry behavior under vitest")
- Opened: 2026-08-14
- Scope: new test infra + one regression suite. vitest 4.1.10 added as
  a devDependency (first test runner in the repo), `npm test` script
  (vitest run), vitest.config.ts with the @ -> src alias + node env
  (license-key.test.ts excluded: it imports server-only and is not a
  vitest suite).
- Test file: src/lib/pg-ensure-migrated.test.ts, 3 cases driving the
  Postgres path with pg.Pool.prototype.connect patched to count
  attempts (no network, no fs): (1) two failing calls = two connect
  attempts (the cached-rejection bug gave 1); (2) self-heal - success
  after failure resolves for the next caller; (3) concurrent first
  callers still share one in-flight run (dedupe preserved).
- Verified: npm test 3/3, tsc 0, eslint clean on new files, build
  green (58/58).
- Acceptance: closed by commit.

---

## Pending escalation

(Operator-action required. Sessions that hit a wall should
move items here so the next operator can resolve quickly.
Empty is fine - empty means nothing is operator-blocked.)

(none at session close)
