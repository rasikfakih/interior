# INSTALL - Etihad Interiors Theme v1.18.0

## One-line

```bash
./install.sh --code=YOUR_PURCHASE --domain=yourdomain.com --tier=business
```

This:

1. Installs npm deps if missing. `package.json` declares a `postinstall`
   hook that runs `migrate.mjs` + `seed-pages.mjs` + `apply-distro.mjs` +
   `stamp-demo-license.mjs`, so the schema and seeded pages are **always**
   present after a clean install (SQLite locally, Postgres when
   `DATABASE_URL` is set).
2. Runs the idempotent database migrations in `scripts/migrate.mjs`.
   Creates `tenants`, `tenant_data`, plus all legacy tables.
3. Seeds the default `home` page with the studio's block composition.
4. Seeds a default tenant (`tenants.slug = 'studio'`) using
   `data/theme.distro.json` if available (see "White-label setup" below).
5. Signs a license into `data/license.json` (offline HMAC, no internet).

## Apply a custom distro at install time

If the operator issued a `theme.distro.json` for this buyer:

```bash
./install.sh --code=YOUR_PURCHASE --domain=yourdomain.com --tier=business --distro=/path/to/theme.distro.json
```

This runs `scripts/apply-distro.mjs` against tenant `studio` (default)
after the seed step. Idempotent.

## Why the demo SQLite is not in the repo

The repo deliberately keeps `data/etihad.db` out of source control
(`.gitignore` excludes it). Three reasons:

- The DB is **regenerated on every install** via `postinstall`. There
  is no information you would gain by committing it.
- Buyers cloning the repo want a clean install state. A committed DB
  drifts with the developer's environment and confuses support.
- The Vercel demo (at `ethinterior.vercel.app`) reproduces the homepage
  deterministically via `scripts/seed-pages.mjs` against an
  ephemeral filesystem.

If you want the demo to **statically** match a specific DB state
(custom seeded content, demo admin email, etc.), set the env
variables in `OPERATOR.md` and let `seed-pages.mjs` populate the
schema. Don't commit a binary DB.

## Manual install (no install.sh flag)

```bash
npm install
npm run migrate
npm run seed
node scripts/apply-distro.mjs --tenant=studio --file=./data/theme.distro.json
npm run build
npm start
```

Then open `https://yourdomain.com/install` and enter the purchase code,
domain, and tier. The install flow signs and writes `data/license.json`
(HMAC, via `POST /api/install/stamp`), then bounces you to `/admin`.

## White-label setup

Two files control the buyer-facing brand surface:

| File | Purpose |
| --- | --- |
| `data/studio-brand.json` | White-label fallback. Ship values that every fresh install uses until overridden. |
| `data/theme.distro.json` | Per-tenant override. Apply via `scripts/apply-distro.mjs` or via `/superadmin/theme`. |

Schema, validation rules, and examples live at
`docs/theme-distro.schema.md` and `docs/theme-distro.example.json`.

To rebrand an install:

1. Edit `data/studio-brand.json` (palette, brand_name, contact details).
2. Optionally raise a `theme.distro.json` per tenant from the operator console.
3. Run `node scripts/apply-distro.mjs --tenant=<slug> --file=<distro>`.

## Environment

Required:

- `NEXTAUTH_SECRET` - 32-byte random string (`openssl rand -base64 32`)
- `NEXTAUTH_URL` - public site URL
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - initial admin user
- `LICENSE_HMAC_KEY` - 32-byte hex string (`openssl rand -hex 32`)

Operator (studio-only):

- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`

Optional:

- `NEXT_PUBLIC_SITE_URL` - used by `LicenseBanner` and sitemap
- `NEXT_PUBLIC_GA4_ID`
- `DATABASE_URL` - production data store (Supabase Postgres); unset =
  local SQLite dev
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` -
  Supabase Storage for media in production
- `ENVATO_WEBHOOK_SECRET` - HMAC secret for `/api/envato/webhook`

## What runs after install

- `npm run build` - production Next.js build (output in `.next/`)
- `npm run migrate` - idempotent schema migration every deploy
- `npm run seed` - conditional seed of the `home` page
- `npm run verify:deploy` - pre-flight gate (19 checks) before any Vercel deploy
- `npm run check:themes` - validates the 8 theme presets (AA contrast)
- `npm run lint` / `npm run lint:changed` - ESLint (full / diff-scoped gate)

## Unblocking an install that's stuck

| Symptom | Fix |
| --- | --- |
| Banner says "Unlicensed" but you installed | `rm data/license.json && ./install.sh ...` |
| Admin login is 401 | License invalid. Re-stamp with same fix. |
| 3D viewer returns 423 | Personal tier doesn't include `feature.3d-viewer`. Re-stamp as Business in `/admin/license` or `/superadmin/issue`. |
| Multiple domains need access | Business tier only. Re-stamp per domain. |
| Empty data on first run | `npm run seed` rehydrates pages. Or `npm install` once and `postinstall` does it automatically. |
| Postgres not reachable (prod) | `DATABASE_URL` unset or invalid; fix the env and re-run `npm run migrate`. |
| Distro applied but site still shows neutral | Verify `data/theme.distro.json` parses; run `node scripts/apply-distro.mjs --tenant=studio --file=./data/theme.distro.json` and check exit code. |
| Superadmin login says "Invalid credentials" | `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` env vars are not set, or they don't match. |

## Removing the license for testing

```
mv data/license.json data/license.json.bak
```

Public reads continue; admin and mutating endpoints return 401 with
the banner surfaced. Restore with `mv data/license.json.bak data/license.json`.
