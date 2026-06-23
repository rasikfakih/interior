# Operator crib sheet - Vercel deploy + studio operator console

Run through this before clicking **Deploy**, and before signing into
`/superadmin` for the first time.

## 1. Import the repo in Vercel

- Vercel dashboard -> **Add New Project** -> **Import** the git repo:
  `rasikfakih/interior`.
- Framework preset: **Next.js**.
- Root directory: leave empty (repo root).
- Build/Output settings: keep Vercel defaults (it reads `vercel.json`).

## 2. Environment variables (Production scope)

Paste each into Vercel -> Project -> Settings -> Environment Variables.
Mark each as **Production**.

| Key | Required | Value |
| --- | --- | --- |
| `NEXTAUTH_URL` | yes | `https://ethinterior.vercel.app` |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32` output |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://ethinterior.vercel.app` |
| `ADMIN_EMAIL` | yes | studio admin email |
| `ADMIN_PASSWORD` | yes | strong password (16+ chars) |
| `LICENSE_HMAC_KEY` | yes | any random 32-byte hex string |
| `SUPERADMIN_EMAIL` | yes | operator-only email (NOT the public ADMIN_EMAIL) |
| `SUPERADMIN_PASSWORD` | yes | operator-only password (different from `ADMIN_PASSWORD`) |
| `LICENSE_SERVER_URL` | no | leave blank until v1.2 |
| `LICENSE_PUBLIC_KEY` | no | leave blank until v1.2 |
| `DATABASE_URL` | no | leave blank for SQLite path (v1.1.0 default). Set for Supabase in v1.2. |
| `SUPABASE_URL` | no | leave blank until v1.2 |
| `SUPABASE_ANON_KEY` | no | leave blank until v1.2 |
| `SUPABASE_SERVICE_ROLE_KEY` | no | leave blank until v1.2 |
| `ENVATO_WEBHOOK_SECRET` | no | set on Envato store webhook side |
| `BLOB_READ_WRITE_TOKEN` | no | Vercel Blob storage |
| `NEXT_PUBLIC_GA4_ID` | no | optional |

## 3. Domain attach

In Vercel -> Project -> Settings -> Domains:

- Add `ethinterior.vercel.app`. Vercel returns:
  `CNAME ethinterior.vercel.app cname.vercel-dns.com`.

In your DNS registrar:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `ethinterior.vercel.app` | `cname.vercel-dns.com` |

(For `www.ethinterior.vercel.app` redirect-on: add `www` CNAME too.)

Wait 5-10 minutes for DNS to propagate.

## 4. First deploy

- Branch: `main`
- Region: any (Tokyo `hnd1` or Mumbai `bom1` close to Maharashtra buyers wins).
- Click **Deploy**.
- Wait ~90s. Vercel builds, runs `npm run build`, ships `.next`.

## 5. First visit (smoke test)

Open `https://ethinterior.vercel.app/install` in a private window.

- E1: page renders with the install form.
- E2: enter purchase code + domain + tier -> click Install.
- E3: redirects to `/admin` (with seeded admin credentials).
- E4: page builder tab (`/admin/pages`) shows the seeded `home` page.
- E5: visit `/` -> Studio home renders from `pages_blocks`.
- E6 (operator-only, separate window): visit `https://ethinterior.vercel.app/superadmin`,
  sign in with `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD`. Tenants list
  has one entry. Distro column visible.

If E5 fails: see SHIP.md "Things that can go wrong".

## 6. Going off

If E1-E5 don't happen, push a redeploy from Vercel with **Force Rebuild**
flag set. Vercel keeps `.next` artifacts across deploys so the SQLite
file persists in the build image until a fresh checkout rebuilds it.

## 7. Custom domain ownership

`ethinterior.vercel.app` is the demo URL hardcoded in:
- `.env.local.example`
- `vercel.json`
- (`README.md` and `LICENSE.md` carry the URL.)
- `data/theme.distro.json` (the studio demo's distro record).
- `INSTALL.md / OPERATOR.md / SHIP.md / DEPLOY.md`.

Be aware of this - these files become a chain of references to a
domain you may want to change someday. The freeze on schema-shaped
code doesn't extend to config doc copy; you can swap the demo URL
string in any of these post-deploy without breaking the freeze.

The freeze carve-out also permits swapping the `ethinterior.vercel.app`
entry in `next.config.mjs` `images.remotePatterns` (one hostname,
no logic change).

## 8. Smoke test matrix

After deploy, verify each. All gated by PublicRO/Admin/Operator:

| URL | Surface | Gate |
| --- | --- | --- |
| `https://ethinterior.vercel.app/` | Studio home | public |
| `https://ethinterior.vercel.app/install` | License form | public |
| `https://ethinterior.vercel.app/admin` | Login | license-gated |
| `https://ethinterior.vercel.app/sitemap.xml` | Lists `/` | public |
| `https://ethinterior.vercel.app/robots.txt` | Lists `/` | public |
| `https://ethinterior.vercel.app/projects` | Seeded list | public |
| `https://ethinterior.vercel.app/journal/stone-quarries` | Seeded content | public |
| `https://ethinterior.vercel.app/superadmin` | Login | env-gated |
| `https://ethinterior.vercel.app/superadmin/tenants` | Tenant list | session |
| `https://ethinterior.vercel.app/superadmin/issue` | License issuance | session |
| `https://ethinterior.vercel.app/api/envato/webhook` | Envato intake | server-to-server |

## 9. Demo reset

If any buyer modifies demo data via the studio's tenant:

- Sign in to `/admin` as the studio admin.
- Visit `/admin/license` -> scroll to **Demo only** section.
- Click "Reset demo data".

This clears and re-seeds the home page. Disabled automatically in production.

## 10. Operator console: superadmin

`/superadmin` is the studio's control plane for licenses and tenants.

- `/superadmin/tenants` - list with filter by tier + state.
- `/superadmin/tenants/[id]` - detail (edit tier, expiration, revoke,
  apply distro JSON).
- `/superadmin/tenants/new` - hand-create a tenant row.
- `/superadmin/issue` - issue license payload for a tenant.
- `/superadmin/theme` - apply a `theme.distro.json` to a tenant from a
  pasted JSON.
- `/superadmin/rotate` - rotate a tenant's HMAC key (auto-generates).
- `/superadmin/metrics` - aggregated counters + audit log.

Envato sale flow:

1. Envato POSTs purchase_code to `/api/envato/webhook`.
2. Tenants row created with `state = 'pending'`.
3. Operator approves at `/superadmin/tenants/[id]`, sets tier and
   expiration, applies distro, issues license.
4. Operator relays the JSON payload to the buyer.

For full procedure see `docs/CLIENT_HANDOFF.md`.

## 11. Curl smoke for operator

```bash
# login
curl -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"OPERATOR_EMAIL","password":"OPERATOR_PASSWORD"}' \
  https://ethinterior.vercel.app/api/operator/login

# list tenants
curl -b cookies.txt https://ethinterior.vercel.app/api/operator/tenants

# issue license for tenant id=1
curl -b cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  -d '{"tenant_id":1}' \
  https://ethinterior.vercel.app/api/operator/issue
```

## 12. DB persistence

v1.1.0 ships on SQLite (file at `data/etihad.db`). Vercel containers
are ephemeral - `npm install` `postinstall` regenerates the DB on
every fresh container. Tenant state, license state, distro overrides
all live in this DB. After a real first deploy with operator-issued
licenses, **export the DB** via the admin panel's database tab (or
`sqlite3` CLI) to preserve tenant state.

Production-grade persistence is the v1.2 scope (Supabase).

## 13. Going to v1.2

- Postgres migration: implement `src/lib/tenant-db.ts` adapter
  switching by `DATABASE_URL`. Existing `db.ts` becomes the SQLite
  branch. Mirror audit_log, tenants, tenant_data into Postgres
  tables with same shape.
- Hosted license server: implement `/api/license/verify` HMAC-RSA
  endpoint. Buyer installs point their `LICENSE_SERVER_URL` to it.
- Multi-domain license auto-pin: extend `tenants.domain` to allow
  N entries via a `tenant_domains` table. Tier-gated.
