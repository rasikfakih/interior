# Scope guardrails

This document is the operating brief for any developer (human or agent)
touching this repo after v1.0 ships. It exists so feature scope stays
defensible for buyers and reset cycles stay clean.

## Hard rules

1. **Hard feature freeze** at v1.0. No new file under `src/`,
   `src/components/`, `src/app/`, `src/lib/`, `src/cms/`, or any
   `scripts/`, or any `app/api/**` route, is permitted. Read-only
   edits, copy edits, accessibility fixes, and bug fixes only.

2. **Voice-of-buyer floor.** A new feature does **not** enter Room 2
   unless **three different buyers** have requested the same thing.
   Single-buyer requests get answered with consulting hours, not code.

3. **Buyer docs first.** Every ticket before coding must include a
   buyer story written in plain language. Reviewer judges
   implementations against the buyer story, not against an
   internal design.

4. **No buyer-driven scope creep.** Buyer asks for a hex color,
   typography tweak, copy variant, or avatar shape — handle it in
   `INSTALL.md` / `README.md` or in a template-config JSON. Don't
   touch product code.

5. **Roadmap acceptance window.** After v1.0 ships, run a 4-week
   acceptance window with no new features. Use that time to gather
   buyer feedback and write the Room 2 spec.

## Decision log

Every buyer request lands in `docs/feature-decisions.md` with:

  - Date the request was logged
  - Buyer name or handle (never include PII)
  - Request verbatim
  - Decision: YES / NO / ONE-OFF (with one-line reason)
  - Counter (how many distinct buyers asked this so far)

A "YES" only changes to "MERGE" once the counter clears 3 and the
4-week acceptance window has ended.

## Buyer-first language

When answering a buyer question, prefer answering with a doc link or
twenty-line config change over shipping a new code path:

- "Try `/admin/license`" - policy
- "Change `data/license.json`" - hand-stamp
- "Update `NEXT_PUBLIC_GA4_ID`" - env
- "Add to the docs" - contribution
- "Hire us for a one-off" - consulting

If you find yourself editing the codebase to satisfy a single buyer,
that is a signal to *recover the request into `feature-decisions.md`* and
move on.

## What can change without breaking the freeze

- `src/app/globals.css` color tweaks for one buyer's hotel chain
- `data/license.json` re-stamped via `/admin/license`
- `data/etihad.db` content (CMS Room 0 is the buyer's data)
- `public/demo/` photos (the buyer's media library)
- Settings + translations + site identity (everything in
  `site_identity` or in the `settings` or `translations` rows in CMS Room 1)
- `INSTALL.md` / `README.md` capture changes
- `scripts/migrate.mjs` for adding columns without semantic change

## What cannot change without breaking the freeze

- New block types
- New routes
- New mutating API endpoints
- New components that change render output
- License subsystem
- Anything in `src/lib/license.ts`, `src/lib/license-gate.ts`, `src/lib/license-key.test.ts`
- The seed data in `scripts/seed-pages.mjs` (after v1.0)

## How to roll the freeze forward

Day 1, week 9: read `docs/feature-decisions.md`, sort YES by counter,
pick a small SWAG of changes that have >= 3 votes and are useful for
more than one buyer. Open a Room 1.1 milestone with that scope.
Continue the freeze until that milestone ships.

## Refactoring without changing behavior

Performance work, dependency upgrades, and security patches that do
not change rendered output or API contract are permitted during the
freeze. Document the change in `CHANGELOG.md` under the same minor.

## What this document is not

This is not a freeze on the buyer-consumable CMS. Their data is
theirs to edit. This freezes the *external shape* of the product.
