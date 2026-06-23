# Etihad Interiors Theme - License

This template is sold on Envato. Each buyer receives a signed license
bound to a purchase code and domain. The license is enforced server-side.

## v1.1.0 surface

The v1.1.0 release adds:

- **operator console** at `/superadmin` for the studio (gated).
- **tenant model** - every install is a row in `tenants`.
- **theme.distro.json** - per-tenant white-label override.
- **Envato webhook** - manual operator approval flow.

The public buyer experience is unchanged from v1.0.0.

## Tiers

| Feature | Personal | Business |
| --- | --- | --- |
| Sites per license | 1 | 5 |
| 3D room viewer | off | on |
| Multilingual (EN/HI/MR) | EN only | full |
| Page builder pages | up to 5 | unlimited |
| Media library items | up to 50 | unlimited |
| License heartbeat cache | 24h | 6h |
| Support term | 6 months | 12 months |

Tier is enforced through `data/license.json` features plus the
`feature.*` keys. Tier changes are stamped by `/admin/license`
(for tenant self-service if their tier allows) or `/superadmin/issue`
(for operator-driven change).

## What nulling costs a buyer

If a buyer strips `data/license.json`, deletes the banner, or moves the
site off the bound domain:

- the public site keeps rendering (read-public passes explicitly),
- a banner appears on every page stating the template is unlicensed,
- the admin login and all mutating endpoints return 401 until the
  license is re-stamped,
- mutating APIs additionally return 423 for tier-feature gates
  (for example, the 3D viewer on a personal tier is hidden).

Restoring is one click in `/admin/license` - paste the Envato purchase
code and domain, the bundle re-signs and writes back. Operator console
`/superadmin/issue` is the studio-side equivalent.

## Online vs offline license modes

- **Online mode** - `LICENSE_PUBLIC_KEY` env var holds an RSA public key.
  Bundle verifies signatures against it.
- **Offline mode (default v1.1.0)** - `LICENSE_HMAC_KEY` signs the license
  body on the install machine. The same key on the host verifies the
  signature. No internet required. Per-tenant keys are stored in
  `tenants.hmac_key`.

Modes switch via env. Re-issuing a license rotates the signature on
the buyer's `data/license.json`.

## Telemetry / observability

- No code obfuscation is shipped. Buyers see clean source.
- No telemetry beyond optional GA4 (`NEXT_PUBLIC_GA4_ID`).
- License enforcement is server-side, not network access prevention.
- No hosted license server ships in v1.1.0. License is HMAC-signed
  offline at install time. The hosted-license-server slot is reserved
  for v1.2.

## Envato Extended License note

If a buyer intends to deliver a website to a client as part of a paid
service, the Envato **Extended License** is required per Envato's terms.
The Regular License covers one website per purchase. The license in this
bundle is bound to one domain at a time; multi-domain installs need a
Business tier.

## Buyer onboarding (Envato purchase -> live site)

1. Buyer purchases on Envato. Envato pings `/api/envato/webhook` with
   the purchase code.
2. The webhook creates a `PENDING_TENANT` row. License not auto-issued.
3. Studio operator approves at `/superadmin/tenants/[id]`. Sets tier,
   expiration, distributor override. Issues a license payload.
4. Buyer runs `./install.sh --code=... --domain=... --tier=...` with
   the issued license JSON. `data/license.json` is written.
5. Buyer signs into `/admin` with the seeded admin credentials and
   confirms the license pane reads Active for their domain.

## Demo + support

- Live demo: <https://ethinterior.vercel.app> (subject to availability).
- Sales brief: `docs/envato-sales-brief.md`.
- Operator quick reference: `docs/OPERATOR_QUICKREF.md`.
- Buyer handoff: `docs/CLIENT_HANDOFF.md` (studio team hands to clients).
- Sales notes: `docs/SALES_NOTES.md`.

## Scope freeze

v1.1.0 carries an operator carve-out (see `FREEZE-MARKER`). Buyer-visible
code paths are frozen against structural change. Operator surfaces
(`/superadmin/**`, `/api/operator/**`, `/api/envato/**`) are explicitly
outside the freeze.

Buyer requests land in `docs/feature-decisions.md`, enter v1.2 or Room 2
only after the per-feature counter clears 3 and the v1.1 acceptance
window has elapsed.

See `AGENT_BEST_PRACTICES.md` for the operating discipline and how a
feature moves from "logged" to "merged" in this repo.
