CHANGELOG

# Etihad Interiors Theme - Built For Sale + Resell

## v1.1.0 - 2026-06-23 (current)

### What changed

This release converts the codebase from a single-license demo into a multi-tenant commercial product. The buyer-visible site stays in its v1.0.0 contract. New product surfaces live under a separate carve-out so they cannot accidentally ship into a buyer install.

### New surfaces (operator-only - not visible to buyers)

- **`/superadmin`** - tenant + license console (gated by `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` env)
  - Tenants list + filter
  - Tenant detail: edit tier, set expiration, mark revoked, change domain, paste distro
  - Issue license action: tenant HMAC-signed offline license payload
  - Theme distro apply: distribute `theme.distro.json` overrides per tenant
  - Rotate HMAC action: re-sign a tenant key; buyers re-stamp at /install
  - Metrics tile: total/active/pending/revoked/by-tier/expiring-7d/audit-7d

- **`/api/operator/**`** - seven operator-only routes (login, tenants CRUD, issue, rotate-hmac, metrics)
- **`/api/envato/webhook`** - Envato purchase intake, manual operator approval (no auto-issue)
- **`scripts/apply-distro.mjs`** - apply a `theme.distro.json` to a tenant locally

### Tenant model

- `tenants` table: slug, studio_name, owner_email, domain, tier, state, hmac_key, installed_at, expires_at, revoked_at
- `tenant_data` table: per-tenant JSON sidecar (distro, future settings overrides)
- All legacy tables preserved unchanged. Seed data + schema are backward-compatible.

### White-label pass (studio demo neutralised)

- `site_identity` default brand name: `Etihad Interiors` -> `Your Studio`
- Default settings rows: `contact_email`, `studio_address`, etc become placeholders
- `seed-pages.mjs` hero copy: Etihad-specific line removed, eyebrow becomes `Residential Studio`
- `data/theme.distro.json`: the Etihad-themed override lives here (read by `tenant-brand.ts`)
- `data/studio-brand.json`: white-label default surface used when a tenant has no distro row

The studio demo at `https://ethinterior.vercel.app` keeps painting as Etihad because the studio tenant's row 1 has `data/theme.distro.json` applied. Removing that distro row paints the demo as `Your Studio`.

### Public runtime impact

None. The demo at `/`, `/install`, `/admin`, `/projects`, `/journal`, `/contact` renders identically to v1.0.0. Buyers on a fresh install see neutral defaults until they (or the superadmin) apply a distro.

### Session continuity

- `docs/CONTEXT.md` - written so any new opencode session reads it first and picks up the build state, freeze status, and known tradeoffs
- `AGENTS.md` patched to point at it on every session start

### Verify-deploy gate additions (`scripts/verify-deploy.mjs`)

Added gates for: tenants row present, theme.distro.json present, studio-brand.json present, operator page tree present, envato webhook route present, GLB > 1 KB (rejects the 369-byte stub), demo JPGs (>= 8), upload JPGs (9 required paths).

## Lifecycle roll-forward

See `FREEZE-MARKER` for the new carve-outs. The freeze is rolled forward:

- v1.0.0 freeze remained in effect for buyer-visible code
- v1.1.0 added an explicit operator carve-out (above)
- White-label edits changed `seed-pages.mjs` and `site_identity` default content (string-only); no schema or route changes

## Post-deploy checklist (operator fills in)

- Deploy to `https://ethinterior.vercel.app` (auto-deploys from `rasikfakih/interior/main`)
- Verify `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` env vars are set in Vercel Production scope
- Run the SHIP.md §5 incognito smoke (4 checks) on the live URL
- Stamp CHANGELOG when first-visit passes

### Status

- **Status (operator fills in after deploy)**: `_PENDING_ - enter timestamp here on first success_`

---

## v1.0.0 - 2026-06-18 (historic)

### Scope freeze

This release was feature-frozen for sale to buyers:

- Hard freeze date: Day 2 of Room 0 (2026-06-18).
- Hard freeze scope: every code change after this point was bug-fix, copy edit, doc edit, or accessibility fix only.
- Hard freeze intent: a freshly installed v1.0 keeps behaving exactly like what is in this build.

Anything new was queued in `docs/feature-decisions.md` for v1.1 / Room 1 / Room 2.
The next room landed in v1.1.0 (this release) after one freeze-roll-forward session.

### Public runtime (v1.0.0)

- Public site reads from `pages_blocks` (CMS Room 0).
- `/install` stamps the license from purchase code, domain, tier.
- `/admin` requires login + valid license.
- License FeatureMatrix:
  - `feature.3d-viewer`: Personal = off, Business = on
  - `feature.multilingual`: Personal = off, Business = on
  - `feature.unlimited-pages` / `feature.unlimited-media`: Personal = capped, Business = unlimited
  - `feature.multi-domain`: Personal = 1 site, Business = 5 sites

### Migration hooks (v1.0.0)

- `node scripts/migrate.mjs` is idempotent. Re-runnable. Always safe to run.
- `node scripts/seed-pages.mjs` is conditional. Only seeds if `home` page row is missing.
