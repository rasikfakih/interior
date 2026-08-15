# Etihad Interiors Theme (Envato)

A premium residential interior design theme. Sold on Envato. White-label
for any studio buyer via `/admin` + `theme.distro.json`. Includes an
operator console (`/superadmin`, gated) for the licensing studio.

> **Current: v2.0.0** (2026-08-15). Studio OS - the full studio
> operating system: leads Kanban, proposals with tracking, materials +
> BOQ, board canvas, offline diary, client portal on two domains, AI
> weekly reports, social autopilot, freemium billing. See `CHANGELOG.md`
> for the release history and `FREEZE-MARKER` for the frozen surfaces.
>
> **Read first in any new session** - the two master docs at the repo
> root: `masterinterior.md` (the technical map: what/why/how, stack,
> architecture with Mermaid diagrams in section 14, API surface, release
> history, open items) and `PROJECT-SOUL.md` (the compass: conviction,
> taste, and voice). Then `docs/CONTEXT.md` for the session narrative.

## Live demo

- **Public URL**: <https://ethinterior.vercel.app>
- **Admin demo**: <https://ethinterior.vercel.app/admin> (admin@example.com / demo)
- **Proposal demo** (view tracking, boards, BOQ total):
  <https://ethinterior.vercel.app/proposal/demo1234>
- **Client portal demo** (approvals, comments, diary):
  <https://ethinterior.vercel.app/portal/demoPortal>
- **Public install**: visit `/install`, enter purchase code + domain + tier.

Run `node scripts/migrate.mjs && node scripts/seed-plans.mjs && node
scripts/seed-demo.mjs` to create the demo rows the links above need.

## Studio OS (v2.0.0) - what's inside the console

| Module | Surface | What it does |
| --- | --- | --- |
| Lead Inbox + Kanban | `/admin/leads`, `/admin/leads/board` | Six-status funnel, drag across columns, budget totals per stage |
| Projects + Proposals | `/admin/client-projects/*` | Token proposal links with view counts, accept flow, WhatsApp share |
| Material Library | `/admin/materials`, `/admin/vendors` | Live cost per unit, categories, stock status, image uploads |
| Board Canvas | `/admin/client-projects/[id]/boards` | Freeform 2000x1500 moodboard, drag/resize/rotate, realtime |
| BOQ Engine | `/admin/client-projects/[id]/boq` | Indian GST + wastage, live material rates, versioning, export |
| Site Diary PWA | `/admin/client-projects/[id]/diary` | Offline-first logs, photo queue, voice notes, snag list |
| Client Portal | `/portal/{token}` + client-* domains | Approvals, comments, boards, BOQ, photos - no login |
| AI + Social | `/admin/ai`, `/admin/client-projects/[id]/social` | Weekly reports from site logs, caption autopilot, credit metering |
| Plans + Billing | `/admin/billing` | Free/Starter/Pro/Studio limits, mock checkout, Stripe/Razorpay keys |

## Two products from one repo

| Surface | Audience | Visible to buyers? |
| --- | --- | --- |
| `/`, `/projects`, `/projects/[slug]`, `/journal`, `/contact`, `/install` | Studio site visitors + Envato prospects | yes |
| `/superadmin/**` | Studio team only | no (gated by `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD`) |
| `/api/envato/webhook` | Envato purchase events | no (server-to-server) |
| `/admin` | The buyer's tenant admins once installed | yes |

The studio's own demo at `ethinterior.vercel.app` is just tenant row 1 in
`tenants`. Its `theme.distro.json` paints Etihad branding. Removing that
distro row repaints the demo with `Your Studio` defaults.

## Deploy

`npm run verify:deploy` is the pre-flight gate (19/19 checks). See
`OPERATOR.md` (canonical env list), `DEPLOY.md` (Vercel lifecycle),
`SHIP.md` (demo-URL runbook).

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
`postinstall` runs `migrate.mjs` + `seed-pages.mjs` + `apply-distro.mjs`
+ `stamp-demo-license.mjs`. The data store is Supabase Postgres when
`DATABASE_URL` is set (production), SQLite otherwise (local dev).

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

- Next.js 16.2.9 App Router + TypeScript (RSC by default; editable pages
  render `force-dynamic` and revalidate on admin writes)
- Tailwind v4, CSS-first config with theme tokens in `src/app/globals.css`
- Motion (`motion/react`) for UI; GSAP + Lenis for scroll-pinned hero
  and motion passes (reduced-motion aware)
- three.js + `@react-three/fiber` v9 + drei (lazy-loaded under the
  license gate) for 3D walkthroughs
- TipTap rich text editor (journal, projects, page-block rich text)
- NextAuth.js v4 (credentials, roles admin/editor/superadmin)
- Supabase Postgres as the production data store (`src/lib/pg.ts`);
  better-sqlite3 + drizzle ORM as the local-dev fallback
- Supabase Storage for media in prod (signed URLs, per-kind size caps);
  disk under `/uploads` locally
- `I18nProvider` over JSON locale files (`public/locales/{en,hi,mr}`)
- `@phosphor-icons/react` (duotone) icon surface
- `@dnd-kit` for block reorder in the page builder
- HMAC-SHA256 signed offline licenses, DB-backed via `license_doc`

## What's editable from `/admin` (the tenant-facing admin)

- Projects (rich text, gallery, 3D model upload, per-room walkthroughs,
  publish/unpublish)
- Journal (with categories, rich text body)
- Testimonials, team
- Pages (drag-reorder block builder with 15 block types, revisions,
  draft preview, per-page SEO, duplicate)
- Media library (DB-backed, alt text, folders, pin, picker)
- Menus (primary + footer, DB-driven navbar)
- Forms (builder + submissions inbox + CSV export)
- Redirects (301/302, DB-driven, no rebuild)
- Users/roles (admin/editor/superadmin with self-protection rules)
- Theme customizer (palette, fonts, density, radius, motion; 8 presets,
  live WCAG AA contrast rows)
- Site identity (brand name, logo, favicon), settings (contact, SEO,
  third-party links), newsletter, license, export/import

## What's editable from `/superadmin` (the studio-only operator console)

- Tenants list + detail: edit studio name, owner email, domain, tier,
  state, expiration, HMAC key; live health status
- License wizard: issue/extend/revoke HMAC-signed licenses; revenue
  ledger in cents
- Health board: live per-tenant `/api/health` probes, persisted status
- Metrics: tenants, revenue (total/30d/by-tier), usage (pageviews, 3D
  loads, form submits), audit trail
- Backup: snapshot every table to one JSON file; download
- Theme distributor: paste or upload a `theme.distro.json` per tenant
  (see `docs/theme-distro.schema.md`)
- Announcements (CRUD + public banner)
- Login-as (impersonate any tenant admin)
- HMAC rotation, demo reset

## License + nulling posture

See `LICENSE.md`. Public reads remain open without a license; admin
and 3D are gated. Tier features (3D viewer, multilingual) return
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
  app/                  Next.js 16.2.9 app router pages + api
    (public)/           buyer-facing site (Navbar, Footer, theme injection)
    admin/              tenant admin console
    superadmin/         operator-only console (gated)
    api/operator/       operator-only routes (gated)
    api/envato/webhook  Envato purchase intake (server-to-server)
  cms/blocks/           block registry (15 block types) + types
  components/
    admin/              admin widgets (BlockEditor, PageBuilder, MediaPicker, ...)
    operator/           operator-only client components
    projects-v2/        the current public projects experience
  lib/
    pg.ts               runtime data layer (Postgres; SQLite fallback)
    theme.ts            per-tenant distro palette -> CSS variables
    license.ts / license-gate.ts   HMAC sign/verify
    storage.ts / media.ts          Supabase Storage + media pipeline
    revalidate.ts       bump / revalidatePath after admin writes
data/
  theme.distro.json    studio demo's per-tenant override
  studio-brand.json    white-label fallback surface
public/
  demo/                  demo JPGs generated by scripts/gen-demo-assets.mjs
  models/seed/           reception-room.glb (real, ~259 KB)
  models/rooms/          procedurally generated placeholder rooms
  uploads/images/        JPGs for block-registry defaults
scripts/
  migrate.mjs            idempotent schema migration
  seed-pages.mjs         seeds the default pages/blocks
  apply-distro.mjs       apply a theme.distro.json to a tenant
  stamp-demo-license.mjs stamps the local demo license
  verify-deploy.mjs      the 19-check pre-flight gate
  lint-changed.mjs       diff-scoped eslint gate
  check-theme-presets.mjs / check-contrast.mjs / check-uptime.mjs
  seed-content.mjs       demo content seed (3 projects / journal / ...)
  smoke-*.mjs            authed/no-auth probes against a running server
docs/
  CONTEXT.md             append-only session narrative
  SESSION-TODO.md        structured gate (TS-IDs trace changes to commits)
  PLATFORM-V2-PLAN.md    the StudioOS platform plan + decision ledger
  theme-distro.schema.md  distro schema
  theme-distro.example.json
  CLIENT_HANDOFF.md      buyer runbook
  OPERATOR_QUICKREF.md   superadmin operator quick reference
  SALES_NOTES.md         sales primer
  feature-decisions.md   buyer-request log
graphify-out/            knowledge graph (graphify update .)
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

- `masterinterior.md` - the technical map (with Mermaid architecture
  diagrams in section 14)
- `PROJECT-SOUL.md` - the compass (conviction, taste, voice)
- `AGENTS.md` - agent rules: session protocol, map/compass pointers,
  graphify usage
- `docs/OPERATOR_QUICKREF.md` - operator quick reference
- `docs/CLIENT_HANDOFF.md` - per-buyer handoff procedure
- `docs/SALES_NOTES.md` - what buyers hear
- `docs/envato-sales-brief.md` - sales one-pager
- `docs/feature-decisions.md` - every buyer request counter
