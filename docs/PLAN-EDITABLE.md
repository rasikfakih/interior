# TS-006 - Make-everything-editable Admin Scope Plan

**Date:** 2026-07-02
**Source:** Operator ask: "make everything editable from admin panel"
**Source-IDs:** docs/SESSION-TODO.md TS-006
**Status:** Draft, awaiting operator scope sign-off

This document is the spec gate for the editable-admin workstream. No code
on this workstream ships until this plan exists and the operator has
reviewed the phased scope.

---

## 1. What "editable from admin" means

Two consoles coexist:

- `/admin` (tenant content) - everything a studio edits day-to-day:
  projects, journal, testimonials, team, pages, media, settings,
  site identity, install metadata.
- `/superadmin` (studio ops) - operators only: tenants, license issue,
  HMAC rotate, metrics, audit log, demo reset. GET-only flows for
  admin role callers; mutating endpoints superadmin-only.

The operator ask "make everything editable from admin" is read as:
"every read-only field in /admin becomes editable; every data row
that currently lives in seed-only has CRUD in /admin." It explicitly
preserves the existing tiered role split.

Editing surfaces in /superadmin (superadmin-only) are intentionally
not widened to admin. They stay superadmin.

## 2. Current coverage matrix

| Domain | API routes | /admin index | /admin editor | Gaps |
|---|---|---|---|---|
| Pages + blocks | `/api/pages` GET/POST, `/api/pages/[id]` GET/PUT/DELETE, `/api/pages/[id]/blocks` GET/PUT | yes | yes (block-builder) | none |
| Projects | `/api/projects` GET/POST, `/api/projects/[id]` GET/PUT/DELETE | yes | yes | reads/writes snake_case; verified round-trip live |
| Journal | `/api/journal` GET/POST, `/api/journal/[id]` GET/PUT/DELETE | yes | yes | reads/writes snake_case; verified round-trip live |
| Testimonials | `/api/testimonials` GET/POST, `/api/testimonials/[id]` GET/PUT/DELETE | yes | yes | round-trip live |
| Team | `/api/team` GET/POST, `/api/team/[id]` GET/PUT/DELETE | yes | yes | round-trip live |
| Media | `/api/media` GET, `/api/media/list` GET, `/api/media/upload` POST, `/api/media/[id]` DELETE, `/api/media/[id]/sign` GET, `/api/uploads/local` GET | yes | yes (library view) | local + supabase modes |
| Settings | `/api/settings` GET, `/api/settings` POST (one-key-per-call only) | no | no | no list UI; no bulk editor |
| Site identity | none | no | no | entire row read-only via /api/health/db or direct pg |
| Newsletter subscribers | `/api/newsletter` POST (public form) | no | no | rows in `newsletter_subscribers` are write-only from public form, never viewable in /admin |
| Install metadata | `/api/install/stamp` GET/POST | no | no | install code -> tenant row not editable post-stamp |
| License | `/api/admin/license` GET (admin), POST (superadmin); `/api/license` GET (public read) | yes | partial | admin GET view exists |
| Tenant + distro | `/api/operator/tenants` GET/POST, `/api/operator/tenants/[id]` GET/PUT/DELETE, `/api/operator/issue` POST, `/api/operator/rotate-hmac` POST, `/api/operator/metrics` GET | n/a (superadmin console) | n/a | intentionally superadmin-only |
| Demo reset | `/api/admin/demo-reset` POST | n/a | n/a | superadmin-only by design |

Frozen surfaces (intentionally NOT in scope):

- Admin license POST/PUT and HMAC rotate POST are superadmin-only.
  The 2026-06-29 tier-gate decision stays.
- Theme distro apply is superadmin-only via operator console.

## 3. Phased scope

### Phase A - Settings editor (shippable scope)

**Goal:** every row in the `settings` table has CRUD in /admin.

**Files:**

- `src/app/api/settings/[key]/route.ts` (new): GET, PUT (replace),
  DELETE for one settings key. requireAdminSession. Mirrors the
  pattern from `/api/journal/[id]`.
- `src/app/admin/settings/page.tsx` (new): server route mounting the
  AdminSettings client component. Static-prerendered passthrough.
- `src/components/admin/AdminSettings.tsx` (new): two-pane editor -
  key/value table on the left, key search/filter on top, save
  checkmark inline, no modal. New key via "+ New setting" tile.
- `scripts/smoke-settings.mjs` (new): no-auth gating check.
  GET/PUT/DELETE /api/settings/123 -> 401; GET /api/settings -> 200.

**Smoke and ship rules:**

- verify:deploy 19/19
- build green
- smoke-settings.mjs green
- smoke-routes.mjs 36 entries unchanged (settings is admin-only so no
  public-route addition unless we widen smoke-routes scope)
- smoke-admin-live.mjs unchanged

### Phase B - Site identity editor (shippable scope)

**Goal:** the row in `site_identity` (brand_name, tagline,
accent_mode, footer_credit) is editable via a single GET-then-PUT
form in /admin/site-identity.

**Files:**

- `src/app/api/site-identity/route.ts` (new): GET (admin-gated for
  the editor; public read stays on its existing tenant-brand path),
  PUT (admin-gated). Single-row upsert.
- `src/app/admin/site-identity/page.tsx` (new): server passthrough.
- `src/components/admin/AdminSiteIdentity.tsx` (new): single form.
  brand_name + tagline + accent_mode (select: light | dark | auto)
  + footer_credit. Save button shows inline clock.
- `scripts/smoke-site-identity.mjs` (new): no-auth gating.

### Phase C - Newsletter subscribers viewer (shippable scope)

**Goal:** studio team can see who subscribed; can remove bad
addresses.

**Files:**

- `src/app/api/newsletter-subscribers/route.ts` (new): GET
  (admin-gated). Returns id + email + created_at. DELETE on the
  same id via `/api/newsletter-subscribers/[id]`. Sets
  is_active=false via soft-delete (preserves the public form's
  append-only history).
- `src/app/admin/newsletter/page.tsx` (new): server passthrough
  mounting AdminNewsletterList.
- `src/components/admin/AdminNewsletterList.tsx` (new): virtualised
  list (max 500 visible; older paginated). Search by email
  substring. Per-row deactivate (DELETE).
- `scripts/smoke-newsletter.mjs` (new): no-auth gating.

### Phase D - Install metadata viewer (shippable scope)

**Goal:** installer can see stamp history and optionally roll the
stamp forward (admin only; superadmin `rotate-hmac` is the
cryptographic reset and stays on /superadmin).

**Files:**

- `src/app/api/install/stamp/route.ts` (already exists at this
  path under app/api/install/stamp; verify shape; extend with PUT).
- `src/app/admin/install/page.tsx` (new): server passthrough.
- `src/components/admin/AdminInstallView.tsx` (new): read-only stamp
  display + "Advance stamp" button (PUT to /api/install/stamp
  advancing the value field by one). Audit-logged.
- `scripts/smoke-install.mjs` (new): no-auth gating + PUT/GET role check.

### Phase E - Consolidation smoke (Phase 8 from prior v1.1.2 plan)

Single cold-start round-trip across all editable surfaces:

- login
- create + edit + delete on each new endpoint
- assert rows survive an admin-process restart (cross-container)
- audit log entries present for every mutation

This is the acceptance test documents the v1.1.2 plan called for;
the editable workstream inherits it.

### Phase F - Final close-out

- CONTEXT.md §9 entry.
- SESSION-TODO.md update for each TS-ID child (TS-006-A through TS-006-E).
- CHANGELOG.md stamp.
- FREEZE-MARKER roll.

## 4. Operator pre-confirmations

This document is the spec gate. No code on the editable-admin
workstream ships until the operator confirms:

1. **Scope split.** Phase A-D each ship independently. Operator may
   ask for just one phase or all four.
2. **Tier-gate preservation.** The superadmin-only split on license
   POST, HMAC rotate, demo reset, distributor apply stays.
3. **Settings editor shape.** Two-pane key/value table vs single
   scroll list. Default is two-pane.
4. **Site identity editor scope.** brand_name, tagline, accent_mode
   (light/dark/auto), footer_credit, plus optional logo_url +
   favicon_url. Default is the named four.
5. **Newsletter subscribers as soft-delete with is_active flag**.
   Keeping history vs hard delete. Default is soft-delete.
6. **Install metadata as read-with-advance** vs read-only. Default is
   read-with-advance.
7. **Audit log.** Every mutation gets an appendAudit entry. Live today
   on superadmin routes; the new admin-routes do not emit audit
   entries by default. Operator to confirm whether Phase A-D routes
   emit audit entries.

## 5. Acceptance contract

A TS-006-A (settings editor) ship requires:

- verify:deploy 19/19
- npx tsc --noEmit exit 0
- npm run build green
- All previously-passing smokes still pass:
  smoke-routes 36/36, smoke-render 32/32, smoke-admin-live ALL GREEN,
  smoke-api 16/16, smoke-role (401/403/200 split)
- New: scripts/smoke-settings.mjs PASS
- Live probe: `/admin/settings` 200 (after Vercel rebuild) with all
  rows visible.
- Auth probe: anonymous GET /api/settings/foo -> 401. Anonymous
  PUT -> 401. Authenticated admin GET -> 200. Authenticated
  admin PUT -> 200 row visible.

Each child phase has the same shape with its own smoke script.

## 6. Out-of-scope

Out-of-scope for TS-006 unless explicitly requested:

- Block-editor enhancements beyond current schema-driven surface
- Bulk import/export of any table
- Multi-user concurrent-edit lock
- Image-crop, video-trim, GLB-asset-edit tooling inside admin
- Audit-log viewer redesign (lives in /superadmin today)
- Two-factor auth on /admin

## 7. Ship sequencing

Recommended order: A -> B -> C -> D -> E -> F. Each phase is one
or two commits. Operator may pick any subset and the plan persists
unchanged.

The cumulative commit run rates are tunable. Default pace is
"Phase A ships, operator confirms, Phase B ships, ..."

If the operator pre-confirms all of A-D in one shot, the four
phases ship as a single v1.4.0 release with Phase E as the
cross-coldstart acceptance test and Phase F as the stamp.

v1.4.0 path is the natural freeze marker for this workstream.

## 8. Decision-ledger entry

Once a phase ships, this document is updated inline with the
operator-confirmed shape and a reference to the ship commit. The
acceptance contract remains the same; only the shipped file count
moves.

---

**Open operator questions:**

1. Approved scope = all four phases A-D, or a subset?
2. Tier-gate preservation confirmed (yes - default)?
3. Settings editor shape = two-pane (yes - default)?
4. Site identity editor fields = brand_name / tagline / accent_mode
   / footer_credit only (yes - default), or include logo_url /
   favicon_url now?
5. Newsletter subscribers soft-delete (yes - default)?
6. Install metadata read-with-advance (yes - default)?
7. Audit-log entries on /admin writes (yes - default)?
8. v1.4.0 single release or phased per A-D?

Operator answer is the kick to the next session's create-TS-ID
row entries in docs/SESSION-TODO.md.
