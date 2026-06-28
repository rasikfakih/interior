#!/usr/bin/env node
/**
 * scripts/seed-content.mjs
 *
 * v1.1.2 Phase 5 canonical seed. Inserts a small set of projects,
 * journal_posts, testimonials, team_members, media rows so the
 * public pages have visible content. Idempotent.
 *
 *   npm run seed:content
 *
 * Branches at runtime:
 *   - DATABASE_URL set  ->  Postgres (project-supabase runtime)
 *   - DATABASE_URL unset ->  SQLite (data/etihad.db local or hot-copy)
 *
 * Skips any table whose row count is non-zero unless --force is passed.
 */
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");

function loadEnvLocal() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
  }
}
loadEnvLocal();

const PHOTO_BEFORE_BASE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9";
const PHOTO_AFTER_BASE =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d";
const PHOTO_DIFFERENT_BASE =
  "https://images.unsplash.com/photo-1565538810643-b5bdb714032a";

function img(base, w = 1600) {
  return `${base}?q=80&w=${w}&auto=format&fit=crop`;
}

const PROJECTS = [
  {
    slug: "casa-mira",
    title: "Casa Mira",
    category: "Apartment",
    location: "Bandra, Mumbai",
    location_city: "Mumbai",
    year: "2024",
    scope: "1,820 sq.ft · 3-bed apartment",
    description:
      "Casa Mira is a 1,820 sq.ft Bandra apartment, drawn across four months and built across seven. The brief asked for calm, and ended up being a study in restraint.",
    before: img(PHOTO_BEFORE_BASE),
    after: img(PHOTO_AFTER_BASE),
  },
  {
    slug: "nalanda-house",
    title: "Nalanda House",
    category: "Villa",
    location: "Kalyan, Maharashtra",
    location_city: "Kalyan",
    year: "2024",
    scope: "4,200 sq.ft · Independent villa",
    description:
      "A 4,200 sq.ft villa for a family of five. Drawings reflect how each room opens into the next. Stone and wood specified together, never apart.",
    before: img(PHOTO_AFTER_BASE),
    after: img(PHOTO_DIFFERENT_BASE),
  },
  {
    slug: "salt-flats",
    title: "Salt Flats",
    category: "Coastal",
    location: "Alibaug, Maharashtra",
    location_city: "Alibaug",
    year: "2023",
    scope: "3,400 sq.ft · Coastal home",
    description:
      "A weekend house facing west. Salinity, monsoon, fungi finishes the home's first year softer than the renders.",
    before: img(PHOTO_DIFFERENT_BASE),
    after: img(PHOTO_BEFORE_BASE),
  },
];

const JOURNAL = [
  {
    slug: "why-the-kitchen-table",
    title: "Why the kitchen table",
    excerpt: "Every project we have built started at a kitchen table.",
    content:
      "Every project we have built started at a kitchen table. The mood board came later. Plans came later. But the conversation between two families, in a warm room, was where the work began.",
    cover: img(PHOTO_BEFORE_BASE),
  },
  {
    slug: "material-honesty",
    title: "Material honesty",
    excerpt: "Stone, wood, metal, textile.",
    content:
      "Stone, wood, metal, textile. We source from quarries, mills and workshops. The list of vendors we have grown to trust over seven years fills three pages.",
    cover: img(PHOTO_DIFFERENT_BASE),
  },
  {
    slug: "spatial-design-vs-interior",
    title: "Spatial design vs interior",
    excerpt: "A note on what we mean when we say spatial design.",
    content:
      "A spatial design considers how you move through a home before considering what it looks like. Interior is decoration. Spatial design is architecture.",
    cover: img(PHOTO_AFTER_BASE),
  },
];

const TESTIMONIALS = [
  {
    name: "A. Mehta",
    role: "Casa Mira, Bandra",
    quote:
      "They listened to the house before they drew a single line.",
  },
  {
    name: "R. Sahasrabudhe",
    role: "Nalanda House, Kalyan",
    quote:
      "A studio that draws the line between over-design and under-design with care.",
  },
  {
    name: "S. Iyer",
    role: "Salt Flats, Alibaug",
    quote:
      "Every meeting after the first one felt like continuing the first.",
  },
];

const TEAM = [
  {
    name: "Asha Luthra",
    role: "Principal, Spatial design",
    bio: "Twelve years on residential studios in Mumbai and Bengaluru. RIBA Part II.",
    photo: img(PHOTO_BEFORE_BASE, 600),
  },
  {
    name: "Karthik Rao",
    role: "Senior associate, Materials",
    bio: "Trained as a furniture maker. Sources stone, wood, and textile from quarries, mills and small workshops.",
    photo: img(PHOTO_DIFFERENT_BASE, 600),
  },
  {
    name: "Neha Pillai",
    role: "Associate, On-site direction",
    bio: "Site visits every week of construction. Reads plans the way a film editor reads a script.",
    photo: img(PHOTO_AFTER_BASE, 600),
  },
];

const MEDIA = [
  {
    kind: "image",
    mime: "image/jpeg",
    size: 198400,
    original_name: "casa-mira-cover.jpg",
    url: img(PHOTO_BEFORE_BASE),
    alt: "Casa Mira, before renovation. Wide loft, west light.",
  },
  {
    kind: "image",
    mime: "image/jpeg",
    size: 204800,
    original_name: "nalanda-house-cover.jpg",
    url: img(PHOTO_AFTER_BASE),
    alt: "Nalanda House, after completion. Stone and wood interior.",
  },
  {
    kind: "image",
    mime: "image/jpeg",
    size: 212000,
    original_name: "salt-flats-cover.jpg",
    url: img(PHOTO_DIFFERENT_BASE),
    alt: "Salt Flats, west-facing coastal interior.",
  },
];

async function seedPostgres() {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const counts = {
    projects: (await pool.query(`SELECT COUNT(*)::int AS n FROM projects`)).rows[0].n,
    testimonials: (await pool.query(`SELECT COUNT(*)::int AS n FROM testimonials`)).rows[0].n,
    journal_posts: (await pool.query(`SELECT COUNT(*)::int AS n FROM journal_posts`)).rows[0].n,
    team_members: (await pool.query(`SELECT COUNT(*)::int AS n FROM team_members`)).rows[0].n,
    media: (await pool.query(`SELECT COUNT(*)::int AS n FROM media`)).rows[0].n,
  };

  if (FORCE) {
    await pool.query(`DELETE FROM projects`);
    counts.projects = 0;
  }
  if (FORCE || counts.projects === 0) {
    let order = 0;
    for (const p of PROJECTS) {
      await pool.query(
        `INSERT INTO projects
           (slug, title, category, location, location_city, year, scope,
            description, before_image, after_image, model_3d,
            gallery_media_ids, is_published, order_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,true,$13)
         ON CONFLICT (slug) DO NOTHING`,
        [
          p.slug,
          p.title,
          p.category,
          p.location,
          p.location_city,
          p.year,
          p.scope,
          p.description,
          p.before,
          p.after,
          null,
          JSON.stringify([]),
          order++,
        ]
      );
    }
    console.log(
      FORCE ? "projects forced-write" : "projects seeded"
    );
  }
  if (FORCE) {
    await pool.query(`DELETE FROM journal_posts`);
    counts.journal_posts = 0;
  }
  if (FORCE || counts.journal_posts === 0) {
    let order = 0;
    for (const j of JOURNAL) {
      await pool.query(
        `INSERT INTO journal_posts
           (slug, title, excerpt, content, content_json, cover_image,
            cover_media_id, gallery_media_ids, is_published, created_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,true, NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [
          j.slug,
          j.title,
          j.excerpt,
          j.content,
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: j.content }],
              },
            ],
          }),
          j.cover,
          null,
          JSON.stringify([]),
          order++,
        ]
      );
    }
    console.log(
      FORCE ? "journal_posts forced-write" : "journal_posts seeded"
    );
  }
  if (FORCE) {
    await pool.query(`DELETE FROM testimonials`);
    counts.testimonials = 0;
  }
  if (FORCE || counts.testimonials === 0) {
    let order = 0;
    for (const t of TESTIMONIALS) {
      await pool.query(
        `INSERT INTO testimonials (name, role, quote, is_published, order_index)
         VALUES ($1,$2,$3,true,$4)
         ON CONFLICT DO NOTHING`,
        [t.name, t.role, t.quote, order++]
      );
    }
    console.log(
      FORCE ? "testimonials forced-write" : "testimonials seeded"
    );
  }
  if (FORCE) {
    await pool.query(`DELETE FROM team_members`);
    counts.team_members = 0;
  }
  if (FORCE || counts.team_members === 0) {
    let order = 0;
    for (const t of TEAM) {
      await pool.query(
        `INSERT INTO team_members (name, role, bio, photo, "order", is_published)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT DO NOTHING`,
        [t.name, t.role, t.bio, t.photo, order++]
      );
    }
    console.log(
      FORCE ? "team_members forced-write" : "team_members seeded"
    );
  }
  if (FORCE || counts.media === 0) {
    for (const m of MEDIA) {
      await pool.query(
        `INSERT INTO media (kind, mime, size, original_name, storage_path, url, alt, width, height)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          m.kind,
          m.mime,
          m.size,
          m.original_name,
          `/uploads/media/${m.original_name}`,
          m.url,
          m.alt,
          null,
          null,
        ]
      );
    }
    console.log(FORCE ? "media forced-write" : "media seeded");
  }
  await pool.end();
}

async function seedSqlite() {
  const Database = (await import("better-sqlite3")).default;
  const dbPath =
    process.env.SQLITE_PATH || path.join(repoRoot, "data", "etihad.db");
  if (!fs.existsSync(dbPath)) {
    console.error(
      `SQLite database not found at ${dbPath}. Run npm run migrate first.`
    );
    process.exit(2);
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  const prep = (sql) => db.prepare(sql);
  const rows = (sql) => prep(sql).all();
  const firstN = (sql) => {
    const r = prep(sql).get();
    return r ? Number(r.n) : 0;
  };

  const counts = {
    projects: firstN(`SELECT COUNT(*) AS n FROM projects`),
    testimonials: firstN(`SELECT COUNT(*) AS n FROM testimonials`),
    journal_posts: firstN(`SELECT COUNT(*) AS n FROM journal_posts`),
    team_members: firstN(`SELECT COUNT(*) AS n FROM team_members`),
    media: firstN(`SELECT COUNT(*) AS n FROM media`),
  };

  const insertProject = prep(
    `INSERT OR IGNORE INTO projects
       (slug, title, category, location, location_city, year, scope,
        description, before_image, after_image, model_3d,
        gallery_media_ids, is_published, order_index)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)`
  );
  const insertJournal = prep(
    `INSERT OR IGNORE INTO journal_posts
       (slug, title, excerpt, content, content_json, cover_image, is_published)
     VALUES (?,?,?,?,?,?,1)`
  );
  const insertTestimonial = prep(
    `INSERT INTO testimonials (name, role, quote, is_published, order_index)
     VALUES (?,?,?,1,?)`
  );
  const insertTeam = prep(
    `INSERT INTO team_members (name, role, bio, photo, order_index, is_published)
     VALUES (?,?,?,?,?,1)`
  );
  const insertMedia = prep(
    `INSERT INTO media (kind, mime, size, original_name, storage_path, url, alt)
     VALUES (?,?,?,?,?,?,?)`
  );

  if (FORCE) {
    for (const slug of PROJECTS.map((p) => p.slug)) {
      try {
        prep(`DELETE FROM page_blocks WHERE page_id IS NULL`).run();
      } catch {}
    }
    prep(`DELETE FROM projects`).run();
    counts.projects = 0;
  }
  if (FORCE || counts.projects === 0) {
    let order = 0;
    const txn = db.transaction(() => {
      for (const p of PROJECTS) {
        insertProject.run(
          p.slug,
          p.title,
          p.category,
          p.location,
          p.location_city,
          p.year,
          p.scope,
          p.description,
          p.before,
          p.after,
          null,
          JSON.stringify([]),
          order++
        );
      }
    });
    txn();
    console.log(
      FORCE ? "projects forced-write" : "projects seeded"
    );
  }
  if (FORCE) {
    for (const slug of JOURNAL.map((j) => j.slug)) {
      try {
        prep(`DELETE FROM journal_posts`).run();
      } catch {}
    }
    counts.journal_posts = 0;
  }
  if (FORCE || counts.journal_posts === 0) {
    let order = 0;
    const txn = db.transaction(() => {
      for (const j of JOURNAL) {
        insertJournal.run(
          j.slug,
          j.title,
          j.excerpt,
          j.content,
          JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: j.content }],
              },
            ],
          }),
          j.cover
        );
      }
    });
    txn();
    console.log(
      FORCE ? "journal_posts forced-write" : "journal_posts seeded"
    );
  }
  if (FORCE) {
    prep(`DELETE FROM testimonials`).run();
    counts.testimonials = 0;
  }
  if (FORCE || counts.testimonials === 0) {
    let order = 0;
    const txn = db.transaction(() => {
      for (const t of TESTIMONIALS) {
        const exists = prep(
          `SELECT id FROM testimonials WHERE name=? AND role=?`
        ).get(t.name, t.role);
        if (!exists) {
          insertTestimonial.run(t.name, t.role, t.quote, order++);
        }
      }
    });
    txn();
    console.log(
      FORCE ? "testimonials forced-write" : "testimonials seeded"
    );
  }
  if (FORCE) {
    prep(`DELETE FROM team_members`).run();
    counts.team_members = 0;
  }
  if (FORCE || counts.team_members === 0) {
    let order = 0;
    const txn = db.transaction(() => {
      for (const t of TEAM) {
        const exists = prep(
          `SELECT id FROM team_members WHERE name=? AND role=?`
        ).get(t.name, t.role);
        if (!exists) {
          insertTeam.run(t.name, t.role, t.bio, t.photo, order++);
        }
      }
    });
    txn();
    console.log(
      FORCE ? "team_members forced-write" : "team_members seeded"
    );
  }
  if (FORCE || counts.media === 0) {
    const txn = db.transaction(() => {
      for (const m of MEDIA) {
        insertMedia.run(
          m.kind,
          m.mime,
          m.size,
          m.original_name,
          `/uploads/media/${m.original_name}`,
          m.url,
          m.alt
        );
      }
    });
    txn();
    console.log(FORCE ? "media forced-write" : "media seeded");
  }

  console.log(
    "Note: SQLite hot-copy is bundled in the deploy. The rows above " +
      "land in data/etihad.db and ship with the Vercel container."
  );
  db.close();
}

async function main() {
  if (process.env.DATABASE_URL) {
    console.log("seed:content -> Postgres");
    await seedPostgres();
  } else {
    console.log("seed:content -> SQLite (data/etihad.db)");
    await seedSqlite();
  }
  console.log("-- done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
