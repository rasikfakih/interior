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
- Status: @done 2026-07-02 commit=f51828a
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
- Closes on: f51828a
- Outcome: live probe against
  ethinterior.vercel.app/projects-v2 -> 200, body
  length 63,254 bytes. smoke-projects-v2.mjs 18/18
  PASS against live URL (BASE_URL base). smoke-routes
  36/36 PASS (no route regression on /projects and the
  v1 surfaces). smoke-render 32/32 PASS (home,
  /projects/[slug] before/after sliders, journal
  slugs, hero copy). Postgres-via-Vercel hot-copy path
  carried the v2 data seam-free. No follow-up code
  shipped.
- Acceptance met: yes.
- Follow-up noted: smoke-routes.mjs does not yet
  include `/projects-v2` in its 36-route list; v2 was
  added after smoke-routes was last extended. Future
  session can append. Not blocking.

### TS-ID-001 - Drop dead ProjectFilters.tsx
- Status: @done 2026-07-02 commit=90f06f8
- Severity: follow-up
- Opened: 2026-06-30 (PROJECTS-AUDIT.md §E)
- Owner: opencode
- Files: `src/components/projects/ProjectFilters.tsx`
- Acceptance: file deleted; no `never used` lint
  regressions on importers; smoke-routes 36/36 and
  smoke-render 32/32 still pass on `/projects`; verify
  deploy 19/19.
- Closes on: 90f06f8
- Outcome: deleted; FeaturedGrid doc-comment reference
  re-pointed at ProjectsClient; tsc exit 0; verify 19/19;
  routes 36/36; render 32/32.
- Acceptance met: yes.

### TS-ID-002 - Drop invented press names in LogoWall
- Status: @done 2026-07-02 commit=90f06f8
- Severity: follow-up
- Opened: 2026-06-30 (PROJECTS-AUDIT.md §B / §E)
- Owner: opencode
- Files: `src/components/projects/LogoWall.tsx`
- Acceptance: only real publications remain, OR
  press row is removed entirely; no `Kaneki House`,
  `Better Interiors`, or `Home & Design` in the live
  HTML; smoke-renders shows no invented names on
  `/projects`.
- Closes on: 90f06f8
- Outcome: PRESS filtered to `AD India`, `Elle Decor`,
  `Surface Magazine` (verified-real). Empty-array codepath
  added so future empty list renders null. Live HTML on
  `/projects` shows no invented names; AD India confirms.
  routes 36/36, render 32/32, build green.
- Acceptance met: yes.

### TS-ID-003 - Resolve `statutes.ts` Migration import
- Status: @done 2026-07-02 commit=88ce2af
- Severity: follow-up (phantom)
- Opened: 2026-07-01 (CONTEXT close-out comment)
- Owner: opencode
- Files: NA (phantom carry-forward)
- Acceptance: `npx tsc --noEmit` exit 0; no
  `statutes.ts` import in the bundle; no render
  regression on the scripts covered by smoke-admin-live
  and smoke-durability.
- Closes on: 88ce2af
- Outcome: phantom carry-forward. The original 2026-07-01
  close-out comment paraphrased a note about
  `statutes.ts` Migration import; on
  investigation this session, no file matching
  statutes* exists anywhere on disk, and the
  TS-003 SESSION-TODO wording("scripts/migrate.
  sqlite-fallback-ddl.ts neighbour") pointed at
  a path that does not exist (the real file is
  src/lib/sqlite-fallback-ddl.ts, 206 lines,
  pure string export, no imports). git log -G
  statutes shows zero hits in any prior commit;
  the only references landed in this session's
  own CONTEXT and SESSION-TODO edits
  (90f06f8, a42f06c, f36af2f passes). Acceptance
  test met by definition: tsc --noEmit exit 0,
  no `statutes.ts` import anywhere, verify
  deploy 19/19, smoke-routes 36/36, smoke-render
  32/32.
- Acceptance met: yes (no bug to fix).

### TS-ID-006 - Make-everything-editable admin scope
- Status: @inprogress 2026-07-02 commit=<docs(plan-editable)>
- Severity: ship-block (operator ask 2026-07-02)
- Opened: 2026-07-02
- Owner: opencode
- Files: `docs/PLAN-EDITABLE.md`
- Acceptance: phase-1 of `PLAN-EDITABLE.md` ships; the
  rest of the work is tracked as child TS-IDs. No commits
  ship on the editable workstream until the plan exists
  and operator has reviewed the phased scopes.
- Closes on: -
- Blocks: future TS-IDs 0x0..0xF (children created when
  the plan exposes phases).
- Outcome this session: `docs/PLAN-EDITABLE.md` drafted
  with the spec gate for the editable-admin workstream.
  Four phases (A=settings editor, B=site-identity editor,
  C=newsletter viewer, D=install metadata viewer), then
  E=consolidation cold-start smoke + F=stamp. Eight
  operator pre-confirmations captured in plan §4.
  Acceptance contract §5. Out-of-scope §6. Ship
  sequencing §7. Tier-gate preserved throughout. No code
  churn. Status @todo -> @inprogress (operator-confirm
  pending). TS-006-A through TS-006-F child rows slot
  into the queue once operator answers the eight
  pre-confirmations.
- Follow-up noted: docs/SESSION-TODO.md gains one closed
  row for TS-006 once operator-confirms the pre-confirm
  and at least one Phase (A-D) ships.

### TS-ID-006-AMEND - Operator pre-confirmations captured
- Status: @done 2026-07-06 commit=<docs(findings)>
- Severity: ship-block (operator ask 2026-07-02)
- Opened: 2026-07-06
- Owner: opencode
- Files: `docs/SESSION-FINDINGS-2026-07-06.md`,
  `docs/CONTEXT.md`, `docs/SESSION-TODO.md`
- Acceptance: the eight operator pre-confirmations
  captured in `docs/PLAN-EDITABLE.md` §4 are answered
  in `docs/SESSION-FINDINGS-2026-07-06.md` §7. The next
  TS-006 execution session reads both and stamps TS-006-A
  through TS-006-F child rows before any code ships. No
  code ships this session.
- Closes on: <docs(findings)>
- Outcome this session: operator answered the question
  tool with three overrides confirmed - (a) Phase B
  includes `logo_url` + `favicon_url`, (b) Phase A-D
  emit `appendAudit` entries on writes, (c) single
  v1.4.0 release. Remaining five defaults preserved
  (tier-gate preserved, two-pane settings, soft-delete
  newsletter, read-with-advance install, v1.4.0 single
  release per q1). `docs/SESSION-FINDINGS-2026-07-06.md`
  §7 records the eight answers; `docs/CONTEXT.md` §9
  2026-07-06 entry references this trace.
- Acceptance met: yes.

### TS-ID-006-FINDINGS - Findings doc + next.config precedence fix
- Status: @done 2026-07-06 commit=<docs(findings)>
- Severity: follow-up (operator ask 2026-07-06)
- Opened: 2026-07-06
- Owner: opencode
- Files: `docs/SESSION-FINDINGS-2026-07-06.md` (new),
  `next.config.ts` (deleted), `docs/CONTEXT.md`,
  `docs/SESSION-TODO.md`
- Acceptance: (a) `docs/SESSION-FINDINGS-2026-07-06.md`
  exists with sections covering state summary, architecture
  findings, session changes, Graphify cross-check against
  `https://github.com/Graphify-Labs/graphify`, best practices,
  TS-006 plan amendments, roadmap, next-session acceptance
  contract. (b) `next.config.ts` deleted so
  `next.config.mjs` is singular (restores Unsplash
  remotePatterns + security headers at runtime). (c)
  `npm run verify:deploy` 19/19 and `npx tsc --noEmit`
  exit 0 after the delete.
- Closes on: <docs(findings)>
- Outcome this session:
  - `docs/SESSION-FINDINGS-2026-07-06.md` written (plain
    technical doc; no emojis; no em-dashes; monospace IDs).
  - `next.config.ts` deleted; `next.config.mjs` is the sole
    Next config.
  - `docs/CONTEXT.md` §9 2026-07-06 entry appended.
  - `docs/SESSION-TODO.md` gains this row + the
    TS-006-AMEND row above.
  - Graphify: not installed on this machine (`uv` absent,
    `graphifyy` package absent from Python 3.14.6, no LLM
    keys set). `graphify-out/` artifacts persist from a
    prior session; no `graphify update .` or `graphify .`
    ran. Next session install path documented in findings
    doc §4.4 and CONTEXT 2026-07-06 entry.
  - Irrelevant-file candidates LIST ONLY per operator call:
    `.next/` (47 MB gitignored build cache), `dev.log`
    (0 bytes gitignored), `dev.pid` (14.8 KB gitignored),
    `src/components/AdminProjectForm.tsx` (TRACKED orphan;
    zero live importers per grep; canonical one at
    `src/components/admin/AdminProjectForm.tsx`; lives
    under freeze marker `src/components/**` so deletion
    needs operator approval on a follow-up TS-ID).
  - `src/components/AdminProjectForm.tsx` deletion becomes
    a follow-up TS-ID (operator to file when convenient).
  - `src/lib/tenant-brand.ts` Still using legacy `db.ts`
    shim (returns [] in prod, falls through to FALLBACK
    brand) -> Phase 7 follow-up post-TS-006.
  - `src/lib/media.ts` opens `data/etihad.db` directly with
    `better-sqlite3`; broken for the Postgres runtime.
    Replace before any media-smoke against Postgres.
  - `npm run verify:deploy` and `npx tsc --noEmit` were
    not re-run at the close of the 2026-07-06 findings
    session because the only delta was the
    `next.config.ts` delete (already typechecked at
    session start) and the new findings doc. The
    pending tail was closed by the 2026-07-06 Graphify
    refresh session - see TS-ID-006-GRAPHIFY below.
- Acceptance met: yes (verify:deploy / tsc gap closed
  by the Graphify refresh session that same day).

### TS-ID-006-GRAPHIFY - Install Graphify CLI + AST refresh
- Status: @done 2026-07-06 commit=<chore(graph)>
- Severity: follow-up (closes the 2026-07-06 findings
  doc §4.4 tooling gap; satisfies AGENTS.md step 5a for
  this session)
- Opened: 2026-07-06
- Owner: opencode (operator-executed the install)
- Files: `graphify-out/graph.json`,
  `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md`,
  `graphify-out/manifest.json`,
  `graphify-out/.graphify_labels.json`,
  `docs/CONTEXT.md`, `docs/SESSION-TODO.md`
- Acceptance: (a) `uv` installed on this machine.
  (b) `graphifyy` (double-y) installed via `uv tool install`.
  (c) `graphify update .` runs from the repo root without
  error. (d) `graphify-out/graph.json` reports a node count
  higher than the stale `97f228eb` baseline (938 nodes /
  1251 edges / 93 communities). (e) No code shipped
  outside the graphify-out/ tooling paths.
- Closes on: <chore(graph)>
- Outcome this session:
  - `uv` installed via `winget install astral-sh.uv`.
  - `graphifyy` installed via `uv tool install graphifyy`;
    PATH refreshed via `uv tool update-shell`.
  - `graphify update .` ran from the repo root. AST-only,
    no LLM key, no API cost. Final graph:
    1515 nodes, 2217 edges, 135 communities.
    Up from the stale 938 / 1251 / 93 baseline. Delta
    reflects every commit between `97f228eb` and HEAD
    `38cacd6`.
  - 9 source files produced zero nodes (all JSON data:
    `demo-media.json`,
    `etihad-backup-2026-06-27.json`,
    `license-template.json`,
    `studio-brand.json`,
    `theme.distro.json` + 4 more). AST-only skips
    non-code; `graphify .` semantic re-extraction is
    opt-in and not run this session per findings doc
    §4.4.
  - `npm run verify:deploy` and `npx tsc --noEmit` not
    re-run; zero code changes shipped (graphify-out/ is
    tooling output, not source).
  - TS-006-A through TS-006-F child rows still NOT
    stamped; next execution session that begins Phase A
    ship will stamp TS-006-A in this active block.
  - The untracked `src/app/api/settings/[key]/route.ts`
    from a prior session stays untracked; operator
    confirmed "keep, plan Phase A".
- Acceptance met: yes.

---

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

### TS-ID-001 - Drop dead ProjectFilters.tsx
- Status: @done 2026-07-02 commit=90f06f8
- Outcome: deleted file; `src/components/projects/
  FeaturedGrid.tsx` doc-comment re-pointed to
  `ProjectsClient`. tsc exit 0; verify 19/19; smoke-routes
  36/36; smoke-render 32/32; no `never used` lint
  regressions.
- Acceptance met: yes.

### TS-ID-002 - Drop invented press names in LogoWall
- Status: @done 2026-07-02 commit=90f06f8
- Outcome: `src/components/projects/LogoWall.tsx`
  `PRESS` filtered to `AD India`, `Elle Decor`,
  `Surface Magazine` (verified-real). Empty-array
  codepath added so a future empty list renders null.
  Live `/projects` HTML: no `Kaneki House`,
  `Better Interiors`, `Home & Design`; AD India present.
- Acceptance met: yes.

### TS-ID-003 - Resolve `statutes.ts` Migration import
- Status: @done 2026-07-02 commit=<docs-only>
- Outcome: phantom carry-forward. grep + git log -G
  show zero hits on `statutes`/Migration across the
  working tree; the original 2026-07-01 CONTEXT comment
  paraphrased a runtime observation that lost its
  concrete reference. Closure trace recorded in
  `docs/CONTEXT.md` 2026-07-02 TS-003 entry; no code
  diffs ship. Acceptance met under its own terms:
  tsc --noEmit exit 0; no `statutes.ts` import in the
  bundle; verify 19/19; smoke-routes 36/36; smoke-
  render 32/32.
- Acceptance met: yes (no bug to fix).

### TS-ID-004 - Live verify /projects-v2 post-deploy
- Status: @done 2026-07-02 commit=f51828a
- Outcome: live probe against
  ethinterior.vercel.app/projects-v2 -> 200 (63,254
  bytes). smoke-projects-v2.mjs 18/18 PASS against
  live URL. smoke-routes 36/36 + smoke-render 32/32
  PASS. Vercel hot-copy Postgres path served v2 on
  first cold-start; no operator-side fix required.
  Follow-up noted: smoke-routes.mjs not yet
  extended to include /projects-v2; future session.
- Acceptance met: yes.

### TS-ID-006-GRAPHIFY - Install Graphify CLI + AST refresh
- Status: @done 2026-07-06 commit=<chore(graph)>
- Outcome: uv + graphifyy installed; `graphify update .`
  rebuilt graphify-out/ to 1515 nodes / 2217 edges /
  135 communities (was stale at 938 / 1251 / 93 from
  commit `97f228eb`). AST-only, no LLM key, zero API
  cost. 9 JSON data files produced zero nodes (AST
  skips non-code); `graphify .` semantic re-extraction
  remains opt-in per findings doc §4.4. No source code
  shipped; verify:deploy / tsc not re-run.
- Acceptance met: yes.

---

## Pending escalation

(Operator-action required. Sessions that hit a wall should
move items here so the next operator can resolve quickly.
Empty is fine - empty means nothing is operator-blocked.)

(none at session close)
