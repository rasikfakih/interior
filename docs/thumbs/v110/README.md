# docs/thumbs/v110/ - sales screenshot manifest

This directory holds 8 PNGs used in the Envato sales brief
(`docs/envato-sales-brief.md`). Each PNG is a 1440x980 desktop viewport
screenshot of a real route in the running build.

Generation: use `npx playwright` against the running dev server
(`npm run dev`) or against the production URL after first deploy.

| File | Route | What to capture |
| --- | --- | --- |
| `home.png` | `/` | First paint of the seeded studio home. Hero visible without scroll. |
| `projects.png` | `/projects` | Selected work index. Three cards visible. |
| `project-detail.png` | `/projects/casa-mira` | Single project page. Hero + gallery + 3D placeholder. |
| `journal-detail.png` | `/journal/stone-quarries` | Journal entry. Rich text body + cover image. |
| `contact.png` | `/contact` | Contact form rendered. |
| `admin-pages.png` | `/admin/pages` | Drag-reorder block builder. Logged in as admin. |
| `install.png` | `/install` | License stamping form (unlicensed state). |
| `superadmin.png` | `/superadmin/tenants` | Studio tenant list, one entry, distro column visible. |

## Quick generation recipe (Playwright)

```js
import { chromium } from "playwright";
import path from "path";

const items = [
  ["home.png", "/"],
  ["projects.png", "/projects"],
  ["project-detail.png", "/projects/casa-mira"],
  ["journal-detail.png", "/journal/stone-quarries"],
  ["contact.png", "/contact"],
  ["admin-pages.png", "/admin/pages"],
  ["install.png", "/install"],
  ["superadmin.png", "/superadmin/tenants"],
];

const out = path.resolve("docs/thumbs/v110");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 } });
const page = await ctx.newPage();
for (const [file, route] of items) {
  await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(out, file), fullPage: false });
}
await browser.close();
```

For `admin-pages.png` and `superadmin.png`, login first via the
`/superadmin` credentials from `.env.local` before navigating to those routes.
