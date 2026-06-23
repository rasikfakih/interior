# Etihad Interiors Theme (Envato)

A premium residential interior design theme. Sold on Envato. White-label
for any studio buyer via `/admin` + `theme.distro.json`. Includes an
operator console (`/superadmin`, gated) for the licensing studio.

> **v1.1.0 - shipped.** See `CHANGELOG.md` for the v1.1 entry and the
> `FREEZE-MARKER` for the operator carve-out.
> Read `docs/CONTEXT.md` first in any new opencode session.

## Live demo

- **Public URL**: <https://ethinterior.vercel.app>
- **Public install**: visit `/install`, enter purchase code + domain + tier.

## Two products from one repo

| Surface | Audience | Visible to buyers? |
| --- | --- | --- |
| `/`, `/projects`, `/journal`, `/contact`, `/install` | Studio site visitors + Envato prospects | yes |
| `/superadmin/**` | Studio team only | no (gated by `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD`) |
| `/api/envato/webhook` | Envato purchase events | no (server-to-server) |
| `/admin` | The buyer's tenant admins once installed | yes |

The studio's own demo at `ethinterior.vercel.app` is just tenant row 1 in
`tenants`. Its `theme.distro.json` paints Etihad branding. Removing that
distro row repaints the demo with `Your Studio` defaults.

## Deploy

`npm run verify:deploy` is the gate. See `OPERATOR.md` (canonical env
list), `DEPLOY.md` (long-form Vercel lifecycle), `SHIP.md` (demo-URL runbook).

## Quick install for a buyer

```
git clone https://github.com/rasikfakih/interior.git
cd interior
./install.sh --code=YOUR_ENVATO_PURCHASE --domain=yourdomain.com --tier=business
npm install
npm run build
npm start
```

`/install` writes `data/license.json` keyed to the buyer's domain.
`postinstall` runs `migrate.mjs` + `seed-pages.mjs`.

## Quick studio-side onboarding

1. Buyer purchases on Envato. Envato pings `/api/envato/webhook` with
   the purchase code.
2. The webhook creates a `PENDING_TENANT` row. License not auto-issued.
3. Operator signs in at `/superadmin`. Approves the tenant row, sets
   tier + expiration, applies a `theme.distro.json` override.
4. Operator clicks **Issue license**. JSON payload surfaces with the
   HMAC signature.
5. Operator relays the JSON to the buyer, who runs `./install.sh` with
   the buyer's domain. The `data/license.json` is written from the
   issued payload.

## Stack

- Next.js 16 App Router + TypeScript (RSC by default)
- Tailwind v4 with theme tokens in `src/app/globals.css`
- GSAP + Lenis (smooth scroll, scope-pinned hero)
- three.js + `@react-three/fiber` (lazy-loaded under license gate)
- Tiptap rich text editor (journal, project descriptions, page-block rich text)
- NextAuth.js (credentials)
- better-sqlite3 + drizzle ORM (local); Supabase Postgres port in v1.2
- React-i18next + a CMS-backed translation table

## What's editable from `/admin` (the tenant-facing admin)

- Projects (with rich text, gallery, 3D model upload, publish/unpublish)
- Journal (with categories, rich text body)
- Testimonials, team
- Pages (drag-reorder block builder, 13 block types)
- Media library (DB-backed, alt text, picker)
- Menus (primary + footer)
- Site identity (brand name, logo, favicon)
- Translations (per-locale)
- Settings (contact, SEO, third-party links)
- License (Envato purchase code, domain, tier)

## What's editable from `/superadmin` (the studio-only operator console)

- Tenants row: edit studio name, owner email, domain, tier (personal/business),
  state (active/pending/suspended/revoked), expiration date, HMAC key.
- License issuance: tenant HMAC-signed offline license payload.
- Theme distributor: paste or upload a `theme.distro.json` per tenant
  (see `docs/theme-distro.schema.md`).
- HMAC rotation: per-tenant key with auto-generated replacement.
- Metrics: total tenants, by tier, expiring in 14 days, recent audit log.

## License + nulling posture

See `LICENSE.md`. Public reads remain open without a license; admin
and 3D are gated. Tier features (3D viewer, multilingual, etc.) return
423 when missing. Buyers on a fresh install with no distro applied see
neutral defaults ("Your Studio", placeholders) until the operator
applies a distro.

## White-label

Each install runs as its own tenant. Brand cluster is keyed by the
tenant's distro row. Edit `data/studio-brand.json` to change the
white-label fallback that ships with the bundle.
`data/theme.distro.json` is the studio demo's tenant override.

## Project structure

```
src/
  app/                  Next.js 16 app router pages + api
    superadmin/         operator-only console (gated)
    api/operator/        operator-only routes (gated)
    api/envato/webhook   Envato purchase intake (server-to-server)
  components/
    operator/           operator-only client components
  cms/blocks/           block registry (PageRenderer)
  lib/
    operator-store.ts    tenant + license + distro data layer
    operator-auth.ts    operator cookie session
    tenant-brand.ts      per-tenant brand reader
data/
  theme.distro.json    studio demo's per-tenant override
  studio-brand.json    white-label fallback surface
public/
  demo/                  8 demo JPGs matching data/demo-media.json
  models/seed/           reception-room.glb (real, ~259 KB)
  uploads/images/        9 JPGs for block-registry defaults
scripts/
  apply-distro.mjs       apply a theme.distro.json to a tenant
  dev-archive/           v1.0.0 prototype scripts, kept for history
docs/
  CONTEXT.md             session continuity harness
  envato-sales-brief.md  Envato one-pager
  theme-distro.schema.md  distro schema
  theme-distro.example.json
  CLIENT_HANDOFF.md      buyer runbook
  OPERATOR_QUICKREF.md   superadmin operator quick reference
  SALES_NOTES.md         sales primer
  feature-decisions.md   buyer-request log (from v1.0.0 freeze)
```

## Demo assets

`public/demo/*.jpg` and `public/uploads/images/*.jpg` are generated at
bundle time via `scripts/gen-demo-assets.mjs` from procedural SVG. They are
deterministic and replaceable: drop in real photographs and re-run
`scripts/seed-pages.mjs` to repoint the seeded block defaults.

## File listings for buyers

- `INSTALL.md` - one-line install walkthrough
- `LICENSE.md` - tier matrix + nulling posture
- `OPERATOR.md` - studio operator crib sheet
- `SHIP.md` - runbook for promoting `main` to Vercel demo URL
- `DEPLOY.md` - long-form Vercel deployment lifecycle

## File listings for studio team

- `docs/OPERATOR_QUICKREF.md` - operator quick reference
- `docs/CLIENT_HANDOFF.md` - per-buyer handoff procedure
- `docs/SALES_NOTES.md` - what buyers hear
- `docs/envato-sales-brief.md` - sales one-pager
- `docs/feature-decisions.md` - every buyer request counter
