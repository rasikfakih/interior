# Graph Report - etihad-interiors-website  (2026-06-26)

## Corpus Check
- 180 files · ~100,733 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 928 nodes · 1243 edges · 89 communities (63 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `451e3142`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]

## God Nodes (most connected - your core abstractions)
1. `openDb()` - 37 edges
2. `requireLicense()` - 24 edges
3. `authOptions` - 19 edges
4. `db` - 17 edges
5. `compilerOptions` - 16 edges
6. `scripts` - 15 edges
7. `checkLicense()` - 15 edges
8. `Etihad Interiors Theme (Envato)` - 15 edges
9. `getOperatorSession()` - 14 edges
10. `Operator crib sheet - Vercel deploy + studio operator console` - 14 edges

## Surprising Connections (you probably didn't know these)
- `ProjectDetailPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/(public)/projects/[slug]/page.tsx → src/app/not-found.tsx
- `POST()` --calls--> `openDb()`  [INFERRED]
  src/app/api/admin/license/route.ts → src/lib/db.ts
- `POST()` --calls--> `requireLicense()`  [INFERRED]
  src/app/api/license/route.ts → src/lib/license-gate.ts
- `GET()` --calls--> `openDb()`  [INFERRED]
  src/app/api/pages/route.ts → src/lib/db.ts
- `POST()` --calls--> `openDb()`  [INFERRED]
  src/app/api/pages/route.ts → src/lib/db.ts

## Import Cycles
- None detected.

## Communities (89 total, 26 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (51): GET(), gateOrFail(), PUT(), LicenseBanner(), CheckResult, reasonText, SafeLicenseBanner(), InstallPage() (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (47): metadata, TenantDetailPage(), gateOrFail(), PATCH(), IssuePage(), metadata, POST(), getDrizzle() (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (26): geist, geistMono, metadata, CalendlyEmbed(), CalendlyEmbedProps, Footer(), GA4Script(), I18nContext (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (18): Model3DViewerProps, Item, seed, ensureCopied(), isVercel(), openReadonlyDb(), pickTargetPath(), FALLBACK (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (25): Etihad Interiors Theme - Built For Sale + Resell, Fixes, Important caveat, Lifecycle roll-forward, Migration hooks (v1.0.0), New surfaces (operator-only - not visible to buyers), Post-deploy checklist (operator fills in), Public runtime impact (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (43): dependencies, bcryptjs, better-sqlite3, @dnd-kit/core, @dnd-kit/sortable, drizzle-orm, gsap, @hookform/resolvers (+35 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (20): DB_PATH, deleteMedia(), getMediaById(), insertMedia(), listMedia(), MediaItem, MediaKind, MediaListFilters (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (15): scripts, build, db:inspect, dev, graphify:query, graphify:update, lint, migrate (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (9): ADMIN_NAV, AdminShell(), Tab, useToast(), LoginCard(), AdminPage(), metadata, safeCheckLicense() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (10): auditLog, media, menuItems, menus, pageBlocks, pages, revisions, siteIdentity (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (15): Demo assets, Deploy, Etihad Interiors Theme (Envato), File listings for buyers, File listings for studio team, License + nulling posture, Live demo, Project structure (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (14): 10. Operator console: superadmin, 11. Curl smoke for operator, 12. DB persistence, 13. Going to v1.2, 1. Import the repo in Vercel, 2. Environment variables (Production scope), 3. Domain attach, 4. First deploy (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (16): 1. What this is, 2026-06-23 — mega-deploy v1.1.0, 2026-06-25 — final doc + graph refresh, 2026-06-25 — Graphify install + session protocol wiring, 2026-06-25 — migration plan drafted (v1.1.2 / Supabase swap), 2026-06-25 — Phase 1 connectivity landed + admin seed + abandoned CSRF chain, 2026-06-25 — post-deploy bugfix sweep (v1.1.0 follow-up), 2. Stack and ground rules (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (12): args, contrast(), db, DB_PATH, dirtyPath(), distro, errors, existing (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (13): accentPng(), alignTo4(), buildGlb(), ceilPng(), f32(), floorPng(), makePng(), OUT (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (4): defaultEntries, Entry, JournalPreview(), Block

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (6): metadata, NotFound(), isAuthorized(), POST(), journalPosts, JournalEntryPage()

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (10): ok(), POST(), authOptions, testimonials, handler, DELETE(), isAuthorized(), PUT() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (5): Block, BLOCK_REGISTRY, BLOCK_TYPES, BlockDefinition, BlockType

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (20): openPostgres(), auditLog, drizzlePostgres(), journalPosts, media, menuItems, menus, newsletterSubscribers (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (11): Common buyer objections and how to answer them, How a buyer finds the demo, Lead follow-up, Refund policy (studio's stay), Sales notes, Studio pain points to highlight in the listing, The one-liner, Tier costs (current pricing) (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (11): columnsOf(), DB_PATH, ensureColumn(), run(), seedDefaultAdmin(), seedDefaultSettings(), seedMenus(), sid (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (6): FormState, EMPTY_DOC, RichTextEditor(), RichTextEditorProps, safeParse(), Toolbar

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (7): db, projects, DB_PATH, isAuthorized(), POST(), ProjectDetailPage(), seedProjects

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (3): defaultItems, Props, capabilities

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (10): Demo URL, Envato sales brief — Etihad Interiors Theme, File listing for buyer onboarding, Onboarding (buyer-side), Sales screenshots, Studio-side (operator), Tier matrix, What buyers get on day one (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (10): Apply a custom distro at install time, Environment, INSTALL - Etihad Interiors Theme v1.1.0, Manual install (no install.sh flag), One-line, Removing the license for testing, Unblocking an install that's stuck, What runs after install (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (10): Buyer onboarding (Envato purchase -> live site), Demo + support, Envato Extended License note, Etihad Interiors Theme - License, Online vs offline license modes, Scope freeze, Telemetry / observability, Tiers (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (10): 0. One-minute pre-flight, 1. Vercel - import the repo, 2. Environment Variables - Production scope only, 3. Domain attach, 4. Deploy, 5. First-visit smoke test (do all five), 6. Things that can go wrong, 7. After deploy (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (10): buildCommand, devCommand, env, NEXT_PUBLIC_SITE_URL, framework, headers, installCommand, outputDirectory (+2 more)

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (9): Buyer-first language, Decision log, Hard rules, How to roll the freeze forward, Refactoring without changing behavior, Scope guardrails, What can change without breaking the freeze, What cannot change without breaking the freeze (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.20
Nodes (9): Buyer admin onboarding, Buyer support contract, Client handoff runbook, Preconditions, Re-handoff on tier upgrade, Self-host path (Node.js host), Steps, Vercel path (most common) (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.20
Nodes (9): Audit log, Daily outline, DB persistence caveat, Envato sale flow (most common path), First sign-in, Manual HMAC rotation, Manual tenant onboarding (not Envato), Operator quick reference (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (8): aboutPage, blockCount, contactPage, DB_PATH, journal, pageRow, projectsPage, sqlite

### Community 35 - "Community 35"
Cohesion: 0.28
Nodes (6): AboutPage(), getTeam(), metadata, teamMembers, isAuthorized(), POST()

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (6): Mark, Node, renderBlock(), renderInline(), RichTextRendererProps, TextNode

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (8): Demo fallbacks, Demo maintenance, Deploy to Vercel (`ethinterior.vercel.app`), One-shot deploy, Production buyers on custom domains, Strategy, Tenant demo state across deploys, What the demo shows

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (8): File location, Forbidden keys (rejected at submit), Future (v1.2+), How a distro lands on a tenant, Optional keys, Required keys, theme.distro.json - schema and rules, Validation rules

### Community 40 - "Community 40"
Cohesion: 0.25
Nodes (8): main(), OUT_DIR, PALETTES, scene, svg(), TASKS, UP_DIR, UPLOAD_COPIES

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (7): body, DB_LICENSE, expiresAt, installedAt, license, signature, VALID_DAYS

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (3): KIND_FILTERS, MediaItem, metadata

### Community 46 - "Community 46"
Cohesion: 0.53
Nodes (5): BlobAdapter, BlobUploadResult, getBlobAdapter(), makeLocalAdapter(), makeVercelAdapter()

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (3): ITEMS, OperatorNav(), metadata

### Community 49 - "Community 49"
Cohesion: 0.70
Nodes (4): DELETE(), GET(), isAuthorized(), PUT()

### Community 57 - "Community 57"
Cohesion: 0.83
Nodes (3): DELETE(), isAuthorized(), PUT()

### Community 58 - "Community 58"
Cohesion: 0.83
Nodes (3): DELETE(), isAuthorized(), PUT()

### Community 59 - "Community 59"
Cohesion: 0.50
Nodes (3): graphify, Session protocol (read before any change), This is NOT the Next.js you know

### Community 61 - "Community 61"
Cohesion: 0.17
Nodes (6): DB_PATH_HINT, DbHandle, SOURCE_DB, settings, defaults, SiteSettings

### Community 62 - "Community 62"
Cohesion: 0.20
Nodes (5): __dirname, JSON_COLUMNS, main(), replayTable(), repoRoot

### Community 85 - "Community 85"
Cohesion: 0.27
Nodes (7): BlockRow, getFrontPage(), getPageById(), getPageBySlug(), listPages(), PageRow, Home()

### Community 86 - "Community 86"
Cohesion: 0.22
Nodes (8): checkRowCount(), __dirname, JOURNAL, main(), PROJECTS, repoRoot, TEAM, TESTIMONIALS

## Knowledge Gaps
- **416 isolated node(s):** `eslintConfig`, `install.sh script`, `config`, `nextConfig`, `name` (+411 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `openDb()` connect `Community 1` to `Community 0`, `Community 3`, `Community 18`, `Community 85`, `Community 61`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `openPostgres()` connect `Community 20` to `Community 61`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `appendAudit()` connect `Community 0` to `Community 1`, `Community 61`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `openDb()` (e.g. with `appendAudit()` and `POST()`) actually correct?**
  _`openDb()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `requireLicense()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`requireLicense()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `install.sh script`, `config` to the rest of the system?**
  _416 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05200341005967604 - nodes in this community are weakly interconnected._