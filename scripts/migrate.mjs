#!/usr/bin/env node
/**
 * Idempotent SQL migration, declarative per-table shape.
 *
 * Each table is created in isolation. A failure on one table does
 * not skip the next. Each column-add is also per-table / per-row
 * isolated.
 *
 * Run from repo root:
 *   node scripts/migrate.mjs
 *
 * Invoked automatically by `npm install` via the `postinstall` hook
 * declared in package.json. Re-runnable. Safe to run repeatedly.
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Defensive: if the file exists but the magic bytes aren't "SQLite format 3",
// treat it as corrupted and recreate. Cache artifacts from prior builds on
// shared Vercel images have hit this in practice.
if (fs.existsSync(DB_PATH)) {
  try {
    const fd = fs.openSync(DB_PATH, "r");
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    const magic = buf.slice(0, 15).toString("utf8");
    if (magic !== "SQLite format 3") {
      console.log("- corrupted file detected, removing");
      fs.unlinkSync(DB_PATH);
      for (const sfx of ["-journal", "-wal", "-shm"]) {
        const p = DB_PATH + sfx;
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch {}
        }
      }
    }
  } catch (e) {
    // best-effort
  }
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

function run(label, sql) {
  try {
    sqlite.exec(sql);
    console.log(`+ ${label}`);
    return true;
  } catch (e) {
    // CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN produce
    // "already exists" errors when the schema matches the desired state.
    // That's idempotency working correctly — log as a quiet "ok" instead
    // of a noisy failure.
    if (e && / already exists/i.test(e.message || "")) {
      console.log(`= ${label} (already in place)`);
      return true;
    }
    console.log(`- ${label}: ${e.message}`);
    return false;
  }
}

function columnsOf(table) {
  try {
    return sqlite
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((c) => c.name);
  } catch {
    return [];
  }
}

function ensureColumn(table, column, def) {
  const cols = columnsOf(table);
  if (cols.includes(column)) return;
  run(
    `column ${table}.${column}`,
    `ALTER TABLE ${table} ADD COLUMN ${column} ${def}`
  );
}

const TABLES = [
  {
    name: "projects",
    create: `CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT,
      description TEXT NOT NULL,
      before_image TEXT,
      after_image TEXT,
      model_3d TEXT,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: [
      ["location_city", "TEXT"],
      ["year", "TEXT"],
      ["description_json", "TEXT"],
      ["gallery_media_ids", "TEXT"],
      ["scope", "TEXT"],
      ["poster_media_id", "INTEGER"],
      ["order_index", "INTEGER DEFAULT 0"],
    ],
  },
  {
    name: "testimonials",
    create: `CREATE TABLE testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      photo TEXT,
      quote TEXT NOT NULL,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: [
      ["avatar_media_id", "INTEGER"],
      ["quote_json", "TEXT"],
      ["order_index", "INTEGER DEFAULT 0"],
    ],
  },
  {
    name: "team_members",
    create: `CREATE TABLE team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      bio TEXT,
      photo TEXT,
      order_index INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1
    )`,
    columns: [
      ["avatar_media_id", "INTEGER"],
      ["bio_json", "TEXT"],
    ],
  },
  {
    name: "journal_posts",
    create: `CREATE TABLE journal_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image TEXT,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: [
      ["excerpt", "TEXT"],
      ["content_json", "TEXT"],
      ["cover_media_id", "INTEGER"],
      ["gallery_media_ids", "TEXT"],
      ["category", "TEXT"],
      ["author_name", "TEXT"],
    ],
  },
  {
    name: "settings",
    create: `CREATE TABLE settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    )`,
    columns: [],
  },
  {
    name: "users",
    create: `CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin'
    )`,
    columns: [],
  },
  {
    name: "media",
    create: `CREATE TABLE media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      url TEXT NOT NULL,
      alt TEXT,
      width INTEGER,
      height INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: [],
  },
  {
    name: "pages",
    create: `CREATE TABLE pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      seo_title TEXT,
      seo_description TEXT,
      og_media_id INTEGER,
      is_front INTEGER DEFAULT 0,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: [],
  },
  {
    name: "page_blocks",
    create: `CREATE TABLE page_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0
    )`,
    columns: [],
  },
  {
    name: "menus",
    create: `CREATE TABLE menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT UNIQUE NOT NULL
    )`,
    columns: [],
  },
  {
    name: "menu_items",
    create: `CREATE TABLE menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER NOT NULL,
      parent_id INTEGER,
      label TEXT NOT NULL,
      href TEXT NOT NULL,
      target TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      is_button INTEGER DEFAULT 0
    )`,
    columns: [],
  },
  {
    name: "site_identity",
    create: `CREATE TABLE site_identity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_name TEXT NOT NULL DEFAULT 'Etihad Interiors',
      tagline TEXT,
      logo_media_id INTEGER,
      favicon_media_id INTEGER,
      accent_mode TEXT DEFAULT 'auto',
      footer_credit TEXT
    )`,
    columns: [],
  },
  {
    name: "translations",
    create: `CREATE TABLE translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locale TEXT NOT NULL,
      namespace TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      UNIQUE (locale, namespace, key)
    )`,
    columns: [],
  },
  {
    name: "revisions",
    create: `CREATE TABLE revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      payload TEXT NOT NULL,
      saved_by_id INTEGER,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: [],
  },
  {
    name: "audit_log",
    create: `CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      meta TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: [],
  },
  {
    name: "tenants",
    create: `CREATE TABLE tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      studio_name TEXT NOT NULL,
      owner_email TEXT,
      domain TEXT,
      tier TEXT NOT NULL DEFAULT 'personal',
      theme_distro TEXT,
      state TEXT NOT NULL DEFAULT 'pending',
      hmac_key TEXT,
      installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      revoked_at DATETIME
    )`,
    columns: [],
  },
  {
    name: "tenant_data",
    create: `CREATE TABLE tenant_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: [],
  },
];

console.log("Migration: declarative run");

let allOk = true;

console.log("--- Phase 1: CREATE TABLE per-table ---");
for (const t of TABLES) {
  const ok = run(`table ${t.name}`, t.create);
  if (!ok && t.name === "projects") {
    // projects is critical; if its CREATE TABLE failed for ANY reason
    // we want to be loud, but still continue.
    allOk = false;
  }
}

console.log("--- Phase 2: ALTER TABLE per-column ---");
for (const t of TABLES) {
  for (const [name, def] of t.columns) {
    ensureColumn(t.name, name, def);
  }
}

console.log("--- Phase 3: FTS5 admin_search ---");
run(
  "virtual table admin_search",
  `CREATE VIRTUAL TABLE IF NOT EXISTS admin_search USING fts5(
     entity, kind, title, body, slug,
     tokenize = 'porter unicode61'
   )`
);

console.log("--- Phase 4: seed identity + admin user + menus ---");

// Default site_identity row
const sid = sqlite.prepare("SELECT id FROM site_identity LIMIT 1").get();
if (!sid) {
  run(
    "site_identity seed",
    `INSERT INTO site_identity (brand_name, tagline, accent_mode, footer_credit)
     VALUES ('Your Studio', 'A studio of considered spaces. Set your tagline in /admin/settings.', 'auto', 'Powered by Interior Studio Theme')`
  );
}

// Default tenant - studio (Etihad demo)
const studioTenant = sqlite.prepare("SELECT id FROM tenants LIMIT 1").get();
if (!studioTenant) {
  run(
    "tenants seed (default studio)",
    `INSERT INTO tenants (slug, studio_name, owner_email, domain, tier, theme_distro, state, hmac_key)
     VALUES ('studio', 'Etihad Interiors', 'admin@etihadinteriors.com', 'ethinterior.vercel.app', 'business', '${JSON.stringify({
       brand_name: 'Etihad Interiors',
       palette: { ink: '#1a1814', accent: '#8a5d3b', paper: '#efe6d2' },
       accent_mode: 'auto',
       footer_credit: 'Powered by Etihad Interiors Theme v1.1.0',
       hero_text: 'Homes built around how you live',
       default_locales: ['en', 'hi', 'mr'],
     }).replaceAll("'", "''")}', 'active', 'etihad-interiors-license-fallback-2026')`
  );
}

// Default admin user - idempotent upsert keyed on ADMIN_EMAIL. The
// INSERT OR IGNORE form left a stale studio@etihadinteriors.com row
// when the bundled SQLite shipped with that row, so the seed step
// silently failed to add admin@etihadinteriors.com. Switched to an
// UPSERT pattern: if a row matching ADMIN_EMAIL exists, refresh the
// password hash; otherwise insert a new row with role='admin'.
function seedDefaultAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@etihadinteriors.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  try {
    sqlite
      .prepare(
        `INSERT INTO users (email, password_hash, role)
         VALUES (?, ?, 'admin')
         ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = 'admin'`
      )
      .run(adminEmail, passwordHash);
    console.log(`+ users seed (admin) -> ${adminEmail}`);
  } catch (e) {
    console.log(`- users seed failed: ${e.message}`);
  }
}

function seedDefaultSettings() {
  const defaults = [
    ["contact_email", "studio@example.com"],
    ["contact_phone", ""],
    ["studio_address", ""],
    ["calendly_url", ""],
    ["site_seo_title", "Studio — Residential Interior Design"],
    ["site_seo_description", "A residential studio shaping considered spaces."],
    ["instagram_url", ""],
    ["year_established", ""],
    ["residences_delivered", ""],
  ];
  for (const [k, v] of defaults) {
    try {
      sqlite
        .prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`)
        .run(k, v);
    } catch (e) {
      console.log(`- settings ${k}: ${e.message}`);
    }
  }
  console.log("+ settings seeds (defaults)");
}

function seedMenus() {
  let primary = sqlite
    .prepare("SELECT id FROM menus WHERE location = 'primary'")
    .get();
  if (!primary) {
    const r = sqlite
      .prepare(`INSERT INTO menus (location) VALUES ('primary')`)
      .run();
    primary = { id: Number(r.lastInsertRowid) };
    console.log("+ menus primary");
  }
  const primaryCount = sqlite
    .prepare("SELECT COUNT(*) AS c FROM menu_items WHERE menu_id = ?")
    .get(primary.id);
  if (primaryCount.c === 0) {
    const insert = sqlite.prepare(
      `INSERT INTO menu_items (menu_id, label, href, target, order_index, is_button)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    [
      ["Selected work", "/projects", null, 0, 0],
      ["Studio", "/about", null, 1, 0],
      ["Journal", "/journal", null, 2, 0],
      ["Contact", "/contact", null, 3, 0],
    ].forEach(([label, href, target, order, button]) =>
      insert.run(primary.id, label, href, target, order, button)
    );
    console.log("+ menu_items primary");
  }
}

try {
  seedDefaultAdmin();
  seedDefaultSettings();
  seedMenus();
} catch (e) {
  console.log(`- seed step: ${e.message}`);
}

sqlite.close();
console.log("Migration done.");

if (!allOk) {
  console.log("");
  console.log("WARNING: One or more tables did not create cleanly.");
  console.log("Run again or check the script logs above for a real cause.");
}
