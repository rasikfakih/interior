#!/usr/bin/env node
/**
 * scripts/seed-content-supabase.mjs
 *
 * Phase 2 content seed for the v1.1.2 Supabase instance. Inserts a
 * small set of projects, journal_posts, testimonials, team_members,
 * media rows so the public pages have visible content. Idempotent.
 *
 *   npm run seed:content
 *
 * Reads DATABASE_URL from .env.local. Skips tables that already have
 * rows to avoid clobbering operator content.
 */
import fs from 'fs';
import path from 'path';
import url from 'url';
import pg from 'pg';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadEnvLocal() {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
  }
}
loadEnvLocal();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting.');
  process.exit(1);
}

const PHOTO_BASE = 'https://images.unsplash.com/photo-1600585154526-990dced4db0d';

function checkRowCount(pool, table) {
  return pool.query(`SELECT COUNT(*)::int as n FROM ${table}`).then((r) => r.rows[0].n);
}

const PROJECTS = [
  {
    slug: 'casa-mira',
    title: 'Casa Mira',
    category: 'Apartment',
    location: 'Bandra, Mumbai',
    year: '2024',
    scope: '1,820 sq.ft · 3-bed apartment',
    before: `${PHOTO_BASE}?q=80&w=1600&auto=format&fit=crop`,
    after: `${PHOTO_BASE}?q=80&w=1600&auto=format&fit=crop`,
  },
  {
    slug: 'nalanda-house',
    title: 'Nalanda House',
    category: 'Villa',
    location: 'Kalyan, Maharashtra',
    year: '2024',
    scope: '4,200 sq.ft · Independent villa',
    before: `${PHOTO_BASE}?q=80&w=1600&auto=format&fit=crop`,
    after: `${PHOTO_BASE}?q=80&w=1600&auto=format&fit=crop`,
  },
  {
    slug: 'salt-flats',
    title: 'Salt Flats',
    category: 'Coastal',
    location: 'Alibaug, Maharashtra',
    year: '2023',
    scope: '3,400 sq.ft · Coastal home',
    before: `${PHOTO_BASE}?q=80&w=1600&auto=format&fit=crop`,
    after: `${PHOTO_BASE}?q=80&w=1600&auto=format&fit=crop`,
  },
];

const JOURNAL = [
  {
    slug: 'why-the-kitchen-table',
    title: 'Why the kitchen table',
    excerpt: 'Every project we have built started at a kitchen table',
    content: 'Every project we have built started at a kitchen table. The mood board came later. Plans came later. But the conversation between two families, in a warm room, was where the work began.',
    cover: `${PHOTO_BASE}?q=80&w=1600&auto=format&fit=crop`,
  },
  {
    slug: 'material-honesty',
    title: 'Material honesty',
    excerpt: 'Stone, wood, metal, textile',
    content: 'Stone, wood, metal, textile. We source from quarries, mills and workshops. The list of vendors we have grown to trust over seven years fills three pages.',
    cover: `${PHOTO_BASE}?q=80&w=1600&auto=format&fit=crop`,
  },
  {
    slug: 'spatial-design-vs-interior',
    title: 'Spatial design vs interior',
    excerpt: 'A note on what we mean when we say spatial design',
    content: 'A spatial design considers how you move through a home before considering what it looks like. Interior is decoration. Spatial design is architecture.',
    cover: `${PHOTO_BASE}?q=80&w=1600&auto=format&fit=crop`,
  },
];

const TESTIMONIALS = [
  {
    name: 'A. Mehta',
    role: 'Casa Mira, Bandra',
    quote: 'They listened to the house before they drew a single line.',
  },
  {
    name: 'R. Sahasrabudhe',
    role: 'Nalanda House, Kalyan',
    quote: 'A studio that draws the line between over-design and under-design with care.',
  },
  {
    name: 'S. Iyer',
    role: 'Salt Flats, Alibaug',
    quote: 'Every meeting after the first one felt like continuing the first.',
  },
];

const TEAM = [
  {
    name: 'Asha Luthra',
    role: 'Principal, Spatial design',
    bio: 'Twelve years on residential studios in Mumbai and Bengaluru. RIBA Part II.',
  },
  {
    name: 'Karthik Rao',
    role: 'Senior associate, Materials',
    bio: 'Trained as a furniture maker. Sources stone, wood, and textile from quarries, mills and small workshops.',
  },
  {
    name: 'Neha Pillai',
    role: 'Associate, On-site direction',
    bio: 'Site visits every week of construction. Reads plans the way a film editor reads a script.',
  },
];

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const counts = {
    projects: await checkRowCount(pool, 'projects'),
    testimonials: await checkRowCount(pool, 'testimonials'),
    journal_posts: await checkRowCount(pool, 'journal_posts'),
    team_members: await checkRowCount(pool, 'team_members'),
  };

  if (counts.projects === 0) {
    for (const p of PROJECTS) {
      await pool.query(
        `INSERT INTO projects (slug, title, category, location, year, scope, description, before_image, after_image, is_published, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 0)
         ON CONFLICT (slug) DO NOTHING`,
        [p.slug, p.title, p.category, p.location, p.year, p.scope, `${p.title}, ${p.location}, ${p.year}. Scope ${p.scope}.`, p.before, p.after],
      );
    }
    console.log('projects seeded');
  } else {
    console.log('projects already populated, skipping');
  }

  if (counts.journal_posts === 0) {
    for (const j of JOURNAL) {
      await pool.query(
        `INSERT INTO journal_posts (slug, title, excerpt, content, cover_image, is_published)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (slug) DO NOTHING`,
        [j.slug, j.title, j.excerpt, j.content, j.cover],
      );
    }
    console.log('journal_posts seeded');
  } else {
    console.log('journal_posts already populated, skipping');
  }

  if (counts.testimonials === 0) {
    let order = 0;
    for (const t of TESTIMONIALS) {
      await pool.query(
        `INSERT INTO testimonials (name, role, quote, is_published, order_index)
         VALUES ($1, $2, $3, true, $4)
         ON CONFLICT DO NOTHING`,
        [t.name, t.role, t.quote, order++],
      );
    }
    console.log('testimonials seeded');
  } else {
    console.log('testimonials already populated, skipping');
  }

  if (counts.team_members === 0) {
    let order = 0;
    for (const t of TEAM) {
      await pool.query(
        `INSERT INTO team_members (name, role, bio, "order", is_published)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT DO NOTHING`,
        [t.name, t.role, t.bio, order++],
      );
    }
    console.log('team_members seeded');
  } else {
    console.log('team_members already populated, skipping');
  }

  await pool.end();
  console.log('-- done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
