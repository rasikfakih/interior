# Client handoff runbook

Per-client procedure the studio team runs after Envato sale lands and
operator issues the license. Use this for every new tenant.

## Preconditions

- Tenant row exists in `/superadmin/tenants`.
- Tenant has tier + expiration set.
- Tenant has a `theme.distro.json` applied (optional but recommended).
- License payload generated at `/superadmin/tenants/[id]` -> **Issue license**.

## Steps

1. **Copy the issued license JSON** from the operator console.
   The cargo is the complete JSON object, all 7 fields plus `signature` (16-line file).
2. **Send to the buyer**:
   - the JSON via a secure channel (do not paste in public chat), and
   - one of the install paths below.
3. **Buyer picks a platform**. Document for each platform how to deploy
   the same codebase (Vercel is the most common path - see INSTALL.md).

### Vercel path (most common)

For a buyer on `their-domain.com`:

```
git clone https://github.com/rasikfakih/interior.git
cd interior
./install.sh --code=OP-TENANT_ID-... --domain=their-domain.com --tier=business
echo '<paste the license JSON here>' > data/license.json
npm install
npm run build
vercel --prod
```

Then attach `their-domain.com` to the Vercel project via DNS.

### Self-host path (Node.js host)

```
git clone ...
cd interior
./install.sh --code=... --domain=... --tier=...
echo '<paste the license JSON here>' > data/license.json
npm install
npm run build
npm start
```

Wire up the host's reverse proxy to the Node process (port 3000).

## Buyer admin onboarding

Once the install is live and the buyer can hit `/install` -> license
form (or the JSON paste put them straight on active):

1. **Hand them the seeded admin credentials** from `.env.local`.
   Encourage them to reset that password at `/admin`.
2. **Walk through `/admin`**:
   - `Pages` - drag-reorder the seeded home page.
   - `Projects` - add or edit a project.
   - `Journal` - publish a sample entry.
   - `Site identity` - swap brand name + logo.
   - `License` - shows tier + expiration.
3. **Demo reset**: `/admin/license` -> Demo only -> Reset demo data.
   Disabled in production; the button is hidden when `NODE_ENV=production`.
4. **Logo swap**: `/admin/site-identity` -> upload logo -> pick from media.
5. **White-label override**: if they want a fresh distro (rebranding for
   a sub-studio they run, for example), the operator issues them a new
   distro JSON.

## Buyer support contract

Personal: 6 months.
Business: 12 months.
Tier upgrades: re-stamp license at `/admin/license` OR via the operator
console `/superadmin/issue`. Tier change does not require rebuild.

## When things go wrong

| Symptom | Cause | Fix |
| --- | --- | --- |
| Banner shows "Unlicensed" | `data/license.json` empty or sig fail | re-stamp from `/install` or paste a fresh JSON |
| 3D viewer 423 | Personal tier | upgrade license to Business |
| Multilingual picker disabled | Personal tier (EN only) | upgrade license |
| `next/image` complains about hostname | upload from a host not in `next.config.mjs` `images.remotePatterns` | add the hostname, OR convert that image to local upload via `/admin/media` |
| Build can't find `data/license.json` | directory missing | `mkdir -p data && touch data/license.json` |

## Re-handoff on tier upgrade

The studio team issues a new license JSON at `/superadmin/issue` with
the new tier and shorter domain list, then sends to the buyer. Same
`./install.sh` re-run works.

For tier-only changes, the buyer does NOT need to redeploy. The admin
license pane at `/admin/license` accepts a new JSON paste.
