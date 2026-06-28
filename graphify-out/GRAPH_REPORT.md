# Graph Report - etihad-interiors-website  (2026-06-28)

## Corpus Check
- 221 files · ~129,312 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1180 nodes · 1839 edges · 117 communities (88 shown, 29 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `faed0d8e`
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
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]

## God Nodes (most connected - your core abstractions)
1. `ensureMigrated()` - 97 edges
2. `pgOne()` - 42 edges
3. `pgMany()` - 32 edges
4. `openDb()` - 31 edges
5. `pgQuery()` - 27 edges
6. `requireLicense()` - 22 edges
7. `authOptions` - 21 edges
8. `9. Last session log` - 19 edges
9. `scripts` - 17 edges
10. `db` - 17 edges

## Surprising Connections (you probably didn't know these)
- `JournalPage()` --calls--> `ensureMigrated()`  [INFERRED]
  src/app/(public)/journal/page.tsx → src/lib/pg.ts
- `PageEditor()` --calls--> `ensureMigrated()`  [INFERRED]
  src/app/admin/pages/[id]/page.tsx → src/lib/pg.ts
- `JournalEntryPage()` --calls--> `ensureMigrated()`  [INFERRED]
  src/app/(public)/journal/[slug]/page.tsx → src/lib/pg.ts
- `ProjectDetailPage()` --calls--> `ensureMigrated()`  [INFERRED]
  src/app/(public)/projects/[slug]/page.tsx → src/lib/pg.ts
- `VoicesSeed()` --calls--> `ensureMigrated()`  [INFERRED]
  src/app/(public)/projects/[slug]/page.tsx → src/lib/pg.ts

## Import Cycles
- None detected.

## Communities (117 total, 29 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (46): LoginCard(), AdminPage(), metadata, safeCheckLicense(), safeGetServerSession(), InstallPage(), metadata, Action (+38 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (12): IssuePage(), metadata, listTenants(), DistroForm(), IssueForm(), RotateForm(), metadata, RotatePage() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (10): geist, geistMono, metadata, GA4Script(), I18nContext, I18nContextType, I18nProvider(), Language (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (15): Model3DViewerProps, Item, seed, openReadonlyDb(), FALLBACK, findTenant(), listTenants(), readBrandFor() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (31): Carry-forward, Etihad Interiors Theme - Built For Sale + Resell, Fixes, Important caveat, Lifecycle roll-forward, Migration hooks (v1.0.0), New surfaces (operator-only - not visible to buyers), Post-deploy checklist (operator fills in) (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (30): dependencies, bcryptjs, better-sqlite3, @dnd-kit/core, @dnd-kit/sortable, drizzle-orm, gsap, @hookform/resolvers (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.34
Nodes (12): authed(), cookieHeader(), del(), fail(), listBySlug(), log(), login(), main() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (17): scripts, build, db:inspect, dev, graphify:query, graphify:update, lint, migrate (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (4): ADMIN_NAV, AdminShell(), Tab, useToast()

### Community 10 - "Community 10"
Cohesion: 0.80
Nodes (4): fail(), log(), main(), ts()

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (15): Demo assets, Deploy, Etihad Interiors Theme (Envato), File listings for buyers, File listings for studio team, License + nulling posture, Live demo, Project structure (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (14): 10. Operator console: superadmin, 11. Curl smoke for operator, 12. DB persistence, 13. Going to v1.2, 1. Import the repo in Vercel, 2. Environment variables (Production scope), 3. Domain attach, 4. First deploy (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (28): 1. What this is, 2026-06-23 - mega-deploy v1.1.0, 2026-06-25 — final doc + graph refresh, 2026-06-25 — Graphify install + session protocol wiring, 2026-06-25 — migration plan drafted (v1.1.2 / Supabase swap), 2026-06-25 — Phase 1 connectivity landed + admin seed + abandoned CSRF chain, 2026-06-25 — post-deploy bugfix sweep (v1.1.0 follow-up), 2026-06-26 — diagnosis + probe hardening (no deploy) (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (12): args, contrast(), db, DB_PATH, dirtyPath(), distro, errors, existing (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (13): accentPng(), alignTo4(), buildGlb(), ceilPng(), f32(), floorPng(), makePng(), OUT (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (10): authOptions, findUserByEmail(), findUserByEmailLegacy(), getVercelHotCopy(), isVercelSqlitePath(), UserRow, getPool(), poolUrl() (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.23
Nodes (13): db, pgQuery(), POST(), GET(), POST(), DELETE(), GET(), isAuthorized() (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (26): AdminJournalForm(), slugify(), AdminProjectForm(), FormState, arr(), ArraySchema, BlockSchema, FieldSchema (+18 more)

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
Cohesion: 0.19
Nodes (9): AboutPage(), getTeam(), metadata, getDrizzle(), getSqliteDrizzle(), teamMembers, GET(), isAuthorized() (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (12): args, __dirname, FORCE, JOURNAL, main(), MEDIA, PROJECTS, repoRoot (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (4): defaultEntries, Entry, JournalPreview(), Props

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
Cohesion: 0.13
Nodes (14): PageEditor(), auditLog, journalPosts, media, menuItems, menus, pageBlocks, pages (+6 more)

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
Cohesion: 0.11
Nodes (15): GLBThumbProps, formatBytes(), kindFromMime(), MAX_BYTES, MediaKind, MediaListResponse, MediaRow, MEDIATYPE_LABEL (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.53
Nodes (5): BlobAdapter, BlobUploadResult, getBlobAdapter(), makeLocalAdapter(), makeVercelAdapter()

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (3): ITEMS, OperatorNav(), metadata

### Community 49 - "Community 49"
Cohesion: 0.19
Nodes (11): GET(), ensureHotCopy(), getSqlite(), getVercelHotCopyPath(), isLocalDevPath(), isPostgres(), isVercel(), isVercelFallbackPath() (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (3): Row, Sort, metadata

### Community 55 - "Community 55"
Cohesion: 0.62
Nodes (6): expectStatus(), fail(), fetchRaw(), log(), main(), ts()

### Community 57 - "Community 57"
Cohesion: 0.53
Nodes (5): COLUMN_MAP, DELETE(), GET(), isAuthorized(), PUT()

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (9): Footer(), NewsletterForm(), State, ContactPage(), metadata, settings, defaults, getSiteSettings() (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.50
Nodes (3): graphify, Session protocol (read before any change), This is NOT the Next.js you know

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (5): expectStatus(), fail(), log(), main(), ts()

### Community 62 - "Community 62"
Cohesion: 0.20
Nodes (5): __dirname, JSON_COLUMNS, main(), replayTable(), repoRoot

### Community 85 - "Community 85"
Cohesion: 0.22
Nodes (15): ok(), POST(), gateOrFail(), openDb(), BlockRow, getFrontPage(), getPageById(), getPageBySlug() (+7 more)

### Community 86 - "Community 86"
Cohesion: 0.21
Nodes (5): LicenseBanner(), CheckResult, reasonText, SafeLicenseBanner(), SmoothScroll()

### Community 89 - "Community 89"
Cohesion: 0.25
Nodes (7): adm, dbPath, __dirname, env, envFile, rows, sqlite

### Community 90 - "Community 90"
Cohesion: 0.18
Nodes (7): metadata, NotFound(), Props, JournalEntryPage(), ProjectDetailPage(), Row, VoicesSeed()

### Community 91 - "Community 91"
Cohesion: 0.15
Nodes (12): Frame, Phase 0 - export + plan doc (this session landing), Phase 1 - Postgres-only runtime, Phase 2 - Media pipeline, Phase 3 - Media library UI, Phase 4 - Pages builder (TipTap), Phase 5 - Project CRUD, Phase 6 - Journal CRUD (+4 more)

### Community 94 - "Community 94"
Cohesion: 0.38
Nodes (6): dumpTable(), main(), OUT_DIR, SOURCE, TABLES, todayStamp()

### Community 95 - "Community 95"
Cohesion: 0.18
Nodes (13): AdminTeamEditor(), AdminTestimonialEditor(), pgOne(), testimonials, metadata, metadata, DELETE(), GET() (+5 more)

### Community 96 - "Community 96"
Cohesion: 0.35
Nodes (7): POST(), getOperatorSession(), rotateHmac(), signLicense(), POST(), GET(), POST()

### Community 97 - "Community 97"
Cohesion: 0.08
Nodes (32): DB_PATH, deleteMedia(), getMediaById(), insertMedia(), listMedia(), MediaItem, MediaKind, MediaListFilters (+24 more)

### Community 98 - "Community 98"
Cohesion: 0.29
Nodes (3): Row, Sort, metadata

### Community 99 - "Community 99"
Cohesion: 0.61
Nodes (7): checkEntity(), expectStatus(), fail(), fetchRaw(), log(), main(), ts()

### Community 100 - "Community 100"
Cohesion: 0.62
Nodes (6): expectStatus(), fail(), fetchRaw(), log(), main(), ts()

### Community 101 - "Community 101"
Cohesion: 0.33
Nodes (6): getAuditLog(), getMetrics(), License, metadata, MetricsPage(), GET()

### Community 102 - "Community 102"
Cohesion: 0.29
Nodes (3): Row, Sort, metadata

### Community 103 - "Community 103"
Cohesion: 0.29
Nodes (3): Row, Sort, metadata

### Community 104 - "Community 104"
Cohesion: 0.36
Nodes (8): gateOrFail(), PUT(), applyDistro(), revokeTenant(), updateTenant(), withPgTx(), DELETE(), PATCH()

### Community 105 - "Community 105"
Cohesion: 0.27
Nodes (7): TenantDetailPage(), getTenant(), safeJson(), defaultDistro(), TenantDetailClient(), GET(), metadata

### Community 106 - "Community 106"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/better-sqlite3, @types/node, @types/react (+2 more)

### Community 107 - "Community 107"
Cohesion: 0.27
Nodes (8): GET(), GET(), isAuthorized(), POST(), pgMany(), GET(), isAuthorized(), POST()

### Community 108 - "Community 108"
Cohesion: 0.44
Nodes (8): cookieHeader(), fail(), log(), login(), main(), mergeCookies(), rawFetch(), ts()

### Community 109 - "Community 109"
Cohesion: 0.22
Nodes (5): Row, StudioServer(), Row, VoicesServer(), metadata

### Community 110 - "Community 110"
Cohesion: 0.36
Nodes (6): useI18n(), Navbar(), Theme, ThemeContext, ThemeContextType, useTheme()

### Community 111 - "Community 111"
Cohesion: 0.33
Nodes (3): CalendlyEmbed(), CalendlyEmbedProps, State

### Community 112 - "Community 112"
Cohesion: 0.33
Nodes (3): JournalPage(), Row, metadata

### Community 113 - "Community 113"
Cohesion: 0.83
Nodes (3): createTenant(), POST(), timingSafeHexEq()

### Community 114 - "Community 114"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **484 isolated node(s):** `$schema`, `plugin`, `eslintConfig`, `install.sh script`, `config` (+479 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ensureMigrated()` connect `Community 85` to `Community 0`, `Community 1`, `Community 3`, `Community 17`, `Community 18`, `Community 19`, `Community 23`, `Community 35`, `Community 49`, `Community 57`, `Community 90`, `Community 95`, `Community 96`, `Community 97`, `Community 101`, `Community 104`, `Community 105`, `Community 107`, `Community 109`, `Community 112`, `Community 113`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `appendAudit()` connect `Community 0` to `Community 49`, `Community 18`, `Community 85`, `Community 23`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `openPostgres()` connect `Community 20` to `Community 23`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `ensureMigrated()` (e.g. with `AdminJournalEditor()` and `AdminProjectEditor()`) actually correct?**
  _`ensureMigrated()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `pgOne()` (e.g. with `AdminJournalEditor()` and `AdminProjectEditor()`) actually correct?**
  _`pgOne()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `openDb()` (e.g. with `appendAudit()` and `POST()`) actually correct?**
  _`openDb()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugin`, `eslintConfig` to the rest of the system?**
  _484 weakly-connected nodes found - possible documentation gaps or missing edges._