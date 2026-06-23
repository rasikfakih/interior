# Deploy to Vercel (`ethinterior.vercel.app`)

v1.1.0 reference. For the canonical env list and STEP-BY-STEP first
visit see `OPERATOR.md` and `SHIP.md`.

## Strategy

1. **Single Vercel project**, this repo's `main`.
2. **SQLite persistence**: `data/etihad.db` is on the Vercel build image
   via `postinstall`. Every fresh container regenerates the DB from
   `scripts/migrate.mjs` + `scripts/seed-pages.mjs`. Tenant state is
   therefore reset-safe in production - the demo rebuilds to a
   known state on every deploy.
3. **Production buyer state** (issued licenses, pending tenant
   approvals, distro overrides) **does not persist** between Vercel
   container rebuilds. Either:
   - commit the resulting `data/etihad.db` once after first operator
     session, or
   - move to Supabase Postgres (v1.2).
4. **License**: stamped by `/install` on first visit. Operator issues
   a license payload at `/superadmin/issue`.
5. **Operator console**: gated by `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD`.

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
  | `ENVATO_WEBHOOK_SECRET` | HMAC secret string |
  | `NEXT_PUBLIC_GA4_ID` | optional |
  | `BLOB_READ_WRITE_TOKEN` | leave blank for v1.1.0 |

- Deploy. After first deploy, visit
  <https://ethinterior.vercel.app/install> to stamp the demo's license.

## What the demo shows

- A studio product homepage driven by the seeded `pages_blocks`.
- A working `PageRenderer` (block-based, drag-reorder from admin only).
- Visible 3D walkthroughs on the home page (real `.glb` seeded in
  `public/models/seed/`).
- A `/admin` route. Seeded admin email/password from the env above.
- An operator `/superadmin` console. Gated. Tenants list visible.
- A License banner when license is missing (visit `/install` first).
- A standard sitemap at `/sitemap.xml` and a `robots.txt`.

## Tenant demo state across deploys

The `tenants` table has one row (`slug = 'studio'`). Its
`data/theme.distro.json` paints Etihad branding. On Vercel container
rebuild, that distro is reapplied by `scripts/apply-distro.mjs` via
the `postinstall` chain.

To make this work, `postinstall` is:

```json
"postinstall": "node scripts/migrate.mjs && node scripts/seed-pages.mjs && node scripts/apply-distro.mjs --tenant=studio --file=./data/theme.distro.json"
```

If you change that to skip `apply-distro.mjs`, the demo will paint the
neutral `studio-brand.json` defaults on every rebuild. Not pretty for
Etihad, fine for white-label repaintings.

## Production buyers on custom domains

For the studio running its own production site, point the customer
domain at the deployment via the dashboard. Stripe / DNS plumbing is
documented in `OPERATOR.md §3`.

## Demo maintenance

After sale demos:

- Re-deploy via `vercel --prod` to pick up the latest `main`.
- The DB is re-seeded by `postinstall`. Operator-issued license payloads
  do not persist across container rebuilds (see the SQLite caveat).

If buyer-modified content matters post-deploy:

- snapshot `data/etihad.db` via `sqlite3 data/etihad.db ".dump"`
- commit the dump to `main` (this is the demo-friendly path)
- or implement Supabase (v1.2)

## Demo fallbacks

If `data/etihad.db` is stripped by Vercel between deploys, the
`postinstall` chain regenerates it from scripts. Visiting any tenant
URL replays the seed. The studio demo will accept a fresh `/install`
stamp on every container.
