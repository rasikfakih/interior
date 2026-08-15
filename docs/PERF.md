# Performance budget

Last run: 2026-08-15 against http://localhost:4173/

## Scores

| Category | Score | Budget | Status |
| --- | --- | --- | --- |
| performance | 100 | >= 90 | pass |
| accessibility | 100 | >= 95 | pass |
| best-practices | 100 | >= 90 | pass |
| seo | 100 | >= 90 | pass |

## Core web vitals

| Metric | Value | Budget |
| --- | --- | --- |
| LCP | 1.34s | < 2.5s |
| CLS | 0.0000 | < 0.1 |
| TBT | 0ms | < 200ms |
| Speed Index | 1.47s | < 3.4s |

## How to run

```bash
node scripts/lighthouse-budget.mjs
```

Uses `npx lighthouse` (not a project dependency) so it never adds a
bundled Chromium to the repo. Chrome must be installed on the host.

## What keeps the public surface fast

- Hero image is `next/image` with `priority` (LCP eager).
- The three.js shader runtime loads lazily via dynamic import +
  IntersectionObserver; the initial bundle has no WebGL code.
- Lenis smooth scroll is isolated to the public layout (admin unaffected).
- Admin routes stay `force-dynamic`; public marketing pages are dynamic
  with DB fallbacks to demo data, so the shell is static HTML.
