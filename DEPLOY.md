# Deploy to Vercel (`studioos.studio`)

This file is the live-deploy briefing. The site is intended to deploy
as-is — no DB connection string, no static export, no custom build
step. SQLite (`data/etihad.db`) is mounted on a persistent disk. The
license is stamped via `/install` on the first visit.

## Strategy

1. **Single Vercel project**, this repo's `main`.
2. **Persistent SQLite**: Vercel does not provide persistent disk.
   For the demo, the SQLite file lives on the **build image** as part
   of the repo's `data/etihad.db`. On every fresh container the
   database is re-seeded from `scripts/seed-pages.mjs`. This is the
   reason the demo is reset-safe: it has no buyer-modified state.

   Production buyers on Vercel (when they self-host or use a service
   like Turso) ship their own persistent SQLite or migrate to
   Postgres. Block that for v1.0 — buyers can ride the demo's
   filesystem-based SQLite, or move their own DB.

3. **License**: stamped by `/install` on the demo. The demo's own
   `data/license.json` carries the studio's own code. Buyer copies
   become local copies via `./install.sh`.

## One-shot deploy

```bash
vercel --yes --confirm --prod
vercel dns add <your-project> studioos.studio
```

Or via the Vercel dashboard:

- Import this git repository.
- Set **Environment Variables**:

  | Key | Value |
  | ---- | ----- |
  | `NEXTAUTH_URL` | `https://studioos.studio` |
  | `NEXTAUTH_SECRET` | `openssl rand -base64 32` output |
  | `NEXT_PUBLIC_SITE_URL` | `https://studioos.studio` |
  | `ADMIN_EMAIL` | your studio admin email |
  | `ADMIN_PASSWORD` | a strong password (re-stamp after first login) |
  | `LICENSE_HMAC_KEY` | change from the demo default |
  | `LICENSE_SERVER_URL` | _leave blank until Room 2_ |
  | `LICENSE_PUBLIC_KEY` | _leave blank until Room 2_ |
  | `NEXT_PUBLIC_GA4_ID` | optional |
  | `BLOB_READ_WRITE_TOKEN` | _leave blank until Week 7_ |

- Deploy. After first deploy, visit
  <https://studioos.studio/install> to stamp the demo's license.

## What the demo shows

- A studio product homepage driven by the seeded `pages_blocks`.
- A working `PageRenderer` (block-based, drag-reorder from admin only).
- Visible 3D walkthroughs on the home page and on individual
  project cards.
- A `/admin` route. Seeded admin email/password from the env above.
- A License banner when license is missing (visit `/install` first).
- A standard sitemap at `/sitemap.xml` and a robots at `/robots.txt`.

## Demo maintenance

After sale demos:

- Re-deploy via `vercel --prod` to pick up latest.
- The DB is re-seeded from `scripts/seed-pages.mjs` in the build
  image. Buyer-modified content lives on the visitor's machine via
  the marketplace demo; the studio site stays a snapshot.

## Demo fallbacks

Vercel may strip the SQLite file from the build if it changes file
shape. Acceptable for a demo because every visitor hits the same
booted container. Real production buyers host on their own
filesystem (see `INSTALL.md`).

If the SQLite file disappears between deploys, rerun
`node scripts/seed-pages.mjs` locally and commit the regenerated
`data/etihad.db`.
