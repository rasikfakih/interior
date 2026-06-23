# Operator quick reference

For the studio team running `/superadmin` after deploy.

## First sign-in

1. Open `https://ethinterior.vercel.app/superadmin`.
2. Enter `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD`.
3. Cookie session lasts for the browser session.

## Daily outline

The operator console has six sections:

| Section | What you do here |
| --- | --- |
| **Tenants** (list) | Glance at state, filter by tier. |
| **Tenants -> [id]** | Edit studio name, owner email, domain. Set expiration. Drop a distro JSON. Issue license. Revoke. |
| **Issue license** | Same as tenant detail's Issue, but pick from a dropdown. |
| **Theme distributor** | Apply a `theme.distro.json` to a tenant without leaving the operator console. |
| **Rotate HMAC** | Per-tenant HMAC rotation. Auto-generates a fresh key. |
| **Metrics** | Total + active + pending + revoked + business + personal + expiring-7d + audit-7d. |

## Envato sale flow (most common path)

1. Sale pings `/api/envato/webhook`. Tenants row appears with
   `state = pending`.
2. Open `/superadmin/tenants`. Find the new row.
3. Click in. Set tier (drop the buyer-requested tier here). Set expiration
   to +1 year. Set domain to the buyer's domain.
4. Open `Theme distributor` for this tenant. Paste the studio's stock
   distro (or a custom distro if the buyer asked for a rebrand).
5. Back on tenant detail. Set state to `active`. Issue license.
6. Copy the license JSON. Send via your standard secure channel to
   the buyer.
7. The buyer runs `./install.sh` -- at this point their `data/license.json`
   is the freshly-issued payload, signed to their domain.

## Manual tenant onboarding (not Envato)

1. `/superadmin/tenants/new` form.
2. Fill slug, studio name, owner email, domain, tier.
3. Submit -> redirects to the tenant detail.
4. Continue as above from step 4.

## Manual HMAC rotation

1. `/superadmin/rotate`.
2. Pick tenant. Click rotate. Fresh key surfaces.
3. Save the key somewhere secure. The buyer MUST re-stamp their license
   at `/install` so that the new HMAC key signs the buyer's
   `data/license.json`.

## Revoke

On a tenant detail page -> **Revoke**. The audit log gets a `revoke`
event. Buyer's site stays rendering for public reads, but admin and
3D return 401. Tier feature gates return 423. The license file on the
buyer's machine is unaffected - revoke is a server-side flag, not a
license-file edit.

To restore, the operator clicks the tenant and sets `state` back to
`active`. The buyer does not need to redeploy.

## Audit log

`/superadmin/metrics` shows the last 20 audit events. `audit_log` is
in SQLite. Older logic is queryable via:

```bash
sqlite3 data/etihad.db "SELECT created_at, kind, message FROM audit_log ORDER BY id DESC LIMIT 50;"
```

## DB persistence caveat

`data/etihad.db` is SQLite on a Vercel container. The container is
ephemeral across deploys. The studio demo is reset-safe by design.
If the team issues licenses and then a deployment wipes the container,
those issued licenses are LOST. **Always** relay the license JSON to
the buyer as soon as it's issued.

To persist beyond one deploy: snapshot via `sqlite3 .dump` and commit
to `main`, OR implement Supabase (v1.2).
