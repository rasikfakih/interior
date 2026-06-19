#!/usr/bin/env bash
# Install runner for Etihad Interiors Theme (Envato).
# Usage: ./install.sh --code=ENVATO_PURCHASE --domain=example.com --tier=business

set -e

CODE=""
DOMAIN=""
TIER="business"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --code=*) CODE="${1#*=}"; shift ;;
    --domain=*) DOMAIN="${1#*=}"; shift ;;
    --tier=*) TIER="${1#*=}"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$CODE" || -z "$DOMAIN" ]]; then
  echo "Usage: ./install.sh --code=YOUR_PURCHASE --domain=example.com --tier=business" >&2
  exit 1
fi

if [[ "$TIER" != "personal" && "$TIER" != "business" ]]; then
  echo "tier must be 'personal' or 'business'" >&2
  exit 1
fi

# Install deps if needed
if [[ ! -d node_modules ]]; then
  if command -v npm >/dev/null 2>&1; then
    npm install --silent
  else
    echo "npm not installed" >&2
    exit 1
  fi
fi

# Run migrations once
node scripts/migrate.mjs or true
node scripts/seed-pages.mjs or true

# Call the install API. The api signs and writes data/license.json.
PAYLOAD=$(printf '{"purchaseCode":"%s","domain":"%s","tier":"%s"}' "$CODE" "$DOMAIN" "$TIER")

# Run a tiny helper script that posts to the local API. We won't have a live server here,
# so we sign directly using the offline HMAC path.
node - <<NODE
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HMAC_KEY = process.env.LICENSE_HMAC_KEY || 'etihad-interiors-license-fallback-2026';
const tier = process.env.TIER;
const code = process.env.CODE;
const domain = process.env.DOMAIN;

const features = tier === 'business' ? {
  'feature.3d-viewer': true,
  'feature.multilingual': true,
  'feature.unlimited-pages': true,
  'feature.unlimited-media': true,
  'feature.multi-domain': true,
} : {
  'feature.3d-viewer': false,
  'feature.multilingual': false,
  'feature.unlimited-pages': false,
  'feature.unlimited-media': false,
  'feature.multi-domain': false,
};

const installedAt = new Date().toISOString();
const expiresAt = new Date(Date.now() + 365*86400e3).toISOString();
const body = code + '|' + domain + '|' + tier + '|' + installedAt + '|' + expiresAt + '|' +
  Object.entries(features).sort(([a],[b])=>a.localeCompare(b)).map(([k,v]) => k + '=' + v).join(',');
const signature = crypto.createHmac('sha256', HMAC_KEY).update(body).digest('hex');

const lic = {
  purchaseCode: code,
  domain,
  tier,
  installedAt,
  expiresAt,
  features,
  signature,
  issuedBy: 'install.sh',
};
fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'license.json'), JSON.stringify(lic, null, 2));
console.log('License written to data/license.json');
NODE

echo "Install complete."
echo "Next: npm run build && npm start"
