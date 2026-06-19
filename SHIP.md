# ✋ Ship to Vercel

These are the *exact* steps to put Studio OS at **studioos.studio** — the demo of the Etihad Interiors theme. Do not deviate unless reading `OPERATOR.md` first.

## 0. One-minute pre-flight

```
npm run verify:deploy
```

Should print `[OK]` ten times followed by `Ready for Vercel deploy.`. If anything prints `[FAIL]`, fix that line first. **Do not skip this step.**

## 1. Vercel — import the repo

| Step | Where |
| --- | --- |
| Sign in | vercel.com |
| **Add New…** → **Project** | dashboard |
| Import | this git repo |
| Framework | Next.js (auto-detected) |
| Root Directory | (empty — repo root) |
| Override | **no** |

## 2. Environment Variables — Production scope only

Set each via **Project → Settings → Environment Variables**, marked **Production**.

| Key | Value |
| --- | --- |
| `NEXTAUTH_URL` | `https://studioos.studio` |
| `NEXTAUTH_SECRET` | run `openssl rand -base64 32` ↑ paste output |
| `NEXT_PUBLIC_SITE_URL` | `https://studioos.studio` |
| `ADMIN_EMAIL` | (your studio email) |
| `ADMIN_PASSWORD` | (16+ char generated password) |
| `LICENSE_HMAC_KEY` | (any random 32-byte hex string) |

Leave these **blank** for v1.0 ship:
- `LICENSE_SERVER_URL`
- `LICENSE_PUBLIC_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_GA4_ID`

## 3. Domain attach

| Where | Action | Value |
| --- | --- | --- |
| Vercel — Settings → Domains | **Add** | `studioos.studio` |
| DNS registrar | **CNAME** `studioos.studio` → | `cname.vercel-dns.com` |

DNS propagates in 5-10 minutes.

## 4. Deploy

Click **Deploy**. Wait ~90s. Vercel prints the URL when done.

## 5. First-visit smoke test (do all four)

Open the page in an **incognito window**.

- [ ] Visit `https://studioos.studio/` — Studio home renders from `pages_blocks`.
- [ ] Visit `https://studioos.studio/install` — license form paints.
- [ ] Enter a purchase code + domain + tier → click Install. Bounce to `/admin`.
- [ ] Sign in with the seeded admin email/password. Page builder tab loads.

## 6. Things that can go wrong

| Symptom | What it means | Fix |
| --- | --- | --- |
| Deploy fails at `next build` | repo has type errors or missing dep | re-run locally: `npm run build` |
| `/install` shows but form 500s | env `NEXTAUTH_SECRET` missing | go back to step 2 |
| `/` renders empty page | SQLite wasn't committed | rebuild with `node scripts/seed-pages.mjs && npm run build` step in prebuild hook |
| `/admin` returns 401 | license missing | finish step 5's install step |

## 7. After deploy

- Open `CHANGELOG.md` and edit this line under `v1.0.0`:

  ```
  ### Deploy state
  - Status: DEPLOYED at <https://studioos.studio> on YYYY-MM-DD HH:MM UTC.
  ```

- Capture first-visit screenshots into `docs/thumbs/v100/` (8 thumbs).

- Hand off the live URL in your inbox.

## 8. After 4 weeks (acceptance window end)

Open `docs/feature-decisions.md`, sort YES by counter, pick the top
5-7 entries that have > 3 votes. Plan v1.1 from that set. Schedule
the freeze review meeting for the 4-week-mark. If no YES has reached
3 votes, ship no changes — the floor held.

---

When the deploy lands and your first-visit smoke passes, reply with
the URL and the timestamp; I'll mark v1.0.0-DEPLOYED in the changelog.
