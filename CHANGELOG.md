CHANGELOG

# Etihad Interiors Theme - Rebuilt + Extended

## v1.0.0 - 2026-06-18 (current)

### Scope freeze
This release is **feature-frozen** for sale to buyers:

  - **Hard freeze date**: Day 2 of Room 0 (2026-06-18).
  - **Hard freeze scope**: every code change after this point is bug-fix, copy edit, doc edit, or accessibility fix only.
  - **Hard freeze intent**: a freshly installed v1.0 will keep behaving exactly like what is in this build.

Anything new is queued in `docs/feature-decisions.md` for v1.1 / Room 1 / Room 2.
The next room lands *after* 4 weeks of buyer feedback to keep the wedge clean.

### Public runtime
- Public site reads from `pages_blocks` (CMS Room 0).
- `/install` stamps the license from purchase code, domain, tier.
- `/admin` requires login + valid license.
- License FeatureMatrix:
  - `feature.3d-viewer`: Personal = off, Business = on
  - `feature.multilingual`: Personal = off, Business = on
  - `feature.unlimited-pages` / `feature.unlimited-media`: Personal = capped, Business = unlimited
  - `feature.multi-domain`: Personal = 1 site, Business = 5 sites

### Migration hooks
- `node scripts/migrate.mjs` is idempotent. Re-runnable. Always safe to run.
- `node scripts/seed-pages.mjs` is conditional. Only seeds if `home` page row is missing.

### Deploy state
- Repo is **deploy-ready** to Vercel with the demo URL `studioos.studio`.
- `npm run verify:deploy` runs all pre-flight gates. Output:
  - node version, node_modules, .next build, vercel.json, demo db, env files, models seed, AGENT_BEST_PRACTICES, LICENSE, INSTALL — all PASS.
- DNS: `CNAME studioos.studio cname.vercel-dns.com`
- Env vars: see `OPERATOR.md` for the canonical list
- Smoke matrix: routes reach `/`, `/install`, `/admin`, `/sitemap.xml`, `/robots.txt`, `/projects`, `/journal/stone-quarries`
- Demo reset: `/admin/license` → Demo only → "Reset demo data"
- **Status (operator fills in after deploy)**: `_PENDING_ - enter timestamp here on first success_`

### Operating brief (post-v1.0)
- Buyers discover the demo via `studioos.studio/install`.
- The freeze means new features wait for 3 buyers to ask the same thing in `docs/feature-decisions.md` AND a 4-week stability window post-launch to end.

### Post-v1.0 — doc + tooling updates only
- 2026-06-18 — added `postinstall` hook: `migrate.mjs && seed-pages.mjs`. Buyers no longer need to remember to seed; the SQLite file is regenerated on every `npm install`. Documented in `INSTALL.md` § "Why the demo SQLite is not in the repo".
- 2026-06-18 — added `scripts/verify-deploy.mjs` and `npm run verify:deploy` alias. Pre-flight gate that runs ten checks before any Vercel deploy.
- 2026-06-18 — added `OPERATOR.md`, `DEPLOY.md`, `SHIP.md`, `FREEZE-MARKER`, `docs/screenshot-bag.md`. None of these touch product code; all support the deploy and freeze.

