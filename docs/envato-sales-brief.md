# Envato sales brief — Etihad Interiors Theme

Pitch in three sentences:

> A premium residential interior design theme for buyers who run a small studio.
> Page-builder + license tier system + multilingual + 3D walkthroughs come
> out of the box. Buyers re-skin via `/admin` after onboarding.

## What buyers get on day one

1. Block-based homepage with 13 block types.
2. Admin panel for projects, journal, testimonials, team, media, menus, identity, settings, translations, license.
3. Drag-reorder page builder with the seeded `home` page as reference composition.
4. Built-in media library with alt text + gallery picker.
5. Tiptap rich text for journal, project descriptions, block-level rich text.
6. Multilingual shell (`en`, `hi`, `mr`) gated to Business tier.
7. Visible 3D walkthroughs on project cards and home page (three.js + react-three-fiber, lazy-loaded).
8. `/install` license stamper: domain, tier, purchase code -> signed offline HMAC.
9. Demo reset button in `/admin/license` so prospects can poke at the demo without breaking it.

## Tier matrix

| Feature | Personal | Business |
| --- | --- | --- |
| Sites per license | 1 | 5 |
| 3D room viewer | off | on |
| Multilingual (EN/HI/MR) | EN only | full |
| Page builder pages | up to 5 | unlimited |
| Media library items | up to 50 | unlimited |
| License heartbeat cache | 24h | 6h |
| Support term | 6 months | 12 months |

## Demo URL

`<https://ethinterior.vercel.app>` (live, subject to availability)

## Sales screenshots

Generated into `docs/thumbs/v110/`. Each screenshot is a screen at desktop 1440x980 view.

1. `home.png` - studio home (hero + selected work + journal preview + closing CTA)
2. `projects.png` - selected work index
3. `project-detail.png` - single project page with 3D viewer available
4. `journal-detail.png` - single journal entry, rich-text body
5. `contact.png` - contact form
6. `admin-pages.png` - drag-reorder block builder
7. `install.png` - license stamping form
8. `superadmin.png` - studio tenant list with one entry, distro column visible

## Onboarding (buyer-side)

```
git clone https://github.com/rasikfakih/interior.git
cd interior
./install.sh --code=YOUR_ENVATO_PURCHASE --domain=yourdomain.com --tier=business
npm install
npm run build
npm start
```

`/install` writes `data/license.json` keyed to the buyer's domain. `npm run migrate`
is idempotent and runs on `postinstall`.

## Studio-side (operator)

The studio team owns `/superadmin` (gated, internal). When a buyer purchases on Envato:

1. Envato posts `purchase_code` to `/api/envato/webhook`.
2. Webhook creates a `PENDING_TENANT` row. No license auto-issued.
3. Operator approves from `/superadmin/tenants/[id]`. Sets tier, expiration, distributor override, then issues license.
4. Buyer runs `./install.sh` with the issued license payload (exported as JSON from the operator console).

## White-label

Each install runs as its own tenant. The studio's own site (the Etihad demo at the canonical URL) is just tenant row 1 with `theme.distro.json` applied. Removing that distro row repaints the demo with `Your Studio` defaults - same repo, neutral brand.

## What is not in v1.1.0

- No hosted license server. v1.2 candidate.
- No Envato auto-issue. Manual approval by design.
- No Stripe billing. Buyers pay on Envato, license is bound to purchase code.
- No real DNS verification of custom domains. Trust-on-input, recorded in `tenants.domain`.

## File listing for buyer onboarding

```
INSTALL.md           one-line install
LICENSE.md           tier matrix + nulling posture
README.md            stack + features
OPERATOR.md          selling vs buyer view
SHIP.md              demo URL deploy runbook for the studio (operators)
DEPLOY.md            long-form Vercel lifecycle
AGENT_BEST_PRACTICES freeze discipline + decision log
docs/feature-decisions.md  live buyer-request log
docs/CONTEXT.md            session continuity
```
