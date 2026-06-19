#!/usr/bin/env bash
# verify-deploy.sh — final go/no-go before clicking "Deploy" in Vercel.
# Run from the repo root.

set -e

echo "[1/7] Node version:"
node -v
echo

echo "[2/7] npm dependencies installed?"
test -d node_modules || { echo "no — run 'npm install' first"; exit 1; }
echo "  ok"
echo

echo "[3/7] .next build directory present?"
test -d .next || { echo "no — run 'npm run build' first"; exit 1; }
echo "  ok"
echo

echo "[4/7] vercel.json declared regions + framework?"
test -f vercel.json || { echo "no"; exit 1; }
grep -q '"framework": "nextjs"' vercel.json || { echo "framework missing"; exit 1; }
echo "  ok"
echo

echo "[5/7] Demo SQLite seed present?"
test -f data/etihad.db || { echo "running seed-pages.mjs"; node scripts/seed-pages.mjs; }
echo "  ok"
echo

echo "[6/7] Required env vars (in .env.local.example) listed:"
grep -E '^[A-Z_]+=' .env.local.example | sed 's/=.*//' | sort -u
echo

echo "[7/7] cms/blocks registry sanity (12+ blocks):"
node -e "const r = require('./src/cms/blocks/registry.ts'); const { BLOCK_REGISTRY } = r; console.log('  registered:', Object.keys(BLOCK_REGISTRY).length, 'blocks'); console.log('  '; console.log('  ', Object.keys(BLOCK_REGISTRY).join(', ')); console.log('  ');" 2>&1 | head -8 || node -e "const r = require('fs').readFileSync('./src/cms/blocks/registry.ts','utf8'); const m = r.match(/BLOCK_REGISTRY:\\s*Record<.*?>\\s*=\\s*\\{([\\s\\S]+?)\\n\\}/); const blocks = (m ? m[1] : '').match(/  \"[\\w-]+\":/g) || []; console.log('  registered:', blocks.length, 'blocks'); console.log('  ', blocks.map(b => b.trim().replace(':','')).join(', '));"
echo

echo "Ready for Vercel deploy. Run 'vercel --prod' or click Deploy in the dashboard."
