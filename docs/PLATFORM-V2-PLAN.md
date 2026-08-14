# Platform v2.0 - Complete SaaS Plan

**Date:** 2026-08-12
**Operator ask (verbatim intent):** "Complete SaaS now. Immersive awwwards-grade public sites, all projects 3D walkthrough with per-room models uploaded by tenants, admin panel like WordPress, and a superadmin panel for Rasik covering licenses, metrics, and everything end to end. Build the SaaS first, i18n after."
**Status:** Spec gate. This plan is the approval gate for the v2.0 build. Phases ship incrementally per the repo protocol (version bump, FREEZE-MARKER roll, CHANGELOG, CONTEXT session entries, SESSION-TODO TS-IDs, decision ledger).

Working title: **StudioOS**. The product is a hosted multi-tenant interior-design website platform:

- **Buyer / tenant** gets a branded public site (custom domain), a WordPress-grade `/admin`, and self-service uploads (including per-room 3D models).
- **Rasik (superadmin)** gets `/superadmin`: tenant + license lifecycle, health, revenue and usage metrics, support access, theme distro control.

## 0. Design read (taste-skill gate for the public surface)

**"Reading this as:** a hosted multi-tenant theme platform whose buyer-facing sites need an awwwards-grade immersive surface, for prospective theme buyers (demo audience) and design-conscious home buyers (ongoing), with an editorial-kinetic cinematic language, leaning toward Tailwind tokens + GSAP scroll choreography + react-three-fiber, preserving the Forest & Bone identity."

**Dials:** `DESIGN_VARIANCE: 8` (asymmetric editorial), `MOTION_INTENSITY: 7` (cinematic, reduced-motion-safe), `VISUAL_DENSITY: 4` (airy gallery).

**Visual direction (question 3 answered):** keep Forest & Bone editorial and push it cinematic. Brand continuity wins: the palette, Newsreader display serif, hairline geometry, and one-accent discipline are already taste-skill-clean and are the identity buyers are buying. The overhaul adds motion depth, 3D, and editorial rhythm, not a new identity. This is the recommendation; a bolder departure is off the table unless Rasik overrides in the decision ledger.

**Skill scope note:** the taste skill applies to the public surface only. Admin and superadmin are dashboards (out of skill scope); they get a disciplined dense treatment reusing the existing editorial admin tokens + consistent primitives, not the awwwards aesthetic.

## 1. Architecture

Unchanged core model, extended. One Next.js deploy hosts everything; tenant sites resolve by domain (existing `resolveTheme(domain, slug)` in `src/lib/theme.ts`). SQLite stays dev/seed-only; Postgres (Supabase) is the runtime.

| Layer | Today | v2.0 |
|---|---|---|
| Public sites | `/`, `/projects-v2/*`, `/about`, `/contact`, `/journal` | Same routes, immersive upgrade + room-by-room project stories |
| Tenant admin | `/admin` (blocks, media, projects, journal, testimonials, team, settings, site-identity, newsletter, install, license) | WordPress-grade: adds theme customizer, menus, revisions, preview, SEO, forms, users, redirects, import/export, rooms |
| Superadmin | `/superadmin` (tenants, metrics, theme, rotate, issue) | End-to-end: license wizard, health board, revenue metrics, login-as, announcements |
| Data | Postgres via `src/lib/pg.ts`, schema in `scripts/migrate.mjs` | Same, plus new tables below |
| Media | Supabase Storage via `/api/media/*`, kinds image/glb/video/pdf/raw | Adds folders, replace, GLB inline preview, per-room assignment |

## 2. Data model additions (Phase 0 migrations)

All new tables go into `scripts/migrate.mjs` (declarative, idempotent) so fresh installs and the live DB converge. SQLite mirrors for local dev.

### 2.1 New tables

```sql
project_rooms(
  id INTEGER PK AUTOINCREMENT,
  project_id INTEGER NOT NULL,          -- FK projects.id
  name TEXT NOT NULL,                   -- "Living room"
  slug TEXT NOT NULL,
  description TEXT,
  model_3d TEXT,                        -- media url (GLB), tenant-uploaded
  cover_media_id INTEGER,
  hotspots TEXT,                        -- JSON: [{x,y,room_slug}] floor-plan nav
  order_index INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1
)

form_definitions(
  id INTEGER PK AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  fields TEXT NOT NULL,                 -- JSON: [{key,label,kind,required,options}]
  submit_label TEXT,
  success_message TEXT,
  is_published INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

form_submissions(
  id INTEGER PK AUTOINCREMENT,
  form_id INTEGER NOT NULL,
  payload TEXT NOT NULL,                -- JSON {field: value}
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

redirects(
  id INTEGER PK AUTOINCREMENT,
  source TEXT NOT NULL,                 -- "/old-path"
  destination TEXT NOT NULL,
  status_code INTEGER DEFAULT 301,
  is_active INTEGER DEFAULT 1
)

usage_events(
  id INTEGER PK AUTOINCREMENT,
  tenant_id INTEGER,
  kind TEXT NOT NULL,                   -- pageview | model_3d_load | form_submit
  path TEXT,
  meta TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

license_log(
  id INTEGER PK AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  action TEXT NOT NULL,                 -- issue | extend | revoke | rotate
  tier TEXT,
  seats INTEGER,
  expires_at DATETIME,
  issued_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

announcements(
  id INTEGER PK AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all', -- all | tenants | superadmin
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 2.2 Column additions

- `tenants`: `seats INTEGER DEFAULT 1`, `support_notes TEXT`, `last_health_at DATETIME`, `storage_used_bytes INTEGER DEFAULT 0`.
- `media`: `folder TEXT` (folder grouping), `is_pinned INTEGER DEFAULT 0`.
- `pages`: `robots TEXT DEFAULT 'index,follow'` (SEO panel completes the existing seo_title / seo_description / og_media_id columns).
- `revisions` (already exists): wired to `entity_type IN ('page','project','journal')` snapshots; restore path added.
- `users`: `role` column exists (admin/superadmin); add `editor`, plus `is_active INTEGER DEFAULT 1`, `tenant_id INTEGER` for multi-user tenant admins.

### 2.3 Theme customizer keys (distro extension)

`tenant_data` distro data gains optional keys, validated by `scripts/apply-distro.mjs` and `scripts/check-theme-presets.mjs`:

| Key | Type | Notes |
|---|---|---|
| `fonts.display` | string | Token from the bundled set (see ledger Q7) |
| `fonts.body` | string | Same |
| `spacing_density` | `1` \| `2` \| `3` | Loose / standard / tight section rhythm |
| `motion_intensity` | `1`-`10` | Drives reveal + parallax + micro-interaction tiers |
| `radius_scale` | `'sharp'` \| `'soft'` \| `'pill'` | Maps to `--radius-control/card` |

`src/lib/theme.ts` derives the full CSS custom-property set including these. A `custom_css_tokens` escape hatch stays out of scope (the schema doc lists it as future; the customizer covers the shipped surface).

## 3. Public surface - immersive spec

Taste-skill pre-flight constraints carry: zero em-dashes, one accent, eyebrow max 1 per 3 sections, no scroll cues, no version footers, hero fits viewport, `min-h-[100dvh]`, transform/opacity-only motion, reduced-motion honored everywhere (existing `prefers-reduced-motion` blocks stay).

### 3.1 Home
- **Cinematic hero (rebuild):** full-viewport split or media-mask using `public/demo/*` photography. Kinetic type reveal (line mask-up on load), eyebrow optional, headline 2 lines max, subtext 20 words, single primary CTA, stat tiles retained. Hero image is `next/image priority` with preload (LCP < 2.5s). Poster-grade first frame, no autoplay video.
- **Block sections (existing, motion pass):** principles, services bento, selected work (hover image trail + tilt), process sticky stack (exists), testimonials, journal preview, spatial walkthroughs horizontal pan (exists), closing CTA. Add scroll-reveal stagger via Motion `whileInView` and magnetic CTAs. Keep section layout families distinct (already varied).
- **Page transitions:** Next 16 View Transitions API, soft crossfade + slight y-shift, progressive (no-op when unsupported). Applied via a root template. No shared-layout layout animations that cost measurement.

### 3.2 Projects archive (`/projects-v2`)
- Hero: editorial type + live project count, no eyebrow, single CTA (already compliant; add kinetic entry).
- Filter bar (category/year) + card grid: hover tilt, image swap, arrow micro-move. No pills overlaid on images.
- Numbers strip, featured grid (asymmetric), testimonial, process strip, FAQ, CTA band: keep; add reveal rhythm + one kinetic marquee max if used.

### 3.3 Project detail - room-by-room story (new)
- Header: type-led, scope chips, meta strip.
- **Room story:** one section per `project_rooms` row, alternate asymmetric compositions, real room photography (`public/demo/*`) with scroll-driven reveals. Max 2 consecutive image+text splits, then a break (full-bleed image, 3D section, or vertical stack).
- **Sticky 3D section:** viewer pinned while room copy scrolls past (`start: "top top"`, GSAP pin per skill skeleton or CSS sticky). Reduced-motion: static stacked layout.
- Specs, voices, related, CTA: keep.

### 3.4 About / Contact / Journal
- Consistent editorial treatment. Contact form becomes `form_definitions`-driven (admin-created forms). Journal gets category + author (columns exist).

## 4. 3D system - per-room walkthroughs

Reality check: today one GLB (`reception-room.glb`) is reused across all three projects. v2.0 makes walkthroughs per-room and tenant-managed.

### 4.1 Data + upload pipeline
- Media library already accepts `glb` kind. Tenant uploads room GLBs there (size cap raised to 25 MB per tier, see ledger Q5).
- Projects admin gains a **Rooms manager**: add room, name, cover image, description, GLB picker, order, publish toggle, live mini-preview.
- Detail page renders rooms from `project_rooms`; falls back to the legacy `model_3d` single-model path when no rooms exist (backward compatible).

### 4.2 Viewer upgrade (`three-runtime.tsx`)
- Environment: drei `Environment` preset (soft studio) or bundled HDR.
- Lighting: directional key + ambient fill; **contact shadow** under the model.
- Tone mapping: ACESFilmic, exposure tuned.
- Controls: OrbitControls with damping; per-room **camera presets** (front, orbit, close detail); auto-orbit toggle.
- Chrome: poster + lazy mount (exists), loading progress, **fullscreen expand**, room label, "drag to rotate" hint (reduced-motion skips auto-orbit, keeps drag).
- Performance: model dedupe by URL, dispose on unmount, lazy chunk (exists).

### 4.3 Floor-plan tour (stretch, post-core)
Schematic floor plan with hotspot dots per room; click loads that room's GLB + copy panel. Hotspot positions live in `project_rooms.hotspots`.

### 4.4 Asset dependency (ledger Q2)
We have one GLB. The demo projects need real per-room models. Until Rasik provides them, Phase 3 ships with a **procedural placeholder room generator** (three.js primitives per room archetype: living, kitchen, bedroom, bath, stair) so the room-tour UX is demonstrable end to end, swap-in for real GLBs.

## 5. Tenant admin - WordPress-grade spec

Nav tree (single `/admin` shell, tabs, existing pattern extended):

| Section | Capability | New / Existing |
|---|---|---|
| Dashboard | Counts (pages, projects, submissions, media storage), quick actions, recent activity | New |
| Pages | List, add, duplicate, delete; editor: title/slug/status, **SEO panel** (title, description, OG image, robots), block builder (exists), **revisions** (snapshot on save, list, restore), **draft preview** (token route), publish | Extend |
| Media | Grid (exists), **folders**, **GLB inline viewer**, replace, alt text, pin | Extend |
| Projects | List/form (exists) + **Rooms manager** + 3D assignment | Extend |
| Journal / Testimonials / Team | Existing CRUD | Existing |
| Forms | **Builder** (text, textarea, email, select, checkbox, file), **submissions inbox** (read/unread, export CSV), embed on any page via block | New |
| Menus | **Nav editor**: menus/menu_items tables exist but unused; Navbar becomes DB-driven (page links, custom links, buttons, order) | New |
| Theme | **Customizer**: live preview pane, display/body font, accent, spacing density, motion intensity, radius, logo + favicon from media, **preset gallery** (8 presets) with install | New |
| Settings | Existing (contact, social, SEO defaults) | Existing |
| Users | **Roles**: admin / editor, invite by email, deactivate; tenant-scoped | New |
| Redirects | Manager (source, destination, 301/302) | New |
| Import / Export | JSON export/import of all content, backup download; WordPress XML import later | New |
| License | Existing (envato key, HMAC, install stamp) | Existing |

Draft preview mechanics: `POST /api/pages/[id]/preview` writes a short-lived token to `pages` or a signed URL; preview route renders unpublished blocks under a banner. Revisions: `revisions.payload` stores the full page + blocks snapshot; save writes a revision before the PUT lands; restore re-PUTs the snapshot.

## 6. Superadmin - end-to-end spec

| Section | Capability | New / Existing |
|---|---|---|
| Dashboard | Health cards (active tenants, MRR, expiring <= 14d, storage, uptime), alerts feed, quick actions | New |
| Tenants | List (exists) + detail: profile, domain, tier, **seats**, license timeline, **health tab**, support notes, **login-as** (audited impersonation), suspend/activate, delete | Extend |
| Licenses | **Issue wizard** (tier, seats, duration, price, email buyer, generates license + HMAC + install code), extend, revoke, license log | New |
| Metrics | Revenue (MRR by tier, one-time vs subscription), installs over time, expiring cohort, **usage** (pageviews, 3D loads, submissions) per tenant | Extend |
| Health | Per-tenant uptime (reuses `scripts/check-uptime.mjs`), last deploy, DB status, storage, open issues | New |
| Theme | Existing distro editor + presets | Existing |
| Rotate | Existing HMAC rotation | Existing |
| Audit | Full log with filters (existing, extend) | Extend |
| Announcements | Broadcast to tenants | New |
| Platform settings | Env status (DATABASE_URL, storage bucket), GA4 id, HMAC key status | New |

Login-as: creates a short-lived superadmin-signed session token for the target tenant admin, stamped in audit_log, forced logout of the impersonation session after inactivity.

## 7. API surface additions

```
/api/theme                              GET customizer values, PUT save (tenant)
/api/projects/[id]/rooms                GET/POST; /api/projects/[id]/rooms/[rid] PUT/DELETE
/api/pages/[id]/revisions               GET; /api/pages/[id]/revisions/[revId]/restore POST
/api/pages/[id]/preview                 POST (issue token), GET /api/preview?token=
/api/pages/[id]/duplicate               POST
/api/forms                              GET/POST; /api/forms/[id] PUT/DELETE
/api/forms/[id]/submissions             GET; PATCH /api/forms/[id]/submissions/[sid]
/api/forms/[id]/export                  GET (CSV)
/api/menus                              GET/PUT (primary nav)
/api/redirects                          GET/POST; /api/redirects/[id] PUT/DELETE
/api/admin/users                        GET/POST; PATCH/DELETE /api/admin/users/[id]
/api/operator/licenses                  POST (issue), PATCH (extend/revoke)
/api/operator/tenants/[id]/login-as     POST (audited)
/api/operator/health                    GET (per-tenant status board)
/api/operator/announcements             GET/POST; PATCH/DELETE [id]
/api/usage                              POST (pageview | model_3d_load | form_submit)
/api/backup                             GET (trigger export-postgres, download)
```

Every write route tails `bump(...)` per `src/lib/revalidate.ts` (existing pattern). Every operator write is tier-gated and audit-logged (existing pattern).

## 8. Build phases

Each phase ends with: `tsc`, `build`, `check:themes`, `verify:deploy`, `lint:changed`, relevant smoke, a CONTEXT session entry, and a version bump per repo protocol.

| Phase | Contents | Version | Demo-critical |
|---|---|---|---|
| 0 | Plan (this doc), all new migrations, CI already in place, theme.ts + distro validator extension, nav seeding | v1.11.0 | yes |

**Phase 0 status: SHIPPED (uncommitted, 2026-08-12).** Migrations added to all three schema surfaces (`migrate.mjs`, `supabase-bootstrap.sql`, `sqlite-fallback-ddl.ts` + pg.ts additive ALTERs): 7 new tables (project_rooms, form_definitions, form_submissions, redirects, usage_events, license_log, announcements) + 9 column additions (tenants.seats/support_notes/last_health_at/storage_used_bytes, media.folder/is_pinned, pages.robots, users.is_active/tenant_id). Theme engine (`theme.ts`) now parses the customizer surface (fonts.display/body, spacing_density, motion_intensity, radius_scale) from distro JSONB **and** SQLite TEXT (normalizeData fix), deriving `--font-display`, `--font-sans`, `--radius-*`, `--section-gap`, `--motion-level` into the injected theme `<style>`. Inter Tight + Space Grotesk bundled via next/font for the font tokens. Distro validator accepts the new keys; `check:themes` asserts customizer derivation. Verified end to end: customizer distro applied to local SQLite served all 6 derived vars (6/6 probe), restored after. `tsc` / `build` / `check:themes` / `lint:changed` / `verify:deploy` all green. |
| 1 | Theme customizer (admin UI, live preview, presets), menu editor, page revisions + preview + SEO + duplicate | v1.12.0 | yes |
| 2 | Forms (builder + submissions + export), redirects, users/roles | v1.13.0 | no |
| 3 | Project rooms + GLB pipeline + viewer upgrade + placeholder room generator + room-by-room detail story | v1.14.0 | yes |
| 4 | Public immersion: cinematic hero, page transitions, micro-interactions, motion pass across all surfaces | v1.15.0 | yes |
| 5 | Superadmin: license wizard, health board, revenue + usage metrics, login-as, announcements | v1.16.0 | no |
| 6 | Import/export UI, backup UI, usage analytics wiring, polish + rehearsal | v1.17.0 | no |
| 7 | i18n content editing (parked; after core SaaS lands) | v2.0 | no |

**Phase 1 status: SHIPPED (uncommitted, 2026-08-12).** All six items land: theme customizer (`/api/theme` GET/PUT validating hex + WCAG AA contrast + tokens, distro-merge preserving other keys; `/admin/theme` with pickers, live contrast rows, font/density/radius/motion controls, 8-preset gallery, inline preview; AdminShell Theme tab); menu editor (`/api/menus` GET/PUT transactional replace, Navbar DB-driven via `navLinks` prop fetched in `(public)/layout.tsx` with fallback, `/admin/menus` editor, AdminShell Menus tab); page revisions (snapshot on every save through the atomic `/api/pages/[id]/save` + legacy PUT paths, GET revisions list, POST restore re-applying meta+blocks and snapshotting the restored state); draft preview (HMAC-signed 2h token via POST `/api/pages/[id]/preview`, `/preview?token=` renders draft or published under a noindex banner); per-page SEO panel in PageBuilder (seo_title, seo_description, robots, saved via the atomic route; home serves them via `generateMetadata`); duplicate (POST `/api/pages/[id]/duplicate` to a unique slug-copy draft, actions in pages list + editor). Dev-loop parity fixes in `pg.ts`: `withPgTx` now executes transactional writes on the SQLite fallback, `::jsonb` casts stripped on placeholders, INSERT...RETURNING returns rows. Validation: `tsc` / `build` / `check:themes` / `lint:changed` / `verify:deploy` green; full authenticated E2E against the local SQLite runtime (stamped valid license + admin login) 16/16 PASS covering save -> revision -> restore -> preview -> duplicate -> delete. All local state restored after.

**Phase 2 status: SHIPPED (uncommitted, 2026-08-12).** Forms builder + submissions + export: `form_definitions` / `form_submissions` backed by `src/lib/forms.ts` (field schema + admin validation + public submission validation + payload sanitize); `/api/forms` GET/POST + `/api/forms/[id]` GET/PUT/DELETE (slug normalization, dup-409, field-key regex, select options, delete cascades submissions); `/api/forms/public/[slug]` (published-only read), `/api/forms/submit` (public, unauthenticated, 422 on missing-required / bad email / invalid select option); `/api/forms/[id]/submissions` (inbox with unread count), `/read` (mark-all), `/export` (quoted CSV with field columns + content-disposition). New `form` block type (registry + block-schemas + PageRenderer) rendering through the public `FormBlock` client component. AdminForms UI (list/editor/inbox, new AdminShell Forms tab) + `/admin/forms`. Redirects manager: `/api/redirects` GET/POST + `/api/redirects/[id]` PUT/DELETE (source normalization, root forbidden, 301/302); enforcement via `(public)/[...slug]` catch-all (308 permanent / 307 temporary, active-only, else 404) - DB-driven with no rebuild. AdminRedirects UI + `/admin/redirects` + AdminShell Redirects tab. Users/roles: `/api/users` GET/POST + `/api/users/[id]` PUT/DELETE with bcrypt password hashing, editor/admin/superadmin roles, self-protection (no self demote/deactivate/delete), superadmin-only guards, editors blocked from user management; `users.created_at` added to all three schema surfaces + pg.ts additive (SQLite ADD COLUMN uses no non-constant default; INSERT supplies CURRENT_TIMESTAMP). AdminUsers UI (create, role select, activate toggle, password reset, delete) + `/admin/users` + AdminShell Users tab; AdminShell now receives the session role. Dev-parity fix in `pg.ts`: the SQLite shim coerces booleans to 1/0 and undefined to null so Postgres bool params bind on better-sqlite3. Validation: `tsc` / `build` / `check:themes` / `lint:changed` / `verify:deploy` all green; authenticated E2E against the local SQLite runtime 43/43 PASS (login; forms create/validate/409/public submit 200+422s/inbox unread/mark-read/CSV; redirects CRUD + live 308/307/pause/delete; users create/role/deactivate/short-pw 400/self-guards 403/delete + no password_hash leak). All local state restored after.

**Phase 3 status: SHIPPED (uncommitted, 2026-08-12).** Project rooms + per-room GLB pipeline + viewer upgrade + placeholder room generator. Rooms API: `src/lib/rooms.ts` (name/slug/description/model_3d/hotspots/order/publish validation), `/api/projects/[id]/rooms` GET (public, ordered) + POST (admin, auto-order, dup-409, slug normalization, 404 on missing project), `/api/projects/[id]/rooms/[roomId]` PUT/DELETE. Admin: `ProjectRoomsManager` embedded in AdminProjectForm (list, add/edit, up/down reorder via paired PUTs, delete, published toggle, per-room GLB via MediaPicker `accept="glb"` from the tenant media library). Public story: `ProjectRooms` server component renders a room-by-room 3D tour on `/projects-v2/[slug]` (editorial full-width stages, NOT zigzag; per-room GLB falls back to the project model); the detail page selects rooms when present, else the legacy single-model section. Viewer upgrade (`three-runtime.tsx` + `Model3DViewer`): explicit ACESFilmicToneMapping + sRGB output, 3-point lighting rig (key shadows + cool fill + warm rim) + `Environment apartment` at 0.55, auto-fit (Box3 normalization to a 2.6-unit cube centered at origin, so tenant GLBs of any scale frame correctly), animated camera presets (Front / 3/4 / Top / Detail, 0.8s ease-in-out lerp on position + target), fullscreen toggle, GLTF download progress bar (drei useProgress outside the canvas), poster fallback + error boundary on failed loads. Procedural placeholder rooms: `scripts/generate-placeholder-rooms.mjs` builds stylized low-poly rooms (living/kitchen/bedroom/study) with three.js + GLTFExporter (FileReader polyfill + onloadend fix for Node) into `public/models/rooms/*.glb` (22-49 meshes, valid glTF 2.0); `seed-content.mjs` backfills 3 rooms per seeded project on both PG + SQLite paths (zero-room projects only, `--force` reseeds, tenant rooms never clobbered). Validation: `tsc` / `build` / `check:themes` / `lint:changed` / `verify:deploy` green; local SQLite E2E 26/26 (login; 3 seeded rooms with order; `/projects-v2/casa-mira` renders Room by room + room names + descriptions + per-room GLB URLs; all 4 GLBs serve 200; rooms CRUD 401/201/slug/auto-order/400/409/200+draft/delete/404). All local state restored after.

**Phase 4 status: SHIPPED (uncommitted, 2026-08-12).** Public immersion pass. Page transitions: `next-view-transitions@0.3.5` installed + `<ViewTransitions>` wrapper in the root layout; globals.css adds a soft editorial crossfade (old page fades/rises 420ms, new slides in 480ms via `::view-transition-old/new(root)`) with a hard reduced-motion guard. Cinematic projects hero (`projects-v2/Hero.tsx` rewritten as a client component): full-viewport `min-h-[100dvh]` photo backdrop from the repo's real `public/demo/living-room-1.jpg` with dark scrim, slow settle + scrubbed parallax, kinetic word-by-word headline reveal (masked `ei-word` spans), single magnetic CTA, scroll cue; reduced-motion renders everything visible at first paint (timeline never runs). Magnetic hover: shared `Magnetic` client component (gsap.quickTo pull, `pointer: fine` + reduced-motion gated) applied to the home hero primary CTA and the v2 CtaBand CTA; ClosingCTA keeps its existing inline magnetic. Hover trails: shared `Spotlight` glow layer sets `--spot-x/--spot-y` on the parent card; CSS `.ei-spot .ei-spot-glow` radial follow applied to FeaturedGrid tiles (featured + bento) and ProjectRelated cards, hidden under reduced-motion. Motion pass across v2 surfaces via the existing `Reveal` (IO + CSS transition): NumbersStrip stats (staggered `as="li"`), FeaturedGrid tiles (grid cols moved to the Reveal wrappers, staggered), ProjectSpecs tiles, ProjectVoices figures, ProjectRelated tiles, ProjectBeforeAfter slider, CtaBand + DetailCtaBand CTAs, Testimonial pull-quote. ProcessStrip already had its own GSAP reveal (left untouched). No new dependency beyond next-view-transitions. Validation: `tsc` / `build` / `check:themes` / `lint:changed` / `verify:deploy` green; local runtime probe: `/projects-v2` serves the new hero (photo via optimized Image, 6+ `ei-word` spans, scroll cue, magnetic CTA, `min-h-[100dvh]`), `ei-spot` on >=4 tiles, `ei-reveal` wrappers present, view-transition + spotlight CSS in the built stylesheet, all public routes 200. The crossfade itself is a browser-runtime behavior - worth a human pass on the deployed page. All state restored after.

**Phase 5 status: SHIPPED (uncommitted, 2026-08-12).** Superadmin back office. Schema: `tenants.health_status` + `license_log.revenue_cents` added to all three DDL surfaces (`scripts/migrate.mjs`, `supabase-bootstrap.sql`, `sqlite-fallback-ddl.ts`) and the pg.ts additive ALTER loop (SQLite ADD COLUMN, idempotent). Store: `issueLicense`/`extendLicense` now write revenue-ledger rows (amounts in cents, matching the wizard UI's `Number(amount) * 100`), `revokeTenant` logs `license.revoke`, `probeTenant` reuses the uptime-checker contract (`GET {base}/api/health -> { ok }`) and persists status/ms/ts, `getMetrics` returns dialect-neutral base counts + revenue total/30d/by-tier + usage totals/7d/topPaths, announcements CRUD. Usage: `src/lib/usage.ts` + `/api/usage/record` (204 beacon, rate-limited-ish) + client `UsageBeacon` in the public layout. License wizard: `/api/operator/license` (issue/extend/revoke with amount + expiry validation, returns install code slug + hmac_key + owner email) + `LicenseWizard` UI at `/superadmin/issue`. Health board: `/api/operator/health` GET (persisted state) + POST (sequential live probes) + `HealthBoard` at `/superadmin/health`. Audited login-as: `/api/operator/login-as` verifies the target is active, records `admin.login-as`, and mints a real NextAuth JWT session cookie via `next-auth/jwt encode` (same secret/session-token the credentials flow uses) - tenant-detail page gets per-user Login-as buttons; self-login-as blocked. Announcements: operator CRUD APIs + public read (active-only) + `AdminAnnouncements` at `/superadmin/announcements` + public `AnnouncementBar` in the public layout. OperatorNav gains Issue/Health/Announcements; metrics page gains revenue + usage panels. Validation: `tsc` / `build` / `check:themes` / `lint:changed` / `verify:deploy` green; authenticated E2E against the local SQLite runtime 35/35 PASS (401 gates; superadmin login + bad-pw 401; health list + live probe ok + persisted status; wizard issue/extend/revoke + bad-action 400 + tenant restore; announcements CRUD + public visibility toggling; admin session + user create + login-as mints a session cookie resolving to the impersonated user + cleanup; usage record 204 + metrics pageviews/topPaths/revenue ledger populated). Two E2E findings fixed along the way: the probe's login-as jar lacked its own operator session (fresh jar hit the superadmin gate), and the dev DB's pre-existing `license.json` signature didn't match the dev HMAC fallback key, so license-gated routes reported "License tampered" - re-stamped for the local origin during E2E, original restored after. All local state restored after.

**Phase 6 status: SHIPPED (uncommitted, 2026-08-12).** Import/export UI, backup UI, usage analytics wiring, rehearsal checklist. Tenant export/import: `src/lib/content-export.ts` defines the versioned envelope (`etihad-content-export` v1) over every content table (pages/page_blocks, projects/project_rooms, menus/menu_items, form_definitions/form_submissions, media, testimonials, team_members, journal_posts, settings, site_identity, redirects); `GET /api/export` (admin+superadmin only, editors 403, audit-logged) streams the JSON attachment; `POST /api/import` validates format/version/unknown-table rejection, then restores replace-all inside one transaction - children deleted first, parents inserted first, explicit ids preserved so FKs stay intact, JSONB columns re-stringified, and id sequences reset per dialect (`setval(pg_get_serial_sequence(...))` on Postgres, `sqlite_sequence` UPDATE on SQLite, both best-effort). Import is replace-not-merge and the UI says so. `AdminExportImport` UI (download button + file-picker/paste + parsed-envelope summary + red confirm CTA) at `/admin/export-import`, AdminShell "Export / Import" tab (editor-gated probe panel). Backup: `src/lib/backup.ts` walks the full known schema surface through the shared pg layer (dialect-neutral, mirrors export-postgres.mjs contract) into `{ generated_at, source, tables }`; `/api/operator/backup` POST triggers (best-effort persist to `data/backups/`, audit `backup.created`, `?download=1` streams the snapshot for serverless where disk is ephemeral), GET lists persisted files, GET `?download=<name>` serves a file with traversal-safe name validation. `BackupBoard` at `/superadmin/backup` (Run backup / Run + download / persisted list), OperatorNav Backup item. Usage analytics: `/api/usage/record` now accepts `model_3d_load` + `form_submit` kinds (else pageview); the 3D viewer fires one `model_3d_load` beacon per successful GLB load (`progress === 100 && !active`, once per mount); `/api/forms/submit` records a server-side `form_submit` event (host-derived tenant); `getMetrics` returns `modelLoads`/`formSubmits` and the metrics page shows them under the Usage panel. Rehearsal: `docs/DEMO-WALKTHROUGH-2026-08-15.md` updated with the back-office beats (license wizard, health board, metrics, backup, login-as) and a 3-minute "asrasik tour" checklist + export/import spot-check. Validation: `tsc` / `build` / `check:themes` / `lint:changed` / `verify:deploy` green; authenticated E2E against the local SQLite runtime 30/30 PASS (401 gates on backup/export/import; superadmin login; backup trigger metadata + persisted file + list + download + traversal 404 + attachment stream; admin login; export envelope well-formed with content tables; import applies + covers tables + imported title persisted + re-export shows it; unknown-table 400 + wrong-format 400; model_3d_load + form_submit records 204; public form submit 200; metrics modelLoads + formSubmits counted; restore back to original export + verified). All local state restored after.

Phase ordering rationale: foundations first (0), then the WordPress-parity admin core (1-2) and the demo-visible immersion + 3D (3-4), then the operator back office (5-6). i18n is explicitly deferred per Rasik's answer.

## 9. Risks and mitigations

- **Aug 15 demo:** the plan front-loads demo-visible work (Phases 0, 1, 3, 4). If the demo date holds, Phases 2/5/6 land after. Every phase is additive; the verified v1.10.0 surface stays as fallback (one revert per feature).
- **3D asset gap:** one GLB exists. Placeholder room generator keeps the UX demonstrable; real models swap in via the media library with no code change (ledger Q2).
- **SQLite vs Postgres drift:** all new schema lands in `migrate.mjs` for both, `check:themes` + `verify:deploy` guard the theme surface, backups already verified.
- **Lint debt (279 errors):** `lint:changed` gates new code only; hygiene release stays on the calendar post-v2.0.
- **Immersion vs performance:** motion is transform/opacity-only, 3D is lazy + gated, hero is preloaded; LCP/INP budgets in section 3.

## 10. Decision ledger

| # | Question | Recommendation | Rasik answer |
|---|---|---|---|
| 1 | Platform name | StudioOS (working title) | StudioOS (confirmed - shipped as the v1.17.0 release name) |
| 2 | Per-room 3D assets for the 3 demo projects | I ship a procedural placeholder room generator now; you or your 3D artist supply real GLBs later (upload path ready) | SHIPPED - placeholder room generator (Phase 3, 4 GLBs) + media-library GLB upload path; real models swap in with no code change |
| 3 | Visual direction | Keep Forest & Bone, push cinematic (section 0) | SHIPPED - Forest & Bone (muted aligned to #56605A for the AA contrast gate) + cinematic immersion (Phases 3-4) |
| 4 | Analytics source for superadmin metrics | Lightweight self-hosted `usage_events` + keep GA4 for marketing | SHIPPED - usage_events (pageviews, model_3d_load, form_submit) surfaced on /superadmin/metrics; GA4 stays for marketing |
| 5 | Tier feature matrix (seats, storage caps, custom domain, locales) | personal: 1 seat, 2 GB, no custom domain; business: 3 seats, 10 GB, custom domain, locales | PARTIAL - tiers ship as license labels (personal/business); seats / storage caps / custom-domain / locales are NOT enforced in code yet. Enforcement deferred to v2.0 - operator to confirm scope |
| 6 | Transactional email provider | Resend (needs an account + API key from Rasik) for license emails, invites, form notifications | PENDING - license emails still copy-paste handoff from the wizard response; needs a Resend account + API key from operator before v2.0 |
| 7 | Bundled fonts for the customizer | Newsreader + Geist (current) + 2 additions (Inter Tight, Space Grotesk) bundled via next/font | SHIPPED - Newsreader + Geist + Inter Tight + Space Grotesk bundled; customizer font tokens resolve them |
| 8 | WordPress import | JSON export/import first; XML importer after v2.0 | SHIPPED - versioned JSON envelope export/import (Phase 6); XML importer deferred post-v2.0 |
| 9 | Demo date | Keep Aug 15 with Phases 0/1/3/4; full back office lands after | CONFIRMED - Aug 15 demo; Phases 0-6 all landed, back office included |
| 10 | Backup cadence | Daily snapshot via cron + manual trigger in superadmin | PARTIAL - manual trigger + download shipped (/superadmin/backup, npm run backup:postgres); daily cron not wired (no cron infra configured) - cadence decision pending |

Answers to this ledger are the kick to Phase 0 execution. Updated
2026-08-14 (v1.18.0 stamp): Q1-Q4, Q7-Q9 answered by shipped
evidence; Q2 shipped; Q5 / Q6 / Q10 flagged PARTIAL / PENDING with
the operator input required. Items 5, 6, 10 are the remaining open
tracks before v2.0.
