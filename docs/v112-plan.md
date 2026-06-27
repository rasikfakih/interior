# v1.1.2 plan - operator-approved scope

Approved by operator on 2026-06-27. Eight phases. Stop and verify at
the end of each phase. Runs across sessions; each session closes with
`npm run graphify:update` and an entry in `docs/CONTEXT.md`.

**Operator said:** admin and superadmin can log in (CSRF shape now
correct, cookie verbatim was wrong) but cannot update or save anything
because no write path is durable and the editor surfaces are missing.
Operator wants WordPress-grade editability, scope:

- Two consoles: `/admin` (tenant content) and `/superadmin` (studio ops)
- Runtime: Supabase Postgres only, SQLite dropped from runtime
- Media: Supabase Storage, image / GLB / video / pdf / raw
- Pages: TipTap WYSIWYG, drag-reorder blocks, all registry blocks editable,
  add / delete / change slug per page
- Roles: admin / superadmin (unchanged)
- Migration: replay bundled SQLite + seed defaults on first boot
- Acceptance: API smoke per editable entity
- Version: v1.1.2-DEPLOYED when smoke passes

## Frame

| Path now | What's wrong at end of session 2026-06-27 |
|---|---|
| `data/etihad.db` (read-only hot-copy at `/tmp/etihad-{region}.db` on Vercel) | 18 rows total. Missing `journal`, `team`, `pages_blocks`, `license`, `hmac_audit`, `distro` tables. Empty `projects`, `testimonials`, `media`. Writes vanish on cold start. |
| `/admin` SSR | Login works (verified). Editor surfaces not present. |
| `/superadmin` | Same. |
| `src/lib/db.ts` | SQLite-first, Postgres optional. Phase 1 must invert. |
| `src/lib/auth.ts` | Reads user table. Discards superadmin gate. Will need a role-check wrapper. |
| Media pipeline | No storage backend wired. Procedural-JPG demos only. |
| Pages builder | `PagesAdmin.tsx` is a per-block form list. Not reorderable, not WYSIWYG. |
| Project / journal / testimonial / team CRUD forms | `AdminProjectForm.tsx` and `AdminJournalForm.tsx` exist as stubs. Save path not wired. |

## Phase 0 - export + plan doc (this session landing)

- `scripts/export-sqlite.mjs` runs against the repo-local SQLite and writes `data/etihad-backup-YYYY-MM-DD.json`.
- Pre-Postgres-cutover insurance. No freeze-marker code touched.
- `docs/CONTEXT.md` session log appended.
- Output: `data/etihad-backup-2026-06-27.json` is the snapshot.

## Phase 1 - Postgres-only runtime

- `src/lib/db.ts` rewrites so `DATABASE_URL` is the only path on Vercel.
- `src/lib/auth.ts` becomes Postgres-aware only.
- `src/lib/initDb.ts` ported to Postgres: ensures `media`, `journal`,
  `team`, `pages_blocks`, `license`, `hmac_audit` tables all exist.
- `scripts/migrate-supabase.mjs` becomes the canonical one-shot
  replay-and-seed that runs on first boot.
- Live probe: studio@ login still works, /admin + /superadmin
  render, projects / journal / pages lists visible.

## Phase 2 - Media pipeline

- `src/lib/storage.ts` exports typed wrappers around Supabase Storage SDK.
- `app/api/media/upload/route.ts` (POST) - presigned-URL or direct,
  depending on size. Per-type cap (image 8MB, GLB 25MB, video 80MB,
  pdf 25MB, raw 50MB).
- `app/api/media/list/route.ts` (GET, paginated by cursor).
- `app/api/media/[id]/route.ts` (DELETE).
- `media` Postgres table extended with `storage_path`, `size`, `mime`,
  `width`, `height` (for images), `kind` (image / glb / video / pdf /
  raw), `original_name`.
- Auth gate via NextAuth session.

## Phase 3 - Media library UI

- `src/app/admin/media/page.tsx` (replaces current).
- `src/components/admin/MediaGrid.tsx` (image thumbnails, GLB inline,
  video poster, pdf cover).
- `src/components/admin/MediaPicker.tsx` (modal used by PagesAdmin).
- Lazy-loaded three.js viewer in `MediaGrid.tsx` only when a GLB
  row is visible.
- Drag-drop upload zone + file-size error UI.

## Phase 4 - Pages builder (TipTap)

- Replace `src/components/admin/PagesAdmin.tsx` with a v2 that loads
  `@tiptap/react`.
- New `src/components/admin/PageBuilder.tsx` (drag-drop block list
  sourced from `src/cms/blocks/registry.ts`).
- New `src/app/admin/pages/page.tsx` index (add / delete / list).
- New `src/app/admin/pages/[id]/page.tsx` editor.
- All eight registry blocks become drag-reorder items.

## Phase 5 - Project CRUD

- New `src/app/admin/projects/page.tsx` (list, search, sort).
- New `src/app/admin/projects/[id]/page.tsx` (form).
- New `app/api/projects/route.ts` (POST/GET).
- New `app/api/projects/[id]/route.ts` (PUT/DELETE).
- `projects.before_image` and `projects.after_image` columns added.
- Default seed rows (3 studios) lifted to `scripts/seed-content.mjs`.

## Phase 6 - Journal CRUD

- Same shape as Phase 5.
- Slug format audit + resolver fix.
- 3 default posts.

## Phase 7 - Testimonials, team, about, contact, install

- Phase 5 shape repeated per content type.
- Testimonials: name, role, quote, photo (media library).
- Team: name, role, photo, bio.
- About page: title + body in TipTap rich-text + photo + team list.
- Contact page: address, phone, email, hours.
- Install page: a small generator form. Re-brand on save.

## Phase 8 - Smoke + ship

- `scripts/smoke.mjs` POST/GET/PUT/DELETE per API surface, asserts
  rows visible from a fresh boot. Exit 0 means shippable.
- `CHANGELOG.md` entry: `## v1.1.2 - 2026-06-XX` with phase-by-phase call-out.
- `package.json` bumped to `1.1.2`.
- `FREEZE-MARKER` rolled forward past the phase scope.

## Touched freeze-marker paths

Per `docs/CONTEXT.md` §4:

- `src/lib/db.ts`
- `src/lib/auth.ts`
- `src/lib/initDb.ts`
- `src/lib/schema.ts`
- `src/lib/storage.ts` (new)
- `src/components/admin/PagesAdmin.tsx` (replace)
- `src/components/admin/PageBuilder.tsx` (new)
- `src/components/admin/MediaGrid.tsx` (modify)
- `src/components/admin/MediaPicker.tsx` (modify)
- `src/app/admin/**` (multiple new + substantial)
- `app/api/media/**` (new)
- `app/api/projects/**` (new)
- `app/api/journal/**` (new)
- `app/api/testimonials/**` (new)
- `app/api/team/**` (new)
- `scripts/migrate.mjs` (substantial changes)
- `scripts/seed-content.mjs` (substantial changes)

Each touch logged in a session entry in `docs/CONTEXT.md`.
