# Make /admin work like WordPress - implementation plan

**Date:** 2026-07-13
**Operator ask:** "I want my admin panel to work like WordPress"
**Status:** Draft, awaiting operator sign-off before any code change

## 0. Read this first

This plan is the spec gate. No code on this workstream ships until the operator approves the scope. Two earlier plans cover adjacent shipped work and are referenced, not replaced:

- `docs/PLAN-EDITABLE.md` (TS-006) - shipped v1.4.0. CRUD for pages, projects, journal, testimonials, team, settings, site-identity, newsletter, install, media.
- `docs/CONTEXT.md` 2026-06-29 tier-gate decision - superadmin-only writes for license POST, HMAC rotate, demo reset, distro apply. Preserved here.

The admin already has CRUD for every entity. Live-update wiring shipped in v1.4.2 (TS-008). Atomic page-save shipped in v1.4.1 (TS-007). The complaint "doesn't work like WordPress" is not a missing-CRUD complaint. It is a persistence + propagation complaint.

## 1. Root cause, two tracks

**Track A - durability (the real bug).** On the live URL today writes evaporate across Vercel cold starts when `DATABASE_URL` is unset. `src/lib/pg.ts:97` documents a "Vercel hot-copy path" that copies `data/etihad.db` to `/tmp/etihad-{region}.db` for reads; writes to `/tmp` survive only until the next cold boot. The operator edits a project, sees the change briefly, then it is gone. This reads as "the admin doesn't work" but the code is correct - the runtime env is missing.

**Track B - propagation (the polish bug).** 13 write routes do not call `bump(...)` from `src/lib/revalidate.ts`, so even with a durable DB the public side stays stale until the next cold-start sweep or manual re-deploy. The genuinely-missed write routes (verified this session against `src/app/api/**`):

| Route | Method | Why it matters |
|---|---|---|
| `operator/issue` | POST | new license should refresh /install + /admin-shell |
| `operator/rotate-hmac` | POST | advances /install stamp, must flush /install |
| `operator/tenants/[id]` | PATCH/DELETE | tenant row change touches /admin-shell |
| `newsletter` | POST | public subscribe form - new subscriber appears in /admin/newsletter |
| `media/upload/local` | PUT | legacy local upload, feeds project/journal detail |
| `upload` | POST | legacy upload alias |

The others in the NOSBUMP list are read-only (`license` GET), webhook-side (`envato/webhook`), or auth (`operator/login`, `admin/license` POST which already throws to a superadmin flow). Those intentionally do not call bump.

## 2. Scope

### Phase A - operator env (no code, required)

Operator confirms `DATABASE_URL` is set on Vercel. Without it, every other phase is moot - writes will evaporate. This is a one-question check, not a code change. Logged here because it is the actual root cause of "doesn't work like WordPress."

Acceptance: `curl -sI https://ethinterior.vercel.app/api/health/db` returns the `x-etihad-db` header with `postgres` (or at minimum does not 500). Once confirmed, Phase B and C are meaningful.

### Phase B - tail bump() on the 6 missed write routes

Smallest possible diff. One `bump({...})` or `bumpAll()` line appended to the happy-path tail of each route above. Mirrors the v1.4.2 ship pattern exactly - no new abstraction, no new helper.

Files (additive edits only):

- `src/app/api/operator/issue/route.ts` - `bump({ kind: "install" })` + `bump({ kind: "pages" })` (license issue touches install page)
- `src/app/api/operator/rotate-hmac/route.ts` - `bump({ kind: "install" })`
- `src/app/api/operator/tenants/[id]/route.ts` - `bumpAll()` (tenant row affects chrome + listings)
- `src/app/api/newsletter/route.ts` - `bumpAll()` (admin/newsletter view is cheap to flush wholesale)
- `src/app/api/media/upload/local/route.ts` - `bump({ kind: "media" })`
- `src/app/api/upload/route.ts` - `bump({ kind: "media" })`

The `EntityKind` union in `src/lib/revalidate.ts` already covers every kind these routes touch. No new case needed.

### Phase C - live probe the full loop

Run `node scripts/smoke-live-revalidate.mjs` against `https://ethinterior.vercel.app` once Vercel rebuild lands the bump-tail commit. Required env: `SMOKE_BASE_URL`, `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`. The smoke already exists from v1.4.2; no new test to write.

If the smoke fails on the "marker stamp did not show up" assertion, the gap is a Vercel-side cache layer or a missed bump - never a missing CRUD. Investigate before adding code.

### Phase D - deploy the already-shipped v1.4.3 detail routes

Side observation: `/projects-v2/` returns 308 and `/projects-v2/casa-mira` returns 404 on the live URL today. The v1.4.3 commit (066fd48) is on `main` but Vercel has not rebuilt. This is not admin-related; flagged here because the same Vercel rebuild that lands Phase B will also land the v1.4.3 detail routes. No code change.

## 3. Out of scope

- New editor types (WYSIWYG rich text, image crop, featured-image pick). Shipped already via `RichTextEditor.tsx` + `MediaPicker.tsx`. If the operator reports a specific gap, raise a new TS-ID.
- Editing for `/about`, `/contact`, `/voices`, `/install` copy. These are page-builder rows in the `pages` table, editable via `/admin/pages/[id]` already.
- Phase E cross-coldstart smoke. `scripts/smoke-editable-crossc.mjs` exists; the assertion-vs-design mismatch flagged in v1.4.0 CONTEXT is a <5-line cleanup for a separate TS-ID.
- The `src/components/AdminProjectForm.tsx` root-level orphan (frozen-path deletion candidate from v1.4.0 carry-forward). Separate TS-ID.
- Bumping to v1.5.0. Phase B lands as a v1.4.4 patch under the existing freeze marker, mirroring how v1.4.1/v1.4.2/v1.4.3 landed.

## 4. Freeze marker impact

Phase B touches unfrozen paths only:

- `src/app/api/operator/issue/route.ts` - under operator carve-out (v1.1.0)
- `src/app/api/operator/rotate-hmac/route.ts` - operator carve-out
- `src/app/api/operator/tenants/[id]/route.ts` - operator carve-out
- `src/app/api/newsletter/route.ts` - v1.4.2 increment already unfroze write-API routes for `bump(...)` tails
- `src/app/api/media/upload/local/route.ts` - v1.4.0 increment
- `src/app/api/upload/route.ts` - v1.4.0 increment

`src/lib/revalidate.ts` is **not** modified. No frozen file is touched. FREEZE-MARKER rolls forward from v1.4.3 to v1.4.4 with a new increment section enumerating the 6 tail additions and the bump-kind each one emits. `package.json` 1.4.3 -> 1.4.4. CHANGELOG v1.4.4 stamp.

## 5. Acceptance

- Operator confirms `DATABASE_URL` is set on Vercel (Phase A).
- `npx tsc --noEmit` exit 0.
- `npm run verify:deploy` 19/19 green.
- `npm run build` green; no new route registered.
- `node scripts/smoke-live-revalidate.mjs` PASS against the live URL after Vercel rebuild (the same harness that shipped in v1.4.2 - no new test file).
- `node scripts/smoke-routes.mjs` 39/39 unchanged.
- Manual: an admin edit to any of the 6 routes above reflects on the public side within the grace window.

## 6. Decision ledger

| # | Question | Default | Operator answer |
|---|---|---|---|
| 1 | Is `DATABASE_URL` set on Vercel right now? | unknown - operator must confirm | |
| 2 | Ship Phase B as v1.4.4 patch on top of v1.4.3? | yes | |
| 3 | Tier-gate preserved (superadmin writes unchanged)? | yes | |
| 4 | Add `bumpAll()` wholesale vs per-kind on the operator routes? | per-kind for issue/rotate, `bumpAll` for tenant PATCH/DELETE | |

Operator answers to this ledger are the kick to Phase B execution.
