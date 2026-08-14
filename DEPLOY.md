# Deploy to Vercel (`ethinterior.vercel.app`)

Current reference (v1.18.0). For the canonical env list and STEP-BY-STEP
first visit see `OPERATOR.md` and `SHIP.md`. For the architecture in
pictures, see `masterinterior.md` section 14 (deployment topology).

## Strategy

1. **Single Vercel project**, this repo's `main`.
2. **Postgres persistence**: with `DATABASE_URL` set, the production
   store is Supabase Postgres (`src/lib/pg.ts`, schema applied
   idempotently by `ensureMigrated` on cold start). Tenant state,
   license state (`license_doc`), and distro overrides persist across
   container rebuilds. SQLite remains the local-dev fallback when
   `DATABASE_URL` is unset.
3. **Seed determinism**: the `postinstall` chain
   (`migrate.mjs` -> `seed-pages.mjs` -> `apply-distro.mjs`
   -> `stamp-demo-license.mjs`) regenerates a known state on every
   fresh checkout. Production writes (issued licenses, pending
   approvals, buyer content) live in Postgres and are never lost to
   an ephemeral filesystem.
4. **Storage**: media uploads go to Supabase Storage (signed URLs) in
   production, disk under `/uploads` locally.
5. **License**: stamped by `/install` on first visit. Operator issues
   a license payload at `/superadmin/issue`.
6. **Operator console**: gated by `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD`.

## One-shot deploy

```bash
vercel --yes --confirm --prod
vercel dns add <your-project> ethinterior.vercel.app
```

Or via the Vercel dashboard:

- Import this git repository.
- Set **Environment Variables** (full list in `OPERATOR.md §2`):

  | Key | Value |
  | ---- | ----- |
  | `NEXTAUTH_URL` | `https://ethinterior.vercel.app` |
  | `NEXTAUTH_SECRET` | `openssl rand -base64 32` output |
  | `NEXT_PUBLIC_SITE_URL` | `https://ethinterior.vercel.app` |
  | `ADMIN_EMAIL` | studio admin email |
  | `ADMIN_PASSWORD` | strong password (re-stamp after first login) |
  | `LICENSE_HMAC_KEY` | change from the demo default |
  | `SUPERADMIN_EMAIL` | operator console email |
  | `SUPERADMIN_PASSWORD` | operator console password (different from `ADMIN_PASSWORD`) |
  | `DATABASE_URL` | Supabase Postgres connection string (production store) |
  | `SUPABASE_URL` | Supabase project URL (Storage) |
  | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (Storage + admin) |
  | `ENVATO_WEBHOOK_SECRET` | HMAC secret string |
  | `NEXT_PUBLIC_GA4_ID` | optional |

- Deploy. After first deploy, visit
  <https://ethinterior.vercel.app/install> to stamp the demo's license.

## What the demo shows

- A studio product homepage driven by the seeded `pages_blocks` and the
  v2 projects surface (`/projects-v2`, `/projects-v2/[slug]`).
- A working `PageRenderer` (block-based, drag-reorder from admin only,
  15 block types).
- Visible 3D walkthroughs (project + per-room `.glb`s, seeded and
  procedurally generated).
- An `/admin` route. Seeded admin email/password from the env above.
- An operator `/superadmin` console (tenants, license wizard, health,
  metrics, backup, login-as, announcements).
- The theme customizer and `/themes` preset showcase.
- A License banner when license is missing (visit `/install` first).
- A standard sitemap at `/sitemap.xml` and a `robots.txt`.

## Tenant demo state across deploys

The `tenants` table has one row (`slug = 'studio'`). Its distro row in
`tenant_data` (`kind = 'distro'`) paints Etihad branding. On a fresh
checkout, the `postinstall` chain re-applies `data/theme.distro.json` via
`apply-distro.mjs`. On a live Postgres-backed deploy, the row persists
and edits made in `/admin` survive redeploys.

To make this work, `postinstall` is:

```json
"postinstall": "node scripts/migrate.mjs && node scripts/seed-pages.mjs && node scripts/apply-distro.mjs --tenant=studio --file=./data/theme.distro.json && node scripts/stamp-demo-license.mjs --allow-skip"
```

If you change that to skip `apply-distro.mjs`, the demo will paint the
neutral `studio-brand.json` defaults on every rebuild. Not pretty for
Etihad, fine for white-label repaintings.

## Production buyers on custom domains

For the studio running its own production site, point the customer
domain at the deployment via the dashboard. DNS plumbing is documented
in `OPERATOR.md §3`.

## Demo maintenance

After sale demos:

- Re-deploy via `vercel --prod` to pick up the latest `main`.
- On Postgres, buyer-modified content and operator-issued licenses
  persist across rebuilds; nothing needs re-seeding.
- Before any live DB write (distro apply, seed, tenant change), take a
  backup: `npm run backup:postgres` (JSON snapshot, read-only, verifies
  row counts) plus a full `pg_dump -Fc` (see `OPERATOR.md §15`).

## Demo fallbacks

If the local DB is stripped between deploys, the `postinstall` chain
regenerates it from scripts. On serverless read-only hosts,
`stamp-demo-license.mjs` refuses cleanly (no write possible) instead of
crashing the build. Visiting any tenant URL replays the seed.
