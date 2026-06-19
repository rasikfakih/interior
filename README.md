# Etihad Interiors Theme (Envato)

A premium residential interior design theme with admin-editable content,
Tiptap rich text, page builder, media library, license enforcement,
visible 3D walkthroughs, and a built-in multilingual shell.

> **v1.0.0 — feature-frozen.** See `CHANGELOG.md` for the freeze marker
> and `AGENT_BEST_PRACTICES.md` for how buyer requests are recorded
> in `docs/feature-decisions.md`.

## Live demo

- **Public URL**: <https://studioos.studio>
- **Public install**: visit `/install`, enter purchase code + domain + tier

## Deploy

This repo is wired for a direct Vercel deploy of `studioos.studio`
in production. See `OPERATOR.md` for the canonical env list and
`DEPLOY.md` for lifecycle and reboot steps. Run `npm run verify:deploy`
before clicking Deploy.

> 📦 **Going to ship right now?** Read [SHIP.md](./SHIP.md) — it's a
> 1-page run-book from pre-flight → DNS → smoke.

The full operator cronology lives in:
- **`SHIP.md`** — the deploy run-book
- **`OPERATOR.md`** — env matrix, smoke matrix, redeploy rules
- **`DEPLOY.md`** — long-form Vercel lifecycle


## Quick install

```bash
npm install
./install.sh --code=YOUR_ENVATO_PURCHASE_CODE --domain=yourdomain.com --tier=business
npm run build
npm start
```

Open `/install` if you skipped the install flag, or `/admin/license`
later to re-stamp the license.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind v4 with theme tokens in `src/app/globals.css`
- GSAP + Lenis (smooth scroll)
- Three.js / React Three Fiber (lazy-loaded)
- Tiptap rich text editor (journal, project descriptions, page-block rich text)
- NextAuth.js (credentials)
- better-sqlite3 + drizzle ORM
- React-i18next + a CMS-backed translation table

## What's editable from /admin

- Projects (with rich text, gallery, 3D model upload, publish/unpublish)
- Journal (with categories, rich text body)
- Testimonials, team
- Pages (drag-reorder block builder, 13 block types)
- Media library (DB-backed, alt-text, picker)
- Menus (primary + footer)
- Site identity (brand name, logo, favicon)
- Translations (per-locale)
- Settings (contact, SEO, third-party links)
- License (Envato purchase code, domain, tier)

## License + nulling posture

See `LICENSE.md`. Public reads remain open without a license; admin
and 3D are gated. Tier features (`feature.3d-viewer`,
`feature.multilingual`, etc.) return 423 when missing.

## Demo assets

Replace `/public/demo/*.jpg` and `/public/models/seed/*.glb` with
real product assets before shipping the demo URL.

## Project structure

```
src/
  app/                  # Next.js app router pages + api
  components/           # Public components + admin widgets
  cms/blocks/           # Block registry (PageRenderer uses this)
  lib/                  # auth, db, schema, license, media, pages
public/
  demo/                 # bundled interior stock images
  models/seed/          # demo .glb placeholders
scripts/
  migrate.mjs           # idempotent schema migration
  seed-pages.mjs        # home page with default blocks
data/
  license.json          # stamped at install
  license-template.json # holds the empty shape
  demo-media.json       # demo asset index
```
