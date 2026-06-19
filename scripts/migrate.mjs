#!/usr/bin/env node
/**
 * Idempotent schema migration.
 * Run once: `node scripts/migrate.mjs`
 * Adds columns + tables from the current schema without dropping data.
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

function tableExists(name) {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
  return Boolean(row);
}

function columnsOf(table) {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

function ensureColumn(table, column, def) {
  if (!columnsOf(table).includes(column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    console.log(`+ ${table}.${column}`);
  }
}

function ensureTable(name, ddl) {
  if (!tableExists(name)) {
    sqlite.exec(ddl);
    console.log(`+ table ${name}`);
  }
}

const tableDefs = {
  media: `CREATE TABLE media (
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
  );`,
  pages: `CREATE TABLE pages (
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
  );`,
  page_blocks: `CREATE TABLE page_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
  );`,
  menus: `CREATE TABLE menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT UNIQUE NOT NULL
  );`,
  menu_items: `CREATE TABLE menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id INTEGER NOT NULL,
    parent_id INTEGER,
    label TEXT NOT NULL,
    href TEXT NOT NULL,
    target TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_button INTEGER DEFAULT 0
  );`,
  site_identity: `CREATE TABLE site_identity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name TEXT NOT NULL DEFAULT 'Etihad Interiors',
    tagline TEXT,
    logo_media_id INTEGER,
    favicon_media_id INTEGER,
    accent_mode TEXT DEFAULT 'auto',
    footer_credit TEXT
  );`,
  translations: `CREATE TABLE translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    locale TEXT NOT NULL,
    namespace TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE (locale, namespace, key)
  );`,
  revisions: `CREATE TABLE revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    payload TEXT NOT NULL,
    saved_by_id INTEGER,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,
  audit_log: `CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    meta TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,
};

Object.entries(tableDefs).forEach(([name, ddl]) => ensureTable(name, ddl));

const adds = {
  projects: [
    ["location_city", "TEXT"],
    ["year", "TEXT"],
    ["description_json", "TEXT"],
    ["gallery_media_ids", "TEXT"],
    ["scope", "TEXT"],
    ["poster_media_id", "INTEGER"],
    ["order_index", "INTEGER DEFAULT 0"],
  ],
  testimonials: [
    ["avatar_media_id", "INTEGER"],
    ["quote_json", "TEXT"],
    ["order_index", "INTEGER DEFAULT 0"],
  ],
  team_members: [
    ["avatar_media_id", "INTEGER"],
    ["bio_json", "TEXT"],
  ],
  journal_posts: [
    ["excerpt", "TEXT"],
    ["content_json", "TEXT"],
    ["cover_media_id", "INTEGER"],
    ["gallery_media_ids", "TEXT"],
    ["category", "TEXT"],
    ["author_name", "TEXT"],
  ],
};

Object.entries(adds).forEach(([table, defs]) => {
  defs.forEach(([col, def]) => ensureColumn(table, col, def));
});

sqlite.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS admin_search USING fts5(
    entity, kind, title, body, slug,
    tokenize = 'porter unicode61'
  );
`);

const identityRow = sqlite.prepare("SELECT id FROM site_identity LIMIT 1").get();
if (!identityRow) {
  sqlite.exec(`
    INSERT INTO site_identity (brand_name, tagline, accent_mode, footer_credit)
    VALUES ('Etihad Interiors', 'A residential interior studio based in Kalyan, Maharashtra.', 'auto', 'Powered by Etihad Interiors Theme v1.0.0');
  `);
  console.log("+ seeded site_identity");
}

const primaryMenu = sqlite
  .prepare("SELECT id FROM menus WHERE location = 'primary'")
  .get();
let primaryId = primaryMenu?.id;
if (!primaryId) {
  const r = sqlite.prepare("INSERT INTO menus (location) VALUES ('primary')").run();
  primaryId = Number(r.lastInsertRowid);
  console.log("+ created primary menu");
}
const primaryCount = sqlite
  .prepare("SELECT COUNT(*) AS c FROM menu_items WHERE menu_id = ?")
  .get(primaryId);
if (primaryCount.c === 0) {
  const insert = sqlite.prepare(
    "INSERT INTO menu_items (menu_id, label, href, target, order_index, is_button) VALUES (?, ?, ?, ?, ?, ?)"
  );
  [
    ["Selected work", "/projects", null, 0, 0],
    ["Studio", "/about", null, 1, 0],
    ["Journal", "/journal", null, 2, 0],
    ["Contact", "/contact", null, 3, 0],
  ].forEach(([label, href, target, order, button]) =>
    insert.run(primaryId, label, href, target, order, button)
  );
  console.log("+ seeded primary menu items");
}

const footerMenu = sqlite
  .prepare("SELECT id FROM menus WHERE location = 'footer'")
  .get();
let footerId = footerMenu?.id;
if (!footerId) {
  const r = sqlite.prepare("INSERT INTO menus (location) VALUES ('footer')").run();
  footerId = Number(r.lastInsertRowid);
  console.log("+ created footer menu");
}

console.log("Migration complete.");
sqlite.close();
