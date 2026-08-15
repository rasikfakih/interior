# Awwwards submission - launch checklist

## Submission details

- **Site URL:** `https://ethinterior.vercel.app`
- **Category:** Professional Services
- **Tags:** interior design, SaaS, Kanban, BOQ, PWA, moodboard, client portal
- **Technologies:** Next.js 15, TypeScript, Tailwind v4, GSAP + ScrollTrigger,
  Lenis, three.js (@react-three/fiber), Supabase (realtime + storage),
  Deepseek AI, better-sqlite3, SQLite fallback
- **Version:** v2.0.0 (Modules 1-12)

## Description (200 words, soul voice)

We start at the kitchen table, not the mood board. This is the operating
system for a residential interior studio: the leads funnel, the material
library with live rates, the moodboard canvas, the Indian BOQ with GST and
wastage, the offline-first site diary, and a client portal that needs no
login. Every module talks to the same tables, so a rate change in the
material library flows into every bill of quantities in the studio.

The site itself is the product demo. The hero reveals in clipped serif
lines over a pinned photograph. The selected-work rail pins and scrolls
horizontally, each card a displacement shader that bulges toward the
cursor. Budget numbers sit in mono amber. The manifesto is one sentence:
Excel is where good studios go to die.

Built on Forest & Bone - deep ink green, warm paper, a single amber accent,
one 8px radius, no emojis. The free plan is one project, twenty-five leads,
twenty AI generations. Enough to feel the difference.

## Interactions to film for the reel

1. **Hero clip-path reveal** - the headline rises through a clip mask on load.
2. **Horizontal pin scroll** - vertical scroll drives a pinned horizontal
   project rail (GSAP ScrollTrigger).
3. **Shader hover displacement** - the WebGL plane bulges toward the cursor
   (three.js, lazy-loaded).
4. **Magnetic CTA** - the amber "See live demo" button pulls toward the mouse.
5. **Kanban drag** - leads move new -> qualified -> site visit -> quote sent
   -> won on the admin board.
6. **Board canvas** - materials dragged from the library onto a freeform
   moodboard, resized and rotated.
7. **BOQ live cost** - editing a quantity recalculates the amber total
   instantly; Pull Latest Cost re-reads material rates.
8. **Offline diary** - the site log queues with photos when the network is
   gone and syncs on reconnect.

## Pre-submission checks (all green on 2026-08-15)

- No console errors on the homepage (the GSAP pin-spacer `removeChild` bug
  found in Module 11 is fixed; `useGSAP` runs in a layout effect).
- No 404s on the homepage assets (verified via Lighthouse network log).
- Lighthouse: performance 100, accessibility 100, best-practices 100,
  SEO 100 (provided throttling; see `docs/PERF.md`).
- Reduced-motion disables the reveal, the pin, Lenis, and the shader.

## Reel

Storyboard lives in `public/reel/script.md`. Film at 1440px wide, 60fps,
with the network throttled to a normal connection so the shader loads
visibly mid-scroll.
