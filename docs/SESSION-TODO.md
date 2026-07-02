# Session Todo State

Updated at the start and end of every OpenCode session.
Append-only on end. Read-at-start is mandatory under
AGENTS.md step 5c.

`docs/CONTEXT.md` §9 is the prose narrative; this file
is the structured gate. Both ship. Both persist. The
narrative doc carries "why" and "how"; this doc carries
"what is required to ship" and "what shipped last session"
in a grep-able shape.

Owner: OpenCode session. Operator is the human reviewer;
the agent is the writer.

---

## Active todos

(Sorted by severity desc, then TS-ID asc. Each active
entry below is one row of structured state. Updates
flip one line at a time.)

### TS-ID-005 - Create this document
- Status: @done 2026-07-02 commit=<docs(governance)>
- Severity: ship-block
- Opened: 2026-07-02
- Owner: opencode
- Files: `docs/SESSION-TODO.md`, `AGENTS.md`
- Acceptance: file exists at repo root next to
  `docs/CONTEXT.md`; AGENTS.md step 5c appended; initial
  seed of 5 carry-forwards backfilled; one commit on
  `main` (`docs(governance): session todo gate + AGENTS.md
  step 5c`); git push confirmed.
- Closes on: docs(governance)

### TS-ID-004 - Live verify /projects-v2 post-deploy
- Status: @todo
- Severity: ship-block
- Opened: 2026-07-02
- Owner: opencode
- Files: `src/app/(public)/projects-v2/page.tsx`,
  `scripts/smoke-projects-v2.mjs`
- Acceptance: GET `ethinterior.vercel.app/projects-v2`
  returns 200 with rendered HTML; smoke-projects-v2.mjs
  passes 18/18 on the live URL; routes smoke 36/36 +
  render smoke 32/32 stay green (v1 untouched). A separate
  post-deploy pass is required because Vercel hot-copies
  the SQLite bundle on first cold-start with a different
  node version than the local probe.
- Closes on: -

### TS-ID-001 - Drop dead ProjectFilters.tsx
- Status: @done 2026-07-02 commit=<tbd>
- Severity: follow-up
- Opened: 2026-06-30 (PROJECTS-AUDIT.md §E)
- Owner: opencode
- Files: `src/components/projects/ProjectFilters.tsx`
- Acceptance: file deleted; no `never used` lint
  regressions on importers; smoke-routes 36/36 and
  smoke-render 32/32 still pass on `/projects`; verify
  deploy 19/19.
- Closes on: tbd
- Outcome: deleted; FeaturedGrid doc-comment reference
  re-pointed at ProjectsClient; tsc exit 0; verify 19/19;
  routes 36/36; render 32/32.
- Acceptance met: yes.

### TS-ID-002 - Drop invented press names in LogoWall
- Status: @done 2026-07-02 commit=<tbd>
- Severity: follow-up
- Opened: 2026-06-30 (PROJECTS-AUDIT.md §B / §E)
- Owner: opencode
- Files: `src/components/projects/LogoWall.tsx`
- Acceptance: only real publications remain, OR
  press row is removed entirely; no `Kaneki House`,
  `Better Interiors`, or `Home & Design` in the live
  HTML; smoke-renders shows no invented names on
  `/projects`.
- Closes on: tbd
- Outcome: PRESS filtered to `AD India`, `Elle Decor`,
  `Surface Magazine` (verified-real). Empty-array codepath
  added so future empty list renders null. Live HTML on
  `/projects` shows no invented names; AD India confirms.
  routes 36/36, render 32/32, build green.
- Acceptance met: yes.

### TS-ID-003 - Resolve `statutes.ts` Migration import
- Status: @todo
- Severity: follow-up
- Opened: 2026-07-01 (CONTEXT close-out comment)
- Owner: opencode
- Files: `scripts/migrate.sqlite-fallback-ddl.ts`
  (statutes.ts neighbour); source of the unresolved
  Migration import to be located via `npm ls` or
  grep before patching.
- Acceptance: `npx tsc --noEmit` exit 0; no
  `statutes.ts` import in the bundle; no render
  regression on the scripts covered by smoke-admin-live
  and smoke-durability.
- Closes on: -

### TS-ID-006 - Make-everything-editable admin scope
- Status: @todo
- Severity: ship-block (operator ask 2026-07-02)
- Owner: opencode
- Files: TBD after `docs/PLAN-EDITABLE.md` drafted
- Acceptance: phase-1 of `PLAN-EDITABLE.md` ships; the
  rest of the work is tracked as child TS-IDs. No commits
  ship on the editable workstream until the plan exists
  and operator has reviewed the phased scopes.
- Closes on: -
- Blocks: future TS-IDs 0x0..0xF (children created when
  the plan exposes phases).

---

## Closed todos

(Append at end of session. Each closed row gets a
`@done YYYY-MM-DD commit=<hash>` stamp and a 1-line
outcome. Closed entries are NOT deleted; they live
forever so a session-start reader can trace what
already shipped.)

### TS-ID-005 - Create this document
- Status: @done 2026-07-02 commit=<docs(governance)>
- Outcome: `docs/SESSION-TODO.md` created with TS-ID
  format; 6 seed entries (this one + 5 carry-forward)
  backfilled; AGENTS.md session-protocol step 5c
  appended; CONTEXT close-out log appended; one commit
  on `main` and push confirmed.
- Acceptance met: yes.

---

## Pending escalation

(Operator-action required. Sessions that hit a wall should
move items here so the next operator can resolve quickly.
Empty is fine - empty means nothing is operator-blocked.)

(none at session close)
