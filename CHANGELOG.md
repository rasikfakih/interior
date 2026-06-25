CHANGELOG

# Etihad Interiors Theme - Built For Sale + Resell

## v1.1.0 - 2026-06-23 (current)

### What changed

This release converts the codebase from a single-license demo into a multi-tenant commercial product. The buyer-visible site stays in its v1.0.0 contract. New product surfaces live under a separate carve-out so they cannot accidentally ship into a buyer install.

### New surfaces (operator-only - not visible to buyers)

- **`/superadmin`** - tenant + license console (gated by `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` env)
  - Tenants list + filter
  - Tenant detail: edit tier, set expiration, mark revoked, change domain, paste distro
  - Issue license action: tenant HMAC-signed offline license payload
  - Theme distro apply: distribute `theme.distro.json` overrides per tenant
  - Rotate HMAC action: re-sign a tenant key; buyers re-stamp at /install
  - Metrics tile: total/active/pending/revoked/by-tier/expiring-7d/audit-7d

- **`/api/operator/**`** - seven operator-only routes (login, tenants CRUD, issue, rotate-hmac, metrics)
- **`/api/envato/webhook`** - Envato purchase intake, manual operator approval (no auto-issue)
- **`scripts/apply-distro.mjs`** - apply a `theme.distro.json` to a tenant locally

### Tenant model

- `tenants` table: slug, studio_name, owner_email, domain, tier, state, hmac_key, installed_at, expires_at, revoked_at
- `tenant_data` table: per-tenant JSON sidecar (distro, future settings overrides)
- All legacy tables preserved unchanged. Seed data + schema are backward-compatible.

### White-label pass (studio demo neutralised)

- `site_identity` default brand name: `Etihad Interiors` -> `Your Studio`
- Default settings rows: `contact_email`, `studio_address`, etc become placeholders
- `seed-pages.mjs` hero copy: Etihad-specific line removed, eyebrow becomes `Residential Studio`
- `data/theme.distro.json`: the Etihad-themed override lives here (read by `tenant-brand.ts`)
- `data/studio-brand.json`: white-label default surface used when a tenant has no distro row

The studio demo at `https://ethinterior.vercel.app` keeps painting as Etihad because the studio tenant's row 1 has `data/theme.distro.json` applied. Removing that distro row paints the demo as `Your Studio`.

### Public runtime impact

None. The demo at `/`, `/install`, `/admin`, `/projects`, `/journal`, `/contact` renders identically to v1.0.0. Buyers on a fresh install see neutral defaults until they (or the superadmin) apply a distro.

### Session continuity

- `docs/CONTEXT.md` - written so any new opencode session reads it first and picks up the build state, freeze status, and known tradeoffs
- `AGENTS.md` patched to point at it on every session start

### Verify-deploy gate additions (`scripts/verify-deploy.mjs`)

Added gates for: tenants row present, theme.distro.json present, studio-brand.json present, operator page tree present, envato webhook route present, GLB > 1 KB (rejects the 369-byte stub), demo JPGs (>= 8), upload JPGs (9 required paths).

## Lifecycle roll-forward

See `FREEZE-MARKER` for the new carve-outs. The freeze is rolled forward:

- v1.0.0 freeze remained in effect for buyer-visible code
- v1.1.0 added an explicit operator carve-out (above)
- White-label edits changed `seed-pages.mjs` and `site_identity` default content (string-only); no schema or route changes

## Post-deploy checklist (operator fills in)

- Deploy to `https://ethinterior.vercel.app` (auto-deploys from `rasikfakih/interior/main`)
- Verify `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` env vars are set in Vercel Production scope
- Run the SHIP.md §5 incognito smoke (4 checks) on the live URL
- Stamp CHANGELOG when first-visit passes

### Status

- **Status (operator fills in after deploy)**: `_PENDING_ - enter timestamp here on first success_`

---

## v1.1.2 - 2026-06-25 (planned, pending Supabase URL)

### Why

The v1.1.1 surface shipped. Operator reported that admin and superadmin login do not actually submit (`/admin` form returns the visual state "still on /admin"), `/journal` listing is empty, projects have no before/after images, the 3D walkthrough and admin/superadmin write paths do not persist between deploys, and these hit together with several smaller regressions. Investigation identified two structural problems that the bugfix band-aid cannot cover:

- **`db.ts` writes to `/tmp/etihad-{region}.db` (SQLite)** and Vercel serverless filesystems are ephemeral. Any admin save, superadmin save, tenant modification, license issue, theme distro apply, or testimonial save returns 200 but evaporates on the next cold start when the container rehydrates from the bundled `data/etihad.db`. The Phase 1 fix landed a `write-once /tmp copy` for **reads** (`4f64ca0`) but no fix exists for writes.
- **NextAuth CSRF hidden field on the deployed `LoginCard.tsx`** is rendering `value="12bbab…"` (token only). NextAuth v4 requires the value to be `<token>%<hash>` so it can match against the cookie. `getCsrfToken()` (next-auth/react) returns only the token half. The v1.1.1 `e7e7669` attempt was incomplete.

### Scope

Operator-confirmed:

- Full migration off SQLite to Supabase Postgres for all writes.
- All current tables migrate (users, tenants, tenant_data, projects, journal, testimonials, team, pages, pages_blocks, settings, site_identity, media, license, hmac_audit, distro).
- Tenants + tenant_data include the v1.1.0 schema even though the v1.1.0 ship modeled them locally only.
- `projects` table gains `before_image` and `after_image` columns (schema is incomplete today, confirmed).
- `/api/auth`, `/api/operator/*`, `/api/admin/*`, `/api/license`, `/api/journal/*`, `/api/team/*`, `/api/testimonials/*`, `/api/media/*`, `/api/pages/*`, `/api/projects/*`, `/api/settings`, `/api/envato/webhook`, `/api/upload` all run on Supabase.
- Local dev keeps SQLite via a `DATABASE_URL` branch in `db.ts`.
- Existing SQLite row contents export to SQL once and replay on first boot of the empty Postgres schema.
- v1.250 release. `package.json` bumps to `1.1.2`. `FREEZE-MARKER` rolls forward.

### What is in scope to land

| Phase | Deliverable | Status |
|---|---|---|
| 1 | `src/lib/db.ts` rewritten as a driver-branch (SQLite vs Postgres) selected by `DATABASE_URL`. Postgres schema mirrors current SQLite tables verbatim plus `before_image` and `after_image` on `projects`. Migration script exports `data/etihad.db` to a SQL dump that is replayed on empty Postgres. | pending `DATABASE_URL` |
| 2 | NextAuth provider wiring + superadmin operator API port + license / HMAC sign paths. JWT secret env contract preserved. | depends on 1 |
| 3 | NextAuth CSRF token reformat (proper `<token>%<hash>` plumbing). Re-run live `/admin` login probe on Vercel preview. Sign-off: form submit reaches `?error=CredentialsSignin` or `/admin/pages` not "nothing happens." | depends on 2 |
| 4 | `projects` schema additive update for before/after. Public `/projects` and `/projects/[slug]` read these columns. Journal listing fix: inspect whether `journal_posts` rows exist post-migration (probably not), seed at least three, fix slug resolver to match the listing. | depends on 3 |
| 5 | Admin and Superadmin write-path integrity smoke. Create a project in admin, sign in as superadmin, issue a license, apply a distro, verify the rows persist on the next cold-start container. | depends on 4 |
| 6 | Deploy + `npm run verify:deploy`. Cut this entry as the actual released v1.1.2 CHANGELOG bullet. Bump `package.json` to `1.1.2`. | depends on 5 |

### Out of scope this round

- Plain raw `<img>` tags in `PageRenderer.tsx`, `SpatialWalkthroughs.tsx`, `(public)/projects/[slug]/page.tsx` are not yet swapped for `next/image` (carry-forward from v1.1.1 session log).
- Pre-flight checklist from taste-skill Section 4.7 has not been run against the home page after the layout restructure.

### Public runtime impact at release

- `/admin` and `/superadmin` writes persist across cold starts.
- `/journal` lists at least three published posts and each `[slug]` resolves with content.
- `/projects/[slug]` shows a paired before/after image slot.
- Otherwise shape of the public site is unchanged.

### Pending gate

Operator to provide Supabase Project URL plus the `DATABASE_URL` (with the `?sslmode=require` Supabase query string) plus either `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_KEY` if the adapter requires them. Until these arrive, no code changes.

---

## v1.1.1 - 2026-06-25 (v1.1.0 post-deploy hotfix)

### Fixes

- **Admin login submit silently failed.** `src/app/admin/LoginCard.tsx` was a Client Component that read the CSRF cookie via inline script and stripped the signature with `.split('%')[0]`. The form POST hit `/api/auth/callback/credentials` with a token that lacked the matching hash, NextAuth rejected it silently, and operators experienced "nothing happens" when submitting the form. Replaced with a Server Component that calls `getCsrfToken()` and renders the full `<token>|<hash>` pair. Commit `e7e7669`.

- **`/admin` and `/superadmin` had the marketing navbar mounted on top of them.** The fixed-position `<Navbar />` was rendered in `src/app/layout.tsx`, which wraps every route, so the public chrome overlapped the operator login forms. Moved marketing pages (`/`, `/about`, `/contact`, `/projects`, `/journal`, `/install`) into a new `(public)` route group with its own `layout.tsx`. URLs are unchanged (route groups do not affect routing). `/admin` and `/superadmin` now resolve under the bare root layout (only providers, no chrome), so admin/operator surfaces render without the public navbar, footer, license banner, grain overlay, or smooth-scroll wrapper. Commit `4650a06`.

- **Two Unsplash image IDs in seed fallback components returned HTTP 404** (`photo-1613553497126-a44624272013` and `photo-1600585154340-be6161a89a2c`). They were referenced from `SelectedWork.tsx`, `SpatialWalkthroughs.tsx`, the projects list, and the project-detail page. Replaced at the same call sites with two verified-living residential Unsplash URLs (`photo-1565538810643-b5bdb714032a` and `photo-1600585154526-990dced4db0d`). `next.config.mjs` `images.remotePatterns` already allowed `images.unsplash.com`, no config change required. Same commit as the layout hotspotting fix, `4650a06`.

- **Home page sticky-stack pinned even when `prefers-reduced-motion` was set.** `src/components/ProcessStickyStack.tsx` read `window.matchMedia("(prefers-reduced-motion: reduce)").matches` inline at effect mount and did not subscribe to subsequent changes. Pinned siblings relied on the sticky stack running their `pin: true` ScrollTrigger, so a reduced-motion user could not release the pin mid-session. Replaced with React-state-driven `reduceMotion`, MQL change subscription with cleanup, and an effect dependency that re-runs on change. Commit `14cbb39`.

### Public runtime impact

None for marketing pages. The admin/operator login flows now submit successfully; project image fallbacks now resolve without 404s; the home process section collapses to natural scroll under reduce-motion.

### Compatibility

Bugfix-only. No schema changes, no route changes from the buyer's perspective, no new operator surfaces. Buyers on a fresh install see identical public output to v1.1.0.

---

## v1.0.0 - 2026-06-18 (historic)

### Scope freeze

This release was feature-frozen for sale to buyers:

- Hard freeze date: Day 2 of Room 0 (2026-06-18).
- Hard freeze scope: every code change after this point was bug-fix, copy edit, doc edit, or accessibility fix only.
- Hard freeze intent: a freshly installed v1.0 keeps behaving exactly like what is in this build.

Anything new was queued in `docs/feature-decisions.md` for v1.1 / Room 1 / Room 2.
The next room landed in v1.1.0 (this release) after one freeze-roll-forward session.

### Public runtime (v1.0.0)

- Public site reads from `pages_blocks` (CMS Room 0).
- `/install` stamps the license from purchase code, domain, tier.
- `/admin` requires login + valid license.
- License FeatureMatrix:
  - `feature.3d-viewer`: Personal = off, Business = on
  - `feature.multilingual`: Personal = off, Business = on
  - `feature.unlimited-pages` / `feature.unlimited-media`: Personal = capped, Business = unlimited
  - `feature.multi-domain`: Personal = 1 site, Business = 5 sites

### Migration hooks (v1.0.0)

- `node scripts/migrate.mjs` is idempotent. Re-runnable. Always safe to run.
- `node scripts/seed-pages.mjs` is conditional. Only seeds if `home` page row is missing.
