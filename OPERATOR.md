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
| `DATABASE_URL` | yes (prod) | Supabase Postgres connection string. Unset = local SQLite dev only. |
| `SUPABASE_URL` | yes (prod) | Supabase project URL (Storage + anon key) |
| `SUPABASE_ANON_KEY` | yes (prod) | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (prod) | Supabase service-role key (storage admin) |
| `ENVATO_WEBHOOK_SECRET` | no | set on Envato store webhook side |
| `LICENSE_SERVER_URL` / `LICENSE_PUBLIC_KEY` | no | legacy hosted-license slot; never set (offline HMAC is the contract) |
| `BLOB_READ_WRITE_TOKEN` | no | legacy Vercel Blob adapter; unused since the Supabase Storage port (v1.8) |
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
flag set. The `postinstall` chain regenerates seed state; with
`DATABASE_URL` set, all tenant/license/distro state lives in Postgres
and survives rebuilds.

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
| `https://ethinterior.vercel.app/projects-v2` | Seeded v2 list | public |
| `https://ethinterior.vercel.app/projects-v2/casa-mira` | Project detail + 3D | public |
| `https://ethinterior.vercel.app/journal/stone-quarries` | Seeded content | public |
| `https://ethinterior.vercel.app/themes` | Theme presets showcase | public |
| `https://ethinterior.vercel.app/voices` | Studio voices page | public |
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
  apply distro JSON, live health status).
- `/superadmin/tenants/new` - hand-create a tenant row.
- `/superadmin/issue` - license wizard: issue/extend/revoke; revenue
  ledger in cents.
- `/superadmin/theme` - apply a `theme.distro.json` to a tenant from a
  pasted JSON (preset quick-pick included).
- `/superadmin/health` - live per-tenant `/api/health` probes, persisted
  status.
- `/superadmin/metrics` - tenants, revenue, usage (pageviews, 3D loads,
  form submits), audit log.
- `/superadmin/backup` - snapshot every table to one JSON file; download.
- `/superadmin/announcements` - CRUD + public banner.
- `/superadmin/rotate` - rotate a tenant's HMAC key (auto-generates).
- `/superadmin/login-as` - impersonate any tenant admin (audit-logged).

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
  https://ethinterior.vercel.app/api/operator/license
```

## 12. DB persistence

Production store is **Supabase Postgres** (`DATABASE_URL`). Tenant
state, license state (`license_doc`), and distro overrides all live in
Postgres and persist across Vercel container rebuilds. SQLite remains
the local-dev fallback when `DATABASE_URL` is unset. The runtime
surface is `src/lib/pg.ts` (`pgOne`, `pgQuery`, `pgMany`, `withPgTx`,
`ensureMigrated`); the legacy `src/lib/db.ts` shim was deleted in
TS-ID-020.

Backups are part of the operating cadence - see section 15 below.

## 13. Postgres cutover (v1.1.2 -> v1.2.0, SHIPPED 2026-06-30)

Historical milestone. The single-localhost SQLite path that shipped
in v1.1.0 is now the fallback when `DATABASE_URL` is unset; the
Postgres-first path runs whenever that env is set. Three DDL surfaces
must stay in sync: `supabase-bootstrap.sql` (Postgres),
`src/lib/sqlite-fallback-ddl.ts` (local SQLite), and
`scripts/migrate.mjs` (migrations + additive ALTERs).

- Hosted license server: still HMAC-signed offline per the
  v1.0.0 contract; no hosted license server ships. Since
  v1.18.0 the license document is DB-canonical (`license_doc`)
  with a `data/license.json` mirror/fallback.
- Multi-domain license auto-pin: deferred. Single-domain
  licenses remain the default.

## 14. Future versions (when applicable)

Future-version asks enter `docs/feature-decisions.md`. Three
YES votes (counter rule in `AGENT_BEST_PRACTICES.md`) plus the
4-week acceptance window since v1.0 ship elapse before a
candidate enters planning. If no YES has reached 3 votes at
the 4-week mark, ship no next version - the floor held.

## 15. Postgres backup (studio hosts + supports)

The studio hosts and supports buyer installs, so a restorable
backup is part of demo readiness and the operating cadence.
Two layers - run both before demo day (2026-08-15), after any
live DB write (distro apply, seed, tenant change), and weekly
afterward. Keep at least one copy off this machine (Supabase
dashboard backup or a private bucket).

**Layer 1 - full-fidelity pg_dump (schema + data + sequences).**
Run from any machine with `pg_dump` installed. The connection
string in `.env.local` (`DATABASE_URL`) is a valid pg URI:

```bash
# From the repo root, using the live DATABASE_URL
pg_dump "$DATABASE_URL" --no-owner --no-privileges \
  -Fc -f data/backups/postgres-$(date +%F).dump
```

Verify the dump before trusting it:

```bash
pg_restore --list data/backups/postgres-2026-08-12.dump | head -20
```

Restore to a fresh database (same Postgres version family):

```bash
createdb interior-restore
pg_restore --no-owner -d interior-restore data/backups/postgres-2026-08-12.dump
```

**Layer 2 - lightweight JSON snapshot (no local pg_dump needed).**

```bash
npm run backup:postgres
```

Writes `data/backups/postgres-YYYY-MM-DD.json` (gitignored -
buyer-derived data never commits). Read-only against Postgres;
re-reads the file after writing and exits non-zero if the row
counts do not match. This is the same export pattern as the
pre-cutover `scripts/export-sqlite.mjs`, and it is what the
operator can run from any machine with the repo + `DATABASE_URL`.

Supabase dashboard backups (Project Settings -> Database ->
Backups) complement both layers with point-in-time recovery;
treat the local dumps as the portable, verifiable copies.
