# /projects - Issue Inventory (audit before v2)

**Date:** 2026-07-02
**Auditor:** OpenCode session, taste-skill v1 informed.

Empirical state observed from:
- `src/app/(public)/projects/page.tsx` (read)
- `src/components/projects/*.tsx` (read all 9)
- live HTML at `https://ethinterior.vercel.app/projects` (pulled 65 KB)
- DB seed `scripts/seed-content.mjs` (read)

DB state at audit time: 3 published projects (`casa-mira`, `Nalanda House`, `salt-flats`), 3 testimonials (`A. Mehta`, `R. Sahasrabudhe`, `S. Iyer`), 3 journal entries, 3 team rows. The page rendered against the live Supabase runtime (per session log 2026-06-25 onward).

---

## A. Blockers / ship-block

### A1. FeaturedGrid ignores real DB image
File: `src/components/projects/FeaturedGrid.tsx:61`
The most prominent section hard-codes `https://picsum.photos/seed/featured-{slug}/1600/900`. The DB row carries `before_image` for all three projects; the same project shows two different photos in two sections on the same page. User-visible "the gallery above vs gallery below disagree."

### A2. Bento empty-cell at n<5
File: `src/components/projects/FeaturedGrid.tsx:82-117`
`bento = rest.slice(0, 4)`. With three live projects the bento renders 2 tiles then a `col-span-12` empty cell (cell-count rule violation, taste-skill 4.7). Looks unfinished.

### A3. Testimonial ignores DB
File: `src/components/projects/Testimonial.tsx`
Hard-coded pull-quote `"Twenty-four weeks..."` with invented attribution `"Homeowner - 2024 commission"`. The DB has three real testimonials with named clients. Phase 7 ships DB-backed rows; the page never reads them.

---

## B. Taste-skill violations

### B1. Three CTAs sharing contact intent
- Hero `[Homes drawn...]` -> `Begin a project` -> `/contact`
- Hero `[Homes drawn...]` -> `View archive` -> `#project-grid`
- `CtaBand` -> `Begin a project` -> `/contact`

Two distinct intentions listed at Hero (`contact` vs `archive-anchor` is arguable) but Hero + CtaBand repeat the same `contact` intent label. Taste-skill 4.5 "no duplicate CTA intent".

### B2. Eyebrow budget overrun
Taste-skill 4.7 caps at 1 eyebrow per 3 sections. Page has 9 sections. Real eyebrow count:
| Section | Has eyebrow |
|---|---|
| Hero | none (correct) |
| NumbersStrip | none (correct) |
| ProjectsClient | `Category` + `Year` mono labels (these are filter form labels, not strictly eyebrows) |
| FeaturedGrid | `Featured work` (eyebrow) |
| Testimonial | `From the homeowner` (eyebrow) |
| ProcessStrip | `How a project runs` (eyebrow) |
| LogoWall | `In the press` (eyebrow) |
| FAQ | `Questions` (eyebrow) |
| CtaBand | `Tail end` (eyebrow) |

Six eyebrows on the page. The cap is 3. Pages 3, 4, 5, 7 from the current Hero need their eyebrow removed.

### B3. Numbered process strip cherry-picks one fabricated stat
File: `src/components/projects/NumbersStrip.tsx:30`
`Average build, weeks: "24"`. Taste-skill 4.9 "fake-precise numbers banned unless labeled mock or backed by real data." 24 here is a marketing round number, not measured data. The ProcessStrip happens to use 24 too, so it's at least internally consistent, but the stat is fabricated.

### B4. Press wordmarks invented
File: `src/components/projects/LogoWall.tsx:6-13`
Six names: `AD India`, `Elle Decor`, `Better Interiors`, `Home & Design`, `Surface Magazine`, `Kaneki House`. Taste-skill 4.8 "real company logos for social proof" - these are real publications except `Better Interiors`, `Home & Design`, `Kaneki House` which sound invented or unverified. Even the real ones render as plain text wordmarks, not real logos.

### B5. Picsum fallbacks carry TODO markers
File: `src/components/projects/FeaturedGrid.tsx:59,99`
Hard-coded `// TODO: real asset path slug=featured-hero` comments. The TODO intends to be replaced with real uploaded photos but shipped as picsum. With seed-content populating DB rows these TODOs are stale.

### B6. Dead component exists
File: `src/components/projects/ProjectFilters.tsx`
The component is exported from `src/components/projects/types.ts` slot but never imported. `ProjectsClient.tsx` re-implements the filter pattern inline. The dead component's CSS-driven approach (`document.querySelectorAll('[data-tile]')`) doesn't run because it isn't mounted.

### B7. Hero uses min-h-[100dvh] with limited content
File: `src/components/projects/Hero.tsx:25`
`min-h-[100dvh]` is correct per AGENTS.md, but the actual content is ~3 lines of headline + 16-word subtext + 2 CTAs. With short content the section looks like a footer with too much empty space. Taste-skill 4.7 hero discipline: hero must show CTA in initial viewport; here it does, but the section is overwhelmingly empty.

---

## C. Live-HTML findings

### C1. `on bench` strip missing for n==3
File: `src/components/projects/FeaturedGrid.tsx:119`
The "On the bench" tile only renders when `items.length > 5`. With 3 projects the strip is gone. Acceptable.

### C2. Truncate failure on TLD titles
File: `process_strip` data shows `"Weeks 1-4"`, `"Weeks 5-10"`, `"Weeks 11-20"`, `"Weeks 21-24"`. Layout puts these in 4 columns at md breakpoint. On smaller widths it scrolls horizontally. The hyphen content is a taste-skill 9 tell ban because it survives even if it's not an em-dash; ASCII hyphen in `Weeks 1-4` is allowed (skill 9.E bans em-dash only).

### C3. Marquee tracks twelve entries (duplicated), no reduced-motion audit
File: `src/components/projects/LogoWall.tsx:65`
`[...PRESS, ...PRESS]` makes 12 entries in DOM. Reduced-motion is checked at effect mount but not subscribed to; same pattern flagged previously for ProcessStrip sticky-stack (2026-06-25 log). If the OS-level setting flips mid-session, the marquee won't react.

### C4. 3D badge rendering
Live HTML shows the `3D - walk-through` pill rendered for projects whose `model_3d` is set. The seed-content does not populate `model_3d` for the three live rows. Test: live HTML scan should show 0 instances of `3D - walk-through` pill. Verified via grep that the literal string appears 3 times in LIB source comments but 0 in live rendered output - confirming live users never see the 3D badge despite the seed mentioning `reception-room.glb`. This is a wiring gap.

---

## D. Schema / copy

### D1. Testimonial uses "Homeowner" generic
File: `src/components/projects/Testimonial.tsx:37`
`Homeowner - 2024 commission`. With three named DB testimonials available, this is the second-most-prominent creative tell on the page. Pull-quote sentiment is generic (24 weeks, kitchen bench oak) but the DB rows are client-specific. Should dogfood the DB and fall back to a taste-skill-approved generic when n==0.

### D2. House-on-public-record ends with a period
File: `src/components/projects/FeaturedGrid.tsx:40`
`Houses on public record.` Terminal periods in display headlines are an LLM tell. Hero does NOT end in a period. FAQ H2 ends with a period. CtaBand H2 ends with a period. Periods in headlines are inconsistent.

### D3. Hero address line is duplicated
File: Hero renders `brand.studio_address`. Footer already prints `brand.footer_credit` and `brand.studio_address`. Reading the design: address appears twice on the page.

---

## E. Carry-forward (out of scope here)

- `ProjectFilters.tsx` dead component cleanup.
- Home, journal, about, contact reuse the same eyebrow budget rules.
- 3D model viewer dialog is built but unreferenced (no project row has the seed `model_3d`).
- Marquee reduced-motion subscription fix shared across `ProcessStrip` and `LogoWall`.

---

## F. Resolution

Version 2 ships as `/projects-v2` route group per docs/PLAN-PROJECTS-V2 (this session).
Original `/projects` route untouched until v1.1.3 cut.

### Detail v2 follow-up (TS-009 / v1.4.3)

Same v1/v2 split strategy applied to the case-study surface.
The `/projects/[slug]` page inherits a separate audit:

  - Two `chrome-pill` eyebrows on one page (Spatial study + From
    the homeowner). Cap is 1. v2 detail drops both renders to
    mono micro-meta only and spends the budget on From-the-
    homeowner alone.
  - The header used `min-h-[100dvh]` cap on a single-project
    page, overshooting the layout. v2 uses `min-h-[78dvh]` so
    CTA stays reachable and the page reads as editorial.
  - The testimonial section rendered a hard-coded generic
    copy and a `Homeowner - 2024 commission` attribution.
    v2 sources DB-backed rows. Empty state returns null.
  - The `Back to selected work` link lives in the header's
    eyebrow region in v1; v2 moves it to a breadcrumb-style
    mono row in the heading area, no chrome-pill.

Detail v2 lives at `/projects-v2/[slug]`, sibling to v1.
v1 detail untouched for v1.4.x. v1.3.x patch swap is the
operator's call.
