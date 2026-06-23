# SHIP - First Vercel deploy

These are the exact steps to put the studio demo at
**`ethinterior.vercel.app`**. Do not deviate unless reading `OPERATOR.md` first.

## 0. One-minute pre-flight

```
npm run verify:deploy
```

Should print `[OK]` eighteen times followed by `Ready for Vercel deploy.`.
If any `[FAIL]` appears, fix that line first. **Do not skip this step.**

The 18 checks include:

1. node version >= 18
2. node_modules installed
3. .next build present
4. vercel.json framework == `nextjs`
5. Demo SQLite seeded
6. tenants table present with at least one row
7. .env.example present
8. AGENT_BEST_PRACTICES.md present
9. LICENSE.md present
10. INSTALL.md present
11. docs/CONTEXT.md present (session continuity)
12. data/theme.distro.json present
13. data/studio-brand.json present (white-label fallback)
14. src/app/superadmin/page.tsx present (operator console)
15. src/app/api/envato/webhook/route.ts present
16. public/models/seed/reception-room.glb > 1 KB (no stub)
17. public/demo/*.jpg with at least 8 files
18. public/uploads/images/{hero,services-1..4,grid-1..3,placeholder}.jpg present

## 1. Vercel - import the repo

| Step | Where |
| --- | --- |
| Sign in | vercel.com |
| **Add New...** -> **Project** | dashboard |
| Import | `rasikfakih/interior` |
| Framework | Next.js (auto-detected) |
| Root Directory | (empty - repo root) |
| Override | **no** |

## 2. Environment Variables - Production scope only

Set each via **Project -> Settings -> Environment Variables**, marked **Production**.

| Key | Value |
| --- | --- |
| `NEXTAUTH_URL` | `https://ethinterior.vercel.app` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` -> paste output |
| `NEXT_PUBLIC_SITE_URL` | `https://ethinterior.vercel.app` |
| `ADMIN_EMAIL` | studio admin email |
| `ADMIN_PASSWORD` | 16+ char generated password |
| `LICENSE_HMAC_KEY` | `openssl rand -hex 32` -> paste output |
| `SUPERADMIN_EMAIL` | operator-only email |
| `SUPERADMIN_PASSWORD` | 16+ char generated password (different from `ADMIN_PASSWORD`) |
| `ENVATO_WEBHOOK_SECRET` | HMAC secret string set on Envato store side |

Leave blank for v1.1.0: `LICENSE_SERVER_URL`, `LICENSE_PUBLIC_KEY`,
`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `BLOB_READ_WRITE_TOKEN`,
`NEXT_PUBLIC_GA4_ID`.

## 3. Domain attach

| Where | Action | Value |
| --- | --- | --- |
| Vercel - Settings -> Domains | **Add** | `ethinterior.vercel.app` |
| DNS registrar | **CNAME** `ethinterior.vercel.app` -> | `cname.vercel-dns.com` |

DNS propagates in 5-10 minutes.

## 4. Deploy

Click **Deploy**. Wait ~90s. Vercel prints the URL when done.

## 5. First-visit smoke test (do all five)

Open the page in an **incognito window**.

- [ ] Visit `https://ethinterior.vercel.app/` -> Studio home renders from `pages_blocks`.
- [ ] Visit `https://ethinterior.vercel.app/install` -> license form paints.
- [ ] Enter a purchase code + domain + tier -> click Install. Bounce to `/admin`.
- [ ] Sign in with the seeded admin email/password. Page builder tab loads.
- [ ] In a separate incognito window, visit `https://ethinterior.vercel.app/superadmin`.
      Sign in with `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD`. Tenants list
      renders with one row (the studio tenant).

## 6. Things that can go wrong

| Symptom | What it means | Fix |
| --- | --- | --- |
| Deploy fails at `next build` | repo has type errors or missing dep | re-run locally: `npm run build` |
| `/install` shows but form 500s | env `NEXTAUTH_SECRET` missing | go back to step 2 |
| `/` renders empty page | SQLite wasn't committed | rebuild with `node scripts/seed-pages.mjs && npm run build` step in prebuild hook |
| `/admin` returns 401 | license missing | finish step 5's install step |
| `/superadmin` returns 401 | `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` env vars missing or wrong | go back to step 2 |
| Tenants list says `tenants empty` | postinstall didn't run on the container | check `package.json` `postinstall` script is `node scripts/migrate.mjs && node scripts/seed-pages.mjs` |
| Apply distro fails with `palette.X vs paper fails AA contrast` | distro JSON contrast ratio too low | adjust palette to darken ink/muted vs paper (>= 4.5:1) |

## 7. After deploy

- Open `CHANGELOG.md` and edit the line under `v1.1.0` deploying state:
  ```
  ### Status
  - Status: v1.1.0-DEPLOYED at <https://ethinterior.vercel.app> on YYYY-MM-DD HH:MM UTC.
  ```
- Replace `_PENDING_` in the operator-state line in `FREEZE-MARKER`.
- Capture first-visit screenshots into `docs/thumbs/v110/` (8 thumbs).
- Hand off the live URL in your inbox.

## 8. After 4 weeks (acceptance window end)

Open `docs/feature-decisions.md`, sort YES by counter, pick the top
5-7 entries that have > 3 votes. Plan v1.2 from that set. Schedule
the freeze review meeting for the 4-week-mark. If no YES has reached
3 votes, ship no changes - the floor held.

---

When the deploy lands and the first-visit smoke passes, reply with
the URL and the timestamp; I'll mark v1.1.0-DEPLOYED in the changelog.
