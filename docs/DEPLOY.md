# Deploy guide - both domains (Module 12)

This app ships one Vercel project that serves three families of hosts:

| Host | Purpose |
| --- | --- |
| `ethinterior.vercel.app` | Public marketing site + admin console |
| `*.ethinterior.vercel.app` (wildcard) | Client portals via `client-<subdomain>.ethinterior.vercel.app` |
| tenant `custom_domain` (e.g. `projects.yourstudio.com`) | White-label portal on the tenant's own domain |

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

1. **Default host** - `ethinterior.vercel.app` is assigned automatically.
2. **Custom domain (main site)** - in the Vercel dashboard, add
   `etha-interiors.com` (apex) and `www.etha-interiors.com` (redirect to
   apex). Point the DNS as Vercel instructs.
3. **Wildcard client subdomains** - add `*.etha-interiors.com` in the Vercel
   project domains. Requires a **Pro or higher Vercel plan** (wildcard
   domains are a paid feature). A tenant's `client_subdomain` (e.g. `etihad`)
   then resolves to `client-etihad.etha-interiors.com`, which `src/proxy.ts`
   recognizes via the `client-` prefix.
4. **Tenant custom domains** - set on a per-tenant basis through
   `/admin/billing` (white-label section, Studio plan). The tenant points
   their own DNS at the Vercel deployment; the token link works because
   resolution is token-based, and the portal hides the "Powered by Studio OS"
   line only when the plan pays for white-label **and** the host matches the
   tenant's `custom_domain`.

`vercel.json` deliberately keeps `rewrites: []` - the proxy file handles
host tagging, never Vercel-level rewrites.

## Environment variables (Vercel dashboard)

Copy `.env.local.example` names. Required: `NEXTAUTH_SECRET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `LICENSE_HMAC_KEY` (+ `STAMP_*` if using
the demo license stamp). For SQLite mode no `DATABASE_URL` is needed (the
bundled `data/etihad.db` is hot-copied per region; writes evaporate on cold
start - use Postgres for durability):

- `DATABASE_URL` (Postgres, recommended for production)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` +
  `SUPABASE_SERVICE_ROLE_KEY` (Module 8 realtime + storage, optional)
- `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` (Module 9 AI; mock output without)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, or
  `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET`
  (Module 10 billing; mock checkout without)
- `NEXT_PUBLIC_SITE_URL=https://ethinterior.vercel.app`

## Local both-domain test (what the smoke covers)

```bash
node scripts/migrate.mjs && node scripts/seed-plans.mjs && node scripts/seed-demo.mjs
npm run build && npx next start -p 4173
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: client-demo.ethinterior.vercel.app" http://localhost:4173/portal/demoPortal   # 200
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: etha-interiors.com" http://localhost:4173/                                      # 200
```

Verified 2026-08-15: portal on client-host 200, home on custom host 200,
proposal on client host 200, `/api` untouched by the proxy (401 unauthenticated).

## Perf gate

`node scripts/lighthouse-budget.mjs` builds, serves, and audits the homepage
(performance >= 90, accessibility >= 95, best-practices >= 90, seo >= 90).
Results are written to `docs/PERF.md`. It uses `npx lighthouse` with
`--throttling-method=provided` so the local gate measures the real page on
the host; set `LIGHTHOUSE_SIMULATED=1` for the mobile-simulated profile.
