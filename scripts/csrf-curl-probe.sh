#!/usr/bin/env bash
# Simulate the credentials POST that the LoginCard client component
# will issue when a real user submits the form. We have to do TWO
# round-trips with the same cookie to mirror what the browser does.

set -euo pipefail

echo "=== STEP A: GET /api/auth/csrf ==="
CSRF_BODY=$(curl -sS -i 'https://ethinterior.vercel.app/api/auth/csrf')
echo "$CSRF_BODY" | grep -i '^set-cookie' || true
echo "$CSRF_BODY" | grep -E '^\{'

# Extract just the csrf cookie (not the callback-url one)
COOKIE_HEADER=$(echo "$CSRF_BODY" \
  | grep -i '^set-cookie: __Host-next-auth.csrf-token=' \
  | head -1 \
  | sed -E 's/^[^:]+: //; s/;.*$//')

echo "Cookie header: $COOKIE_HEADER"

# Extract the bare token from the JSON body
TOKEN=$(echo "$CSRF_BODY" | grep -oE '"csrfToken":"[a-f0-9]+"' | sed 's/"csrfToken":"//;s/"$//')
echo "Bare token: $TOKEN"

echo ""
echo "=== STEP B: POST credentials with json=true ==="
RESPONSE=$(curl -sS -i \
  -H "Cookie: $COOKIE_HEADER" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$TOKEN" \
  --data-urlencode "email=admin@etihadinteriors.com" \
  --data-urlencode "password=admin123" \
  --data-urlencode "callbackUrl=https://ethinterior.vercel.app/admin/pages" \
  'https://ethinterior.vercel.app/api/auth/callback/credentials?json=true')

echo "$RESPONSE" | head -40
