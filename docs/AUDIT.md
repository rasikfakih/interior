# Studio OS - Full System Audit

Date: 2026-08-15 (post-launch, commit `0cabc7c`)
Scope: All 12 modules, both codebases in one tree (public marketing + admin SaaS), Supabase backend, Vercel production.

## Executive summary

Verdict: **PASS - production ready.** All static checks, all CI gates, the entire 407-assertion smoke suite (modules 2-10), and a live end-to-end audit of the deployed site are green. One real defect was found and fixed during this audit (the superadmin credential hash, see Findings). The operator's production database was verified untouched: the smoke suite ran against a disposable Postgres container, never the live Supabase.

```
Layer                 Result
Static (tsc, vitest)  PASS (0 errors, 3/3 tests)
Lint (eslint)         PASS (0 errors, 48 warnings)
CI gates (5 scripts)  PASS (boolean-sql 0 violations, themes 8/8, verify-deploy OK, lint-changed clean, contrast 84/0)
Smoke suite           PASS (407 assertions, 9 modules, 0 failures)
Live site (Vercel)    PASS (public, auth, gated APIs, routing, middleware)
Data safety           PASS (real Supabase row counts unchanged)
```

## 1. Static checks

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | 0 errors |
| Unit tests | `npm test` (vitest) | 3/3 passed (license-key suite) |
| Lint | `npx eslint .` | 0 errors, 48 warnings (all pre-existing, no-unused-vars / prefer-const class) |

## 2. CI gate scripts (all run on every push in `.github/workflows/ci.yml`)

| Gate | Result | Detail |
| --- | --- | --- |
| `check-boolean-sql.mjs` | PASS | 422 files scanned, 6 boolean columns tracked, 0 Postgres `boolean = int` violations |
| `check-theme-presets.mjs` | PASS | 8 presets pass, all ink/paper contrast pairs above AA, customizer vars complete |
| `verify-deploy.mjs` | PASS | demo JPGs (8), upload JPGs (9), license present |
| `lint-changed.mjs` | PASS | no changed files pending |
| `check-contrast.mjs` (Playwright walker) | PASS | 84 text-surface groups pass, 0 fail, 1058 skipped (routes with no data on this tenant, transient overlays, aria-only) |

Note: the walker's admin leg requires the current admin credential (`CONTRAST_ADMIN_EMAIL` / `CONTRAST_ADMIN_PASSWORD`), which changed when the account was reset. The CI run passes it via secret; locally it must be passed explicitly (this audit did).

## 3. Smoke suite (modules 2-10, 407 assertions, 0 failures)

Run against a disposable `postgres:17` container on `localhost:5544` with `next start` on `:3010` - the exact CI pattern. `resetForSmokes()` wiped module tables on the container only.

| Module | Feature | Assertions | Result |
| --- | --- | --- | --- |
| 2 | Lead Inbox (CRUD, kanban moves, status transitions, budget stats) | 52 | PASS |
| 3 | Proposal link (generate, view tracking, accept, won flow) | 37 | PASS |
| 4 | Materials + Vendor library (CRUD, search, filters, tenant isolation) | 45 | PASS |
| 5 | Moodboard canvas (boards, items, drag/resize/rotate save, cascade delete) | 38 | PASS |
| 6 | BOQ engine (2BHK template, live material rates, GST/wastage math, versioning) | 45 | PASS |
| 7 | Site diary + snags (photos, offline queue shape, status lifecycle) | 55 | PASS |
| 8 | Client portal (token, approvals, comments, both-domain middleware) | 52 | PASS |
| 9 | AI weekly report + social autopilot (mock AI, credit metering, publish) | 50 | PASS |
| 10 | Freemium billing (4 plans, 402 limits, upgrade ladder, webhooks, cancel) | 33 | PASS |

Coverage embedded in the suite: anonymous 401 on every module, cross-tenant 403/404 isolation (throwaway tenant 2), plan-limit 402s, invalid token 404s, cascade deletes, idempotent re-runs (suite resets tenant 1 to free at the end).

## 4. Live site audit (`https://ethinterior.vercel.app`)

| Check | Result |
| --- | --- |
| Public pages `/`, `/about`, `/projects`, `/admin` | 200 |
| Homepage v2 markers (hero, manifesto, all 4 plan names) | present |
| `/portal/<unknown-token>`, `/proposal/<unknown-token>` | 404 (correct token routing) |
| Anonymous gated APIs (`/api/leads`, `/api/billing/current`, `/api/boards`, `/api/boq`, `/api/site-logs`, `/api/social/posts`) | 401 |
| Admin login (real Supabase) | 302, session role `admin` |
| Authed APIs (`/api/leads`, `/api/billing/current`, `/api/projects`, `/api/vendors`, `/api/materials`, `/api/ai/generations`) | 200 |
| Middleware host tagging (client-host `/` vs apex `/`) | 404 vs 200 (portal host correctly not served the marketing homepage) |

## 5. Data safety verification

The suite ran against a disposable container; the operator's production Supabase was untouched:

```
leads 1, client_projects 1, proposals 1, materials 0, vendors 0,
boards 1, boq_versions 1, site_logs 1, snags 1, ai_generations 2, social_posts 0
```

These are the pre-existing production rows (project count 1 of 3 on Starter was confirmed earlier in the session). Had the suite been pointed at the live DB, all of these would be 0. The `resetForSmokes()` guard comment ("the operator's DB has none") is now outdated - production has real module data, so the destructive reset must keep being pointed only at disposable databases.

## 6. Findings

Fixed during this audit:
- **Superadmin credential hash was wrong.** The `superadmin@etihadinteriors.com` row's bcrypt hash was created from an unknown string, not the delivered password (admin was correct). Root cause: the account-reset script; the operator-console check never exercised the users table (env-gated), masking it. Fixed by re-hashing the row with the delivered password, verified via bcrypt compare and live login (session role `superadmin`).

Open, non-blocking:
- 48 eslint warnings (unused vars in `qrcode.ts`, `pg.ts`, etc.) - cosmetic.
- `*.ethinterior.vercel.app` wildcard not configured (dashboard step, documented in `docs/DEPLOY.md`; Vercel does not support wildcards on `*.vercel.app` - the intended path is `*.etha-interiors.com` with Vercel nameservers).
- `etha-interiors.com` apex still points at a non-Vercel host (`216.198.79.195`) - left untouched, may serve an existing site.
- Superadmin route coverage in the smoke suite is thin (login verified live; operator-console flows covered by contrast walker pages only).

## 7. Gaps and risks

- The browser-level UX pass (drag on the kanban canvas, PWA offline queue, portal approve button, billing modal) is covered by earlier module verification and the contrast walker, but not by an automated browser suite in CI - the smokes are API-level. A Playwright module-flow suite would close this.
- `check-contrast` needs the admin credentials as a secret; it is wired in CI but the local default (`admin123`) no longer matches production.
- AI generation uses a mock when no Deepseek/OpenAI key is present; credit metering and output shape are tested, but real-provider output is unverified on this machine.
- Realtime board collaboration (Supabase channel) is implemented but not covered by an automated assertion in the smoke suite.
- `npm run verify:deploy` does not check Lighthouse; the perf budget script (`scripts/lighthouse-budget.mjs`) exists and documents the manual run - the last measured score is not stored in `docs/PERF.md`.

## 8. Reproduce

```bash
# Static + gates (no server needed)
npx tsc --noEmit && npm test && npx eslint .
node scripts/check-boolean-sql.mjs && node scripts/check-theme-presets.mjs
node scripts/verify-deploy.mjs && node scripts/lint-changed.mjs
CONTRAST_ADMIN_EMAIL=admin@etihadinteriors.com CONTRAST_ADMIN_PASSWORD=<current> node scripts/check-contrast.mjs

# Smoke suite (disposable Postgres, never the live DB)
docker run -d --name studioos-audit-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=studioos -p 5544:5432 postgres:17
DATABASE_URL=postgresql://postgres:postgres@localhost:5544/studioos node scripts/migrate.mjs
DATABASE_URL=postgresql://postgres:postgres@localhost:5544/studioos npx next start -p 3010
BASE_URL=http://localhost:3010 DATABASE_URL=postgresql://postgres:postgres@localhost:5544/studioos node scripts/smoke/run-all.mjs
```

Both GitHub workflows (`.github/workflows/ci.yml`, `.github/workflows/smoke.yml`) run this whole surface on every push and are green on `main`.
