# Operator crib sheet — Vercel deploy

Run through this before clicking **Deploy**.

## 1. Import the repo in Vercel

- Vercel dashboard → **Add New Project** → **Import** the git repo.
- Framework preset: **Next.js**.
- Root directory: leave empty (repo root).
- Build/Output settings: keep Vercel defaults (it reads `vercel.json`).

## 2. Environment variables (Production env)

Paste each of these into Vercel → Project → Settings → Environment Variables.
Mark each as **Production**.

| Key | Required | Value |
| --- | --- | --- |
| `NEXTAUTH_URL` | YES | `https://studioos.studio` |
| `NEXTAUTH_SECRET` | YES | `openssl rand -base64 32` output |
| `NEXT_PUBLIC_SITE_URL` | YES | `https://studioos.studio` |
| `ADMIN_EMAIL` | YES | your studio email |
| `ADMIN_PASSWORD` | YES | a strong password (16+ chars, alphanumeric + symbols) |
| `LICENSE_HMAC_KEY` | YES | any random 32-byte hex string |
| `LICENSE_SERVER_URL` | NO | leave blank until Room 2 |
| `LICENSE_PUBLIC_KEY` | NO | leave blank until Room 2 |
| `BLOB_READ_WRITE_TOKEN` | NO | leave blank until Room 1 Week 7 |
| `NEXT_PUBLIC_GA4_ID` | NO | your GA4 measurement id |

## 3. Domain attach

In Vercel → Project → Settings → Domains:

- Add `studioos.studio`
- Vercel will return: `CNAME studioos.studio cname.vercel-dns.com`

In your DNS registrar:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `studioos.studio` | `cname.vercel-dns.com` |

(If you want `www.studioos.studio` redirect-on: add `www` CNAME too.)

Wait 5-10 minutes for DNS to propagate.

## 4. First deploy

- Branch: `main`
- Region: any (Tokyo `hnd1` or Mumbai `bom1` close to Maharahstra buyers wins).
- Click **Deploy**.
- Wait ~90s. Vercel builds, runs `npm run build`, ships `.next`.

## 5. First visit (smoke test)

Open `https://studioos.studio/install` in a private window.

- E1: page renders with the install form
- E2: enter purchase code + domain + tier → click Install
- E3: redirects to `/admin` (with seeded admin credentials)
- E4: page builder tab shows the seeded `home` page with 9 blocks
- E5: visit `/` → Studio home renders from `pages_blocks`

If E5 fails: the seeded `data/etihad.db` is missing from the build. Either commit it to `main` or add a `prebuild` hook in Vercel (`node scripts/migrate.mjs && node scripts/seed-pages.mjs && npm run build`).

## 6. Going off

If E1-E4 don't happen, push a redeploy from Vercel with **Force Rebuild** flag set. Vercel keeps `.next` artifacts across deploys so the SQLite file persists in the build image until a fresh checkout rebuilds it.

## 7. Custom domain ownership

v1.0 ships with the **studioos.studio** demo URL hardcoded in:
- `.env.local.example`
- `vercel.json`
- `README.md`
- `LICENSE.md`
- `AGENT_BEST_PRACTICES.md`
- `DEPLOY.md`

Be aware of this — these files become a chain of references to a domain you may want to change someday. The freeze on feature-shaped code doesn't extend to config doc copy; you can swap the demo URL string in any of these post-deploy without breaking the freeze.

## 8. Smoke test matrix

After deploy, verify each:

- `https://studioos.studio/` — Studio home renders
- `https://studioos.studio/install` — License form paints
- `https://studioos.studio/admin` — Login returns
- `https://studioos.studio/sitemap.xml` — Lists `/`
- `https://studioos.studio/robots.txt` — Lists `/`
- `https://studioos.studio/projects` — Renders seeded list
- `https://studioos.studio/journal/stone-quarries` — Renders seeded content
- `https://studioos.studio/api/sitemap` — Returns 200 (if route registered)

## 9. Demo reset

If any buyer modifies the demo data:
- Sign in as admin
- Visit `/admin/license` → scroll to **Demo only** section
- Click "Reset demo data"

This will clear and re-seed the home page. Disabled automatically in production environments.
