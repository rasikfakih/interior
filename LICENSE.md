# Etihad Interiors Theme — License

This template is sold on Envato. Each buyer receives a signed license
bound to a purchase code and domain. The license is enforced server-side.

## Tiers

| Feature | Personal | Business |
| --- | --- | --- |
| Sites per license | 1 | 5 |
| 3D room viewer | ❌ | ✅ |
| Multilingual (EN/HI/MR) | EN only | ✅ |
| Page builder pages | up to 5 | unlimited |
| Media library items | up to 50 | unlimited |
| License heartbeat cache | 24 h | 6 h |
| Support term | 6 months | 12 months |

> Personal vs Business is enforced through `data/license.json` features.
> Tier changes are stamped by `/admin/license`.

## What nulling costs a buyer

If a buyer strips `data/license.json`, deletes the banner, or moves the
site off the bound domain:

- the public site keeps rendering (read-public passes explicitly),
- a banner appears on every page stating the template is unlicensed,
- the admin login and all mutating endpoints return 401 until the
  license is re-stamped,
- mutating APIs additionally return 423 for tier-feature gates
  (for example, the 3D viewer on a personal tier is hidden).

Restoring is one click in `/admin/license` — paste the Envato purchase
code and domain, the bundle re-signs and writes back.

## How licenses are signed

- Online mode (optional): `LICENSE_PUBLIC_KEY` env var holds an RSA
  public key. The bundle verifies signatures against it.
- Offline mode (default for first release): `LICENSE_HMAC_KEY` signs
  the license body on the install machine. The same key on the host
  verifies against the bundle. No internet required.

Switching modes is a one-line change in `.env.local`. Issue revocations
or tier upgrades by reissuing the signed license payload.

## Envato Extended License note

If you intend to deliver a website-build to a client as part of a paid
service, the Envato **Extended License** is required per Envato's terms.
The Regular License covers one website per purchase. The license in
this bundle is bound to one domain at a time; multi-domain installs
need a Business tier.

## What the buyer must do

1. Run `./install.sh --code=ENVATO_PURCHASE --domain=theirdomain.com --tier=business`
2. Configure `.env.local` (NEXTAUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD,
   optional GA4 ID, license keys).
3. `npm install && npm run build && npm start`.
4. Log in to `/admin` with the seeded admin credentials and confirm
   the license pane reads Active for their domain.

## What this bundle does NOT do

- No code obfuscation is shipped. Buyers see clean source.
- No telemetry beyond optional GA4.
- License enforcement is server-side, not network access prevention.
  Determined crackers can fork the source with the gate removed;
  the goal is to make ordinary, accidental nulling uncomfortable,
  not to be unbreakable.
- No hosted license server ships in v1.0.0. License is HMAC-signed
  offline at install time. Server slot exists for Runtime 2; see
  `AGENT_BEST_PRACTICES.md`.

## Demo + support

- Live demo: <https://studioos.studio> (subject to availability).
- Screenshot/thumbnail pack in `docs/` once shipped.
- For support or to upgrade tier, contact the studio behind the
  theme (see README for current studio information).

## Scope freeze

v1.0.0 is feature-frozen for sale. Buyer requests during the freeze
window are recorded in `docs/feature-decisions.md`. They enter v1.1
or Room 2 only after the 4-week stability window ends.

See `AGENT_BEST_PRACTICES.md` for the operating discipline and
how a feature moves from "logged" to "merged" in this repo.
