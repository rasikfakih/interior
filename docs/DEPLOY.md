# Deploy guide - both domains (Module 12)

This app ships one Vercel project that serves three families of hosts:

| Host | Purpose |
| --- | --- |
| `ethinterior.vercel.app` | Public marketing site + admin console (also serves every portal link at `/portal/{token}`) |
| `client-<sub>.etha-interiors.com` (wildcard, custom domain) | Client portals via `client-<subdomain>.etha-interiors.com` |
| tenant `custom_domain` (e.g. `projects.yourstudio.com`) | White-label portal on the tenant's own domain |

All resolution is token-based (`/portal/{token}`), so a portal link works on
every host - including the default `ethinterior.vercel.app`. The wildcard and
the tenant custom domain are conveniences, not requirements.
`src/proxy.ts` (the Next version's middleware) only tags `/portal/*` and
`/proposal/*` with `x-portal-host`; `/api` and all admin routes never enter
the proxy.

All resolution is token-based (`/portal/{token}`), so a portal link works on
every host. `src/proxy.ts` (the Next version's middleware) only tags
`/portal/*` and `/proposal/*` with `x-portal-host`; `/api` and all admin
routes never enter the proxy.

## Deploy

```bash
npm run verify:deploy   # pre-deploy gate (build + checks)
vercel --prod
```

## Domains

1. **Default host** - `ethinterior.vercel.app` is assigned automatically and
   needs no setup. It is the only domain currently attached to the project
   (checked 2026-08-15 via `GET /v9/projects/interior/domains`).
2. **Custom domain (main site)** - dashboard: pick project `interior` -
   Settings -> Domains -> **Add Domain** -> enter `etha-interiors.com`
   (Vercel will offer `www.etha-interiors.com` as well). Configure the DNS
   the dashboard asks for (apex A record to `76.76.21.21`, `www` CNAME to the
   project's cname), then wait for verification + SSL. This is a plain
   custom domain, so it does NOT require moving nameservers.
3. **Wildcard client subdomains** (`client-<sub>.etha-interiors.com`) -
   exact dashboard steps:
   1. Dashboard -> project `interior` -> **Settings** -> **Domains**.
   2. Click **Add Domain** and enter `*.etha-interiors.com`.
   3. Vercel will tell you the wildcard must use its nameservers - it
      enables them automatically on save and shows `ns1.vercel-dns.com` /
      `ns2.vercel-dns.com` to copy.
   4. At your registrar, switch the domain's nameservers to those two. This
      moves ALL of the domain's DNS to Vercel: first add any records you
      want to keep (e.g. mail) into Vercel DNS (Domains -> the domain ->
      DNS records) before the switch, otherwise they go dark.
   5. Wait for verification + wildcard SSL issuance (can take 24-48h to
      propagate; Vercel issues certs per subdomain automatically).
   Requirements: wildcard domains work on **all Vercel plans** (Hobby
   included, per Vercel's limits docs) but ONLY on a custom domain and
   ONLY with Vercel's nameservers - wildcard SSL certs need Vercel to own
   the DNS challenges.
   Not supported: `*.ethinterior.vercel.app`. Vercel does not allow
   wildcards on a project's own `vercel.app` domain (the CLI rejects the
   name and the API returns `alias_in_use`; verified 2026-08-15). Client
   subdomains therefore require the custom-domain wildcard above.
   Until the wildcard is attached, Vercel's edge returns 404 for
   unconfigured hosts BEFORE `src/proxy.ts` middleware ever runs, so
   `client-*.etha-interiors.com` requests only reach the portal once the
   domain is configured.
4. **Tenant custom domains** - set on a per-tenant basis through
   `/admin/billing` (white-label section, Studio plan). No wildcard needed:
   the tenant points a CNAME (or A record) at the Vercel deployment and we
   add the domain per tenant (dashboard or SDK). Resolution is token-based,
   and the portal hides the "Powered by Studio OS" line only when the plan
   pays for white-label **and** the host matches the tenant's
   `custom_domain`.
5. **Sanity checks** - after configuring, from any machine:
   `nslookup client-etihad.etha-interiors.com` should resolve to a Vercel
   IP, `curl -sI https://client-etihad.etha-interiors.com/portal/<token>`
   should answer 200 (create the token via admin -> project -> portal
   tab), and the same link on the apex should answer 200 too.

`vercel.json` deliberately keeps `rewrites: []` - the proxy file handles
host tagging, never Vercel-level rewrites.

## Environment variables (Vercel dashboard)

Copy `.env.local.example` names. Required: `NEXTAUTH_SECRET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `LICENSE_HMAC_KEY`. Studio OS v2.0 is
Supabase-only, so `DATABASE_URL` is required and must point at a reachable
Postgres/Supabase project (postinstall runs scripts/migrate.mjs on every
install and self-heals the schema; the deploy fails loudly if
`DATABASE_URL` is missing):

- `DATABASE_URL` (Postgres, recommended for production)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` +
  `SUPABASE_SERVICE_ROLE_KEY` (Module 8 realtime + storage, optional)
- `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` (Module 9 AI; mock output without)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, or
  `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET`
  (Module 10 billing; mock checkout without)
- `NEXT_PUBLIC_SITE_URL=https://ethinterior.vercel.app`

## Local both-domain test (what the smoke covers)

This exercises the middleware's host tagging on the LOCAL server, where
all Host headers reach the app (on Vercel an unconfigured Host is
rejected by the edge before the middleware runs). Use a `client-` host
and the custom-domain host:

```bash
node scripts/migrate.mjs
npm run build && npx next start -p 4173
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: client-etihad.etha-interiors.com" http://localhost:4173/portal/demoPortal   # 200
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: etha-interiors.com" http://localhost:4173/                                      # 200
```

Verified 2026-08-15: portal on client-host 200, home on custom host 200,
proposal on client host 200, `/api` untouched by the proxy (401 unauthenticated).
Note: the old examples used `client-demo.ethinterior.vercel.app` - that
host family is NOT supported on Vercel (see the wildcard note above).

## Perf gate

`node scripts/lighthouse-budget.mjs` builds, serves, and audits the homepage
(performance >= 90, accessibility >= 95, best-practices >= 90, seo >= 90).
Results are written to `docs/PERF.md`. It uses `npx lighthouse` with
`--throttling-method=provided` so the local gate measures the real page on
the host; set `LIGHTHOUSE_SIMULATED=1` for the mobile-simulated profile.
