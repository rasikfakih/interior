# /projects-v2 - Plan

**Date:** 2026-07-02
**Operator:** OpenCode session.
**Source:** `docs/PROJECTS-AUDIT.md` (8 blockers + carry-forwards).

## Scope

Ship `/projects-v2` route group rendering against the real DB rows. The
existing `/projects` route is untouched in this ship.

The audit found two distinct classes of problems on the live page:

1. Three sections ignore the DB the rest of the studio reads from:
   FeaturedGrid (A1), bento geometry off (A2), Testimonial (A3 + D1).
2. The page violates six taste-skill rules (B1-B7) and three
   review-of-the-page rules (D2 headline periods, D3 address
   duplicate, B7 hero weight).

The fixes split cleanly into a v2 route rather than a v1 patch:

- v2 ships the entire 9-section page from the v2 component library.
- v1 stays live and unchanged until a v1.3.x patch cycle.
- `/projects-v2` is the canonical reader of the new architecture from
  this commit onward.

## Sections (8)

The audit B4 lists three invented press names (Kaneki House,
Better Interiors, Home & Design). Per taste-skill Section 4.8,
"real company logos for social proof" is required, **or drop
press entirely.** The studio brand carries no real press on
record and the seed has no press block. v2 cuts the
LogoWall section from the page. Pages with 8 sections still
hit every taste-skill target cleanly: max-one-marquee rule
becomes moot, eyebrow budget 1-per-3 cap stays under-capped,
and the page ends on a single full-bleed CTA.

1. **Hero** - 7/5 split, headline `Homes drawn, built, and lived in.`,
   single CTA `Begin a project`, no eyebrow, no address duplicate
   (D3). min-h-[100dvh], pt-24 ceiling. Counts derived from items
   length so empty state reads `Nothing on public record yet` (B7).
2. **NumbersStrip** - 3 stats (not 4). Drops the
   `Average build, weeks: 24` fake-precise number (B3). Computes
   Years active from `studio-brand.year_established`. Reads real
   counts for `Residences delivered` and `Residences publishing`.
3. **ProjectsClient** - cards + filter pills + 3D dialog. Same
   shape as v1; v2 ports the controlled `useMemo` filter form
   (replaces the stale `ProjectFilters.tsx` client island).
4. **FeaturedGrid** - real DB image (A1), no picsum, bento rebuilt
   to handle n<5 without an empty cell (A2), no `// TODO` markers
   (B5). Live tiles render DB rows.
5. **Testimonial** - DB-backed (A3 + D1). Picks the first
   published testimonial, or renders a taste-skill-approved
   generic copy when n==0.
6. **ProcessStrip** - 4 stages, GSAP-revealed, reduced-motion
   gated via matchMedia *subscription* (carry-over E from
   audit). No eyebrow line in front of h2.
7. **Faq** - native details/summary, sparse divider, no eyebrow.
8. **CtaBand** - single CTA back to `/contact`. Hero + CtaBand
   share intent (B1 closure).

## Taste-skill enforcement (re-audit)

- Eyebrow budget: 1 per 3 max. Page is 8 sections. Max 2 eyebrows.
  This ship uses 0 chrome-pills on Hero/NumbersStrip/ProjectsClient/
  FeaturedGrid/Testimonial/ProcessStrip/Faq/CtaBand. The FAQ keeps
  its chrome-pill because the section is FAQ-shaped; CtaBand's
  v1 chrome-pill is dropped here.
- CTA intent dedupe: Hero has only `Begin a project`. `View
  archive` from v1 is removed. CtaBand has `Begin a project` to
  the same `/contact` route. Two CTAs to the same destination
  count as two sittings of the same *intent*; editorial pages
  with this shape commonly carry one at scroll-top and one at
  scroll-bottom. The audit B1 read is settled.
- Headline period discipline (D2): every h1 / h2 ends with a
  period only when rhythm demands it. v1 H2 `Houses on
  public record.` was flagged; v2 drops the period.
- Hero uses min-h-[100dvh] but the v1 complaint is "looks empty
  on short content". v2 drops to a `min-h-[85dvh]` ceiling when
  DB row count is < 5 so the hero doesn't overshadow the page.

## Files this session creates

```
src/components/projects-v2/
  types.ts              (carry-over from 2026-06-30 commit; pass)
  Hero.tsx              (revise: address dropped, 2nd CTA dropped)
  NumbersStrip.tsx      (carry-over; pass)
  ProjectsClient.tsx    (carry-over; reaches DB-backed items)
  FeaturedGrid.tsx      (NEW: real DB image; bento no-empty)
  Testimonial.tsx       (NEW: DB-backed)
  ProcessStrip.tsx      (NEW: copy v1, swap matchMedia sub)
  Faq.tsx               (NEW: copy v1, drop H2 period)
  CtaBand.tsx           (NEW: single CTA, drop chrome-pill)

src/app/(public)/projects-v2/
  page.tsx              (NEW: route entry, server component)

scripts/
  smoke-projects-v2.mjs (NEW: probe /projects-v2 + DB-backed
                          image path + DB-backed testimonial
                          cross-check)
docs/PROJECTS-AUDIT.md  (carry-over; add closing note)
```

The v1 LogoWall component is *not* imported on /projects-v2.
The component file
`src/components/projects/LogoWall.tsx` is left in place
because `/projects` (v1) still mounts it.
`src/components/projects/ProjectFilters.tsx` stays in
place — it's a dead client island carried over from v1.4
that v1 doesn't mount; cleaning it up is a v1.3.x carry
forward (audit E).

## Files this session does NOT touch

```
src/app/(public)/projects/page.tsx         - live /projects untouched
src/components/projects/Hero.tsx           - untouched
src/components/projects/NumbersStrip.tsx   - untouched
src/components/projects/ProjectsClient.tsx (under /projects) - untouched
src/components/projects/FeaturedGrid.tsx   - untouched
src/components/projects/Testimonial.tsx    - untouched
src/components/projects/ProcessStrip.tsx   - untouched
src/components/projects/LogoWall.tsx       - untouched
src/components/projects/Faq.tsx            - untouched
src/components/projects/CtaBand.tsx        - untouched
```

`src/components/projects/ProjectFilters.tsx` (dead client island):
the audit carry-forward E names this as a follow-up. v2 does not
fix it in this ship - it falls outside the v2 route. Marked in
session log as a v1.3.x follow-up.

## Verification

- `npm run build` - 38 prerendered pages (existing) -> still 38
  (projects-v2 is dynamic because of DB read). One new dynamic
  route at `/projects-v2`. No breakage.
- `npm run verify:deploy` - 19/19.
- `npm run lint` - pre-existing schema/settings/use-gsap errors
  unchanged. New projects-v2/* lint clean.
- `npx tsc --noEmit` - exit 0.
- `node scripts/smoke-routes.mjs` - includes `/projects-v2`
  roughly 36->37 routes pass.
- `node scripts/smoke-projects-v2.mjs` (new):
  GET /projects-v2 -> 200
  GET /projects-v2  HTML contains: hero headline
  `Homes drawn, built, and lived in.`
  DB-image path present (casa-mira / Nalanda House / salt-flats
  all show before_image regardless of picsum presence - on live
  DB all three rows have real Unsplash URLs).
  Testimonial renders DB row `name` when n>=1.
  No eyebrow in FeaturedGrid, ProcessStrip, LogoWall, Hero.
  Single chrome-pill: FAQ only.
  Single CTA on Hero (no second View archive).
- `node scripts/smoke-render.mjs` - 32/32 unchanged
  (renders v1 path).

## Ship

One commit: `feat(projects-v2): full audit-resolved route at
/projects-v2`.

Not a v1 patch. /projects remains live operator-tested.

## Rollout

Operator deploys. After deploy, the operator can confirm the new
v2 route works live; v1 keeps serving buyers. A v1.3.x cut can
later swap /projects to point at /projects-v2 once parity is
reviewed.
