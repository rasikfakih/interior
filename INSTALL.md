# INSTALL — Etihad Interiors Theme

## One-line

```bash
./install.sh --code=YOUR_PURCHASE --domain=yourdomain.com --tier=business
```

This:

1. Installs npm deps if missing. `package.json` declares a `postinstall`
   hook that runs `node scripts/migrate.mjs && node scripts/seed-pages.mjs`,
   so the SQLite file (`data/etihad.db`) is **always** present after a
   clean install.
2. Runs the idempotent database migrations in `scripts/migrate.mjs`.
3. Seeds the default `home` page with the studio's block composition.
4. Signs a license into `data/license.json` (offline HMAC, no internet).

## Why the demo SQLite is not in the repo

The repo deliberately keeps `data/etihad.db` out of source control
(`.gitignore` excludes it). Three reasons:

- The DB is **regenerated on every install** via `postinstall`. There
  is no information you would gain by committing it.
- Buyers cloning the repo want a clean install state. A committed DB
  drifts with the developer's environment and confuses support.
- The Vercel demo (at `studioos.studio`) reproduces the homepage
  deterministically via `scripts/seed-pages.mjs` against an
  ephemeral filesystem. Same admin email on every rebuild.

If you want the demo to **statically** match a specific DB state
(custom seeded content, demo admin email, etc.), set the env
variables in `OPERATOR.md` and let `seed-pages.mjs` populate the
schema. Don't commit a binary DB.

## Manual install

If you prefer the UI flow:

```bash
npm install
npm run migrate
npm run seed
npm run build
npm start
```

Then open `https://yourdomain.com/install` and enter the purchase code,
domain, and tier. The page POSTs to `/api/license`, which signs and
writes `data/license.json`, then bounces you to `/admin`.

## Environment

Copy `.env.local.example` (or `.env.example`) to `.env.local`. Required keys:

- `NEXTAUTH_URL` — public site URL
- `NEXTAUTH_SECRET` — 32-byte random string (`openssl rand -base64 32`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — initial admin user (re-set after first login)
- `LICENSE_HMAC_KEY` — random 32-byte hex string (used to sign the offline license)

Optional but recommended in production:

- `NEXT_PUBLIC_SITE_URL` — used by `LicenseBanner` and sitemap
- `NEXT_PUBLIC_GA4_ID` — Google Analytics 4 Measurement ID
- `LICENSE_SERVER_URL` — Envato Studio webhook target (future)
- `LICENSE_PUBLIC_KEY` — RSA public key for production license sigs
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage (Room 1 week 7 hookup)

## What runs after install

- `npm run build` — production Next.js build (output in `.next/`)
- `npm run migrate` — idempotent schema migration every deploy
- `npm run lint` — ESLint with the Next.js profile
- `npm run verify:deploy` — pre-flight gate that prints `[OK]/[FAIL]`
  per check before any Vercel deploy

## Unblocking an install that's stuck

| Symptom | Fix |
| --- | --- |
| Banner says "Unlicensed" but you installed | `rm data/license.json && ./install.sh ...` |
| Admin login is 401 | License invalid. Same fix as above. |
| 3D viewer returns 423 | Personal tier doesn't include `feature.3d-viewer`. Re-stamp as Business in `/admin/license`. |
| Multiple domains need access | Business tier only. Re-stamp per domain. |
| Empty demo SQLite on first run | `npm run seed` rehydrates. Or `npm install` once and `postinstall` does this automatically. |

## Removing the license for testing

```bash
mv data/license.json data/license.json.bak
```

Public reads continue; admin and mutating endpoints return 401 with
the banner surfaced. Restore with `mv data/license.json.bak data/license.json`.
