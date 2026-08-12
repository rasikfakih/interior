# Demo Walkthrough - 2026-08-15 (theme buyers)

Audience: prospective theme buyers (interior studios). Product: hosted
multi-tenant "Interior Studio Theme". The studio hosts and supports
buyer installs. Live first buyer: Etihad Interiors at
`ethinterior.vercel.app`.

## The story in one line

"Your studio's site, live in one install, hosted and maintained for
you - with a theme your clients can feel."

## Beats in order

### 1. The buyer's live site (2-3 min)
Open `https://ethinterior.vercel.app/` in a fresh window.

- Forest & Bone look: deep forest ink on bone paper, soft amber accent,
  Newsreader display serif. Name the craft: "the palette is yours to
  recalibrate - this is the shipped default, not a template".
- Walk to "Selected work" -> `/projects-v2` (the v2 surface).
- Open one project (e.g. `/projects-v2/casa-mira`): before/after
  slider, spec strip, homeowner voices, related work.
- Open the **3D walkthrough**: "Load 3D" - the reception-room model
  loads in-page. Drag to rotate. "Spatial studies ship with the theme."
- Footer credit: "Powered by Interior Studio Theme Made By Rasik
  Fakih" - white-label, vendor attribution is built in.

### 2. The operator console (2 min)
Open `https://ethinterior.vercel.app/superadmin` in a private window
(operator credentials).

- Tenants list: one live tenant (Etihad Interiors).
- Tenant detail: tier (business), distro applied.
- Theme console (`/superadmin/theme`): paste a distro JSON, apply to a
  tenant - the palette flips on the next request (force-dynamic, no
  cache wait). This is the "hosted, you don't touch code" pitch.
- Health: `https://ethinterior.vercel.app/api/health` answers 200 with
  `db: ok` - "every buyer site gets a monitor".

### 3. The install (2-3 min, optional but recommended)
Pre-staged fresh clone (see below). Run:

```bash
./install.sh --code=DEMO-PURCHASE-CODE --domain=demo.example.com --tier=business
```

Then `npm run seed:content` (operator seeds demo content for the new
tenant - the studio hosts + supports), `npm run build`, boot, and the
new site renders with projects, journal, testimonials, and the 3D
walkthrough. Emphasize: one install command, idempotent seeds, content
is replaceable from `/admin`.

### 4. Close
- Pricing/tier ask: personal vs business (3D viewer, multilingual,
  unlimited pages/media).
- Custom domains: Vercel project attach, same DNS flow.
- Backup + support: pg_dump runbook + JSON snapshot (`npm run
  backup:postgres`), uptime probe (`npm run check:uptime`), operator
  console for everything else.
- "What would your studio's site look like? Tell me your palette and
  I'll show you."

## Pre-demo checklist (2026-08-14)

- [ ] Live probe green: `node scripts/verify-brand-v190.mjs` (13/13),
      `npm run check:uptime` (1/1), full route probe (29/29).
- [ ] Live backup taken: `npm run backup:postgres` -> verified JSON in
      `data/backups/`; one pg_dump off-machine (Supabase dashboard).
- [ ] Fresh-clone install rehearsed: clone -> `npm ci` (postinstall
      OK without LICENSE_HMAC_KEY - stamp skips with a notice) ->
      `npm run seed:content` -> build -> boot -> projects render.
- [ ] Operator credentials ready (superadmin).
- [ ] Demo URL + private window checked; no stale cache (pages are
      force-dynamic; each request is a fresh render).
- [ ] Backup restore spot-checked once (restore the JSON snapshot to a
      scratch DB and confirm row counts).

## Failover

- V2 surface issue: revert to v1 in minutes (links are one-line-per-
  file) - v1 routes remain live and verified.
- Live DB hiccup: `SELECT 1` health gate shows 503; pages degrade to
  the local SQLite fallback only if DATABASE_URL drops - have the
  operator console + a recent backup ready.
- Deploy rollback: `git revert` the demo-cut commits; Vercel rebuilds.

## Open items flagged (operator decision)

1. **i18n switcher is near-decorative**: en/hi/mr locale files exist
   and are complete, but the header chrome (nav labels) is hardcoded
   English, so the language select changes little visible copy. Wire
   nav labels through i18n (operator-provided translations) or hide
   the switcher before the demo. The `translations` table is empty.
2. **Fresh installs need `npm run seed:content`** after install - now
   documented in install.sh (buyer path) + this doc; postinstall
   intentionally does not touch the DB on Vercel builds.
3. **`footer_credit` on v1 detail pages**: v1 project detail pages do
   not render the credit (only listing + v2 detail do) - pre-existing,
   not a regression.
4. **Stray `smoke-probe-*` project row** on the live DB (test litter,
   filtered from public listings) - safe to delete post-demo.
