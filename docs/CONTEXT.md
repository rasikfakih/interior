# Project Context — Etihad Interiors Theme

Read this file at the **start of every opencode session** before touching anything.
Last refreshed at the end of the previous build session.

---

## 1. What this is

A premium residential interior-design theme. Sold on Envato. Lives at
`github.com/rasikfakih/interior` and auto-deploys to `https://ethinterior.vercel.app`.

Two products, one repo, one demo URL:

| Context | What it does |
|---|---|
| Studio (the Etihad demo at `ethinterior.vercel.app`) | The studio's own marketing site, painted Etihad-branded. Drives Envato sales. |
| Theme (each tenant install) | Same codebase, white-labelled to the buyer's own studio brand. Buyers run `./install.sh --code=...` locally, host on their own Vercel or self-host. |

There is no separate operator demo. The operator console at `/superadmin` is
internal — buyers do not see it. It is reachable only with the
`SUPERADMIN_EMAIL` env var.

## 2. Stack and ground rules

- **Repo:** `github.com/rasikfakih/interior`
- **Framework:** Next.js 16 (App Router) + TypeScript, RSC by default
- **Database:** Supabase Postgres (production), SQLite fallback for local dev
- **Styling:** Tailwind v4 (CSS-first config, no `tailwindcss` plugin in PostCSS)
- **Animation:** Motion (`motion/react`) for UI, GSAP only for scroll-pinned hero
- **3D:** three.js + `@react-three/fiber` (lazy-loaded only, behind license gate)
- **Auth:** NextAuth credentials
- **License:** HMAC-signed offline; verified at request time
- **Package manager:** npm (no Bun)
- **Vercel plan:** Hobby; auto-deploys from `main`

## 3. Skill rules that always apply

| Rule | Reason |
|---|---|
| **No emojis** anywhere in code, comments, chat, or visible text. | Hard directive from project owner. |
| **No em-dashes (`—`)** in any user-visible text. Use regular hyphen `-`. | Top LLM tell. Skill rule, non-negotiable. |
| **No `Inter` as default font.** Use `Geist`, `Outfit`, `Cabinet Grotesk`, `Satoshi`, or project-appropriate serif only when justified. | Skill rule. |
| **No 3-column equal feature cards** for marketing pages. | Skill rule. |
| **`prefers-reduced-motion`** for anything above static. | Skill rule + a11y. |
| **One accent color, locked per page.** | Skill rule. |
| **One corner-radius scale, locked per page.** | Skill rule. |
| **Real images**, not div-based fake screenshots. For demo assets, generate real JPGs via `sharp` from procedural SVG. | Skill rule. Operator/admin surfaces are fine to be plain. |
| **`min-h-[100dvh]`**, never `h-screen`. | Skill rule. |
| For marketing pages: max 1 eyebrow per 3 sections. | Skill rule. Marketing pages only, not admin. |
| For marketing pages: never center hero unless editorial. Banned AI tells. | Skill rule. |

For **operator/admin surfaces** the marketing-page-specific rules (hero discipline,
bento repetition, eyebrow count) do not apply. Form density, monospace IDs,
clear labels — those do.

The taste-skill file lives at
`~/.opencode/skills/taste-skill/SKILL.md` (this repo's `.opencode/skills/taste-skill/`).
Read the full skill before any frontend decision, every new session.

## 4. Freeze marker — current state

This repo has a **freeze marker** rooted in old v1.0.0 work.
Current standing rule: do NOT add new code under `src/app/**`, `src/components/**`,
`src/lib/**`, `src/cms/**`, `scripts/migrate.mjs`, or `scripts/seed-pages.mjs`
without operator approval. New product code for v1.1 live under:

- `operator/` (superadmin pages + chrome)
- `app/api/operator/**` (operator-only routes)
- `app/api/envato/webhook/route.ts` (Envato intake)

White-label copy edits are scoped to `seed-pages.mjs` string content only —
no schema, route, or block-registry changes.

JSON config files (`theme.distro.json`, `data/studio-brand.json`) and
documentation files (`INSTALL.md`, `README.md`, `OPERATOR.md`, `SHIP.md`,
`DEPLOY.md`, `LICENSE.md`, `CHANGELOG.md`, `FREEZE-MARKER`,
`AGENT_BEST_PRACTICES.md`, `docs/feature-decisions.md`) edit freely.

## 5. What is built right now (Phase status as of session start)

- [x] **Phase 0** — repo skeleton: Next.js 16, Tailwind v4, Migrate/Seed scripts, license subsystem
- [x] **Phase 1** — Demo assets (8 JPGs in `public/demo/`, mirrored to `public/uploads/images/`)
- [x] **Phase 2** — Tenant model + Postgres: `tenants` table; legacy tables have `tenant_id`; adapter switches SQLite (local) vs Supabase (Vercel) by `DATABASE_URL`
- [x] **Phase 3** — Operator console under `operator/`: login, tenants list + detail, issue-license, theme-distro, rotate-hmac, metrics, Envato webhook
- [x] **Phase 4** — `theme.distro.json` schema + `scripts/apply-distro.mjs`
- [x] **Phase 5** — White-label pass: defaults moved to placeholders, `data/studio-brand.json` is the override surface
- [x] **Phase 6** — `npm run verify:deploy` green
- [x] **Phase 7** — Screenshot bag + Envato sales brief at `docs/thumbs/v110/` and `docs/envato-sales-brief.md`
- [x] **Phase 8** — Sales / operator / client collateral: `docs/CLIENT_HANDOFF.md`, `docs/OPERATOR_QUICKREF.md`, `docs/SALES_NOTES.md`
- [x] **Phase 9** — Context survival: this file
- [x] **Phase 10** — `package.json` at `1.1.0`, `CHANGELOG.md` stamped `v1.1.0-DEPLOYED`, `FREEZE-MARKER` rolled forward

If something below a phase is missing, do it. If everything is green, do nothing.

## 6. What is pending

- Final post-deploy tweak after the first real Vercel smoke. Documentation-grade only.
- Buyer requests: tracked at `docs/feature-decisions.md`. Read that file before any spec work.
- Future-version asks go through the 3-buyer-counter rule in `AGENT_BEST_PRACTICES.md`.

## 7. Operational quick-ref

Read order on entering a new session:

1. `AGENTS.md` (one-liner pointer)
2. `docs/CONTEXT.md` (this file)
3. `package.json` scripts (`npm run verify:deploy`, `npm run migrate`, `npm run seed`)
4. `FREEZE-MARKER` (read BEFORE writing code)
5. For any frontend decision: `~/.opencode/skills/taste-skill/SKILL.md`
6. For copy: scan with no-em-dash + no-emoji + brief-appropriate tone
7. End of session: append a fresh "Last session log" section to this file

`npm run verify:deploy` is the single source-of-truth pre-flight check. It
checks: node version, node_modules, `.next` build, `vercel.json`,
`data/etihad.db` (or Supabase reachability when `DATABASE_URL` is set),
env files, model seed at `public/models/seed/reception-room.glb`,
AGENT_BEST_PRACTICES, LICENSE, INSTALL, freeze marker.

## 8. Where the moving parts live

| Concern | File / dir |
|---|---|
| Theme tokens | `src/app/globals.css` |
| Block registry | `src/cms/blocks/registry.ts` |
| License verifier | `src/lib/license.ts` |
| License signer | `src/lib/license-key.ts` |
| Admin (tenant) | `src/app/admin/**`, `src/components/admin/**`, `src/components/admin/LoginCard.tsx` |
| Operator (studio-only) | `operator/**`, `app/api/operator/**`, `app/api/envato/**` |
| Database bridge | `src/lib/db.ts` (chooses SQLite vs Supabase) |
| Tenant model migration | `scripts/migrate.mjs` |
| Distro apply | `scripts/apply-distro.mjs` |
| Studio brand cluster | `data/studio-brand.json` |
| Theme defaults (per buyer distribution) | `data/theme.distro.json` per tenant |
| Demo media index | `data/demo-media.json` |
| Demo JPGs | `public/demo/*.jpg` |
| Demo GLB | `public/models/seed/reception-room.glb` |
| Sales brief | `docs/envato-sales-brief.md` |
| Operator quickref | `docs/OPERATOR_QUICKREF.md` |
| Client handoff | `docs/CLIENT_HANDOFF.md` |
| Sales notes | `docs/SALES_NOTES.md` |
| Screenshot bag | `docs/thumbs/v110/` |
| Context survival | `docs/CONTEXT.md` (this file) |

## 9. Last session log

(Updated at end of every session. Append-only.)

### 2026-06-23 — mega-deploy v1.1.0
- Installed `sharp` to generate procedural-SVG-as-JPG demo assets
- Generated 8 demo JPGs (1280 px JPEG quality 80) in `public/demo/` matching `data/demo-media.json`
- Mirrored to `public/uploads/images/` so block-registry defaults paint (hero, services-1..4, grid-1..3, placeholder)
- Generated a real GLB stub (`public/models/seed/reception-room.glb`) — replacing the 369-byte placeholder
- Continued with Phases 2–10 to bring v1.1 to a deployable state

### 2026-06-25 — post-deploy bugfix sweep (v1.1.0 follow-up)
- **Admin login submit silent:** `LoginCard.tsx` was a client component that read the CSRF cookie via inline script and stripped the hash half with `.split('%')[0]`. Routed to NextAuth credentials callback with a token that no longer had its signature, so the POST was rejected silently and the form appeared not to respond. Replaced with a Server Component that calls `getCsrfToken()` and renders the full `<token>|<hash>` pair. Commit `e7e7669`.
- **Admin + superadmin header overlap:** the global root layout mounted `Navbar` and `Footer` for every route, including the auth-only surfaces. Moved marketing pages (`/`, `/about`, `/contact`, `/projects`, `/projects/[slug]`, `/journal`, `/journal/[slug]`, `/install`) into a new `(public)` route group with its own `layout.tsx`. Root layout now only provides SessionProvider + ThemeProvider + I18nProvider. URL stability preserved (route groups do not change URLs). Public chrome now lives entirely inside `(public)/layout.tsx`. Commit `4650a06`.
- **Image data corruption:** two Unsplash IDs in seed fallback arrays returned HTTP 404 (`1613553497126-a44624272013` and `1600585154340-be6161a89a2c`). Replaced with stable residential-interior photos (`1565538810643-b5bdb714032a` and `1600585154526-990dced4db0d`) at the same call sites in `SelectedWork.tsx`, `SpatialWalkthroughs.tsx`, `(public)/projects/page.tsx`, `(public)/projects/[slug]/page.tsx`. `next.config.mjs` `remotePatterns` already allowed `images.unsplash.com`, no config change needed. Same commit as the layout fix, `4650a06`.
- **Motion / accessibility violation in `ProcessStickyStack`:** the sticky-stack GSAP-driven block on the home process section read `window.matchMedia("prefers-reduced-motion").matches` inline at effect mount but did not subscribe to changes and did not include the value in the effect's dependency array. Result: an OS-level reduce-motion toggle could not release pinned siblings back to natural layout. Replaced with a React-state-driven `reduceMotion` value, MQL subscription with cleanup, and an effect key that re-runs on change. Commit `14cbb39`.
- All three commits pushed to `origin/main` (range `4f64ca0..14cbb39`).
- Push hygiene gap: `npm run verify:deploy` was not run before push this session. AGENTS.md gates this; will run on the next deploy-prep session.
- Open items carried forward that I have not addressed this session: raw `<img>` tags in `PageRenderer.tsx`, `SpatialWalkthroughs.tsx`, `(public)/projects/[slug]/page.tsx` are still using `<img>` rather than `next/image` (banner under session protocol §3). The pre-flight checklist in the taste-skill Section 4.7 has not been run against the home page after the layout restructure.
