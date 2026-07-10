import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

function ensureColumn(table: string, column: string, def: string) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as any[];
  if (!cols.find((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

function ensureTable(name: string, ddl: string) {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
  if (!row) sqlite.exec(ddl);
}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS projects (
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
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    photo TEXT,
    quote TEXT NOT NULL,
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    bio TEXT,
    photo TEXT,
    order_index INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS journal_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT,
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin'
  );
`);

ensureTable(
  "media",
  `
  CREATE TABLE media (
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
  );
`,
);

ensureTable(
  "pages",
  `
  CREATE TABLE pages (
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
  );
`,
);

ensureTable(
  "page_blocks",
  `
  CREATE TABLE page_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
  );
`,
);

ensureTable(
  "menus",
  `
  CREATE TABLE menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT UNIQUE NOT NULL
  );
`,
);

ensureTable(
  "menu_items",
  `
  CREATE TABLE menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id INTEGER NOT NULL,
    parent_id INTEGER,
    label TEXT NOT NULL,
    href TEXT NOT NULL,
    target TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_button INTEGER DEFAULT 0
  );
`,
);

ensureTable(
  "site_identity",
  `
  CREATE TABLE site_identity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name TEXT NOT NULL DEFAULT 'Etihad Interiors',
    tagline TEXT,
    logo_media_id INTEGER,
    favicon_media_id INTEGER,
    logo_url TEXT,
    favicon_url TEXT,
    accent_mode TEXT DEFAULT 'auto',
    footer_credit TEXT
  );
`,
);

ensureTable(
  "translations",
  `
  CREATE TABLE translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    locale TEXT NOT NULL,
    namespace TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE (locale, namespace, key)
  );
`,
);

ensureTable(
  "revisions",
  `
  CREATE TABLE revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    payload TEXT NOT NULL,
    saved_by_id INTEGER,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`,
);

ensureTable(
  "audit_log",
  `
  CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    meta TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`,
);

ensureColumn("projects", "location_city", "TEXT");
ensureColumn("projects", "year", "TEXT");
ensureColumn("projects", "description_json", "TEXT");
ensureColumn("projects", "gallery_media_ids", "TEXT");
ensureColumn("projects", "scope", "TEXT");
ensureColumn("projects", "poster_media_id", "INTEGER");
ensureColumn("projects", "order_index", "INTEGER DEFAULT 0");
ensureColumn("projects", "model_3d", "TEXT");

ensureColumn("testimonials", "avatar_media_id", "INTEGER");
ensureColumn("testimonials", "quote_json", "TEXT");
ensureColumn("testimonials", "order_index", "INTEGER DEFAULT 0");

ensureColumn("team_members", "avatar_media_id", "INTEGER");
ensureColumn("team_members", "bio_json", "TEXT");

ensureColumn("journal_posts", "excerpt", "TEXT");
ensureColumn("journal_posts", "content_json", "TEXT");
ensureColumn("journal_posts", "cover_media_id", "INTEGER");
ensureColumn("journal_posts", "gallery_media_ids", "TEXT");
ensureColumn("journal_posts", "category", "TEXT");
ensureColumn("journal_posts", "author_name", "TEXT");

// TS-006 Phase B additive: site_identity logo_url + favicon_url.
// SQLite hot-copy writes ALTER TABLE ADD COLUMN once per cold container
// because the columns are missing on legacy seeds.
ensureColumn("site_identity", "logo_url", "TEXT");
ensureColumn("site_identity", "favicon_url", "TEXT");

// TS-006 Phase C additive: newsletter_subscribers.soft-delete via
// `active` flag, defaulting to 1 (true).
ensureColumn("newsletter_subscribers", "active", "INTEGER DEFAULT 1");

// FTS5 virtual table for admin cmd+k search
sqlite.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS admin_search USING fts5(
    entity, kind, title, body, slug,
    tokenize = 'porter unicode61'
  );
`);

function seedDefaultAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@etihadinteriors.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, 'admin')`
    )
    .run(adminEmail, passwordHash);
}

function seedDefaultSettings() {
  const defaults = [
    { key: "contact_email", value: "studio@etihadinteriors.com" },
    { key: "contact_phone", value: "+91 99999 99999" },
    { key: "studio_address", value: "Kalyan, Maharashtra, India" },
    { key: "calendly_url", value: "https://calendly.com/etihadinteriors/intro" },
    { key: "site_seo_title", value: "Etihad Interiors — Residential Design Studio" },
    { key: "site_seo_description", value: "A residential studio shaping considered homes across Maharashtra." },
    { key: "instagram_url", value: "https://instagram.com/etihadinteriors" },
    { key: "youtube_url", value: "" },
    { key: "linkedin_url", value: "" },
    { key: "year_established", value: "2017" },
    { key: "residences_delivered", value: "60+" },
  ];
  const stmt = sqlite.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
  );
  for (const s of defaults) stmt.run(s.key, s.value);
}

function seedIdentity() {
  const row = sqlite
    .prepare(`SELECT id FROM site_identity LIMIT 1`)
    .get() as { id: number } | undefined;
  if (!row) {
    sqlite.exec(`
      INSERT INTO site_identity (brand_name, tagline, accent_mode, footer_credit)
      VALUES ('Etihad Interiors', 'A residential interior studio based in Kalyan, Maharashtra.', 'auto', 'Powered by Etihad Interiors Theme v1.0.0');
    `);
  }
}

function seedPrimaryMenu() {
  let row = sqlite
    .prepare(`SELECT id FROM menus WHERE location = 'primary'`)
    .get() as { id: number } | undefined;
  if (!row) {
    const r = sqlite
      .prepare(`INSERT INTO menus (location) VALUES ('primary')`)
      .run();
    row = { id: Number(r.lastInsertRowid) };
  }
  const count = sqlite
    .prepare(`SELECT COUNT(*) AS c FROM menu_items WHERE menu_id = ?`)
    .get(row.id) as { c: number };
  if (count.c === 0) {
    const items = [
      ["Selected work", "/projects", null, 0, 0],
      ["Studio", "/about", null, 1, 0],
      ["Journal", "/journal", null, 2, 0],
      ["Contact", "/contact", null, 3, 0],
    ];
    const insert = sqlite.prepare(
      `INSERT INTO menu_items (menu_id, label, href, target, order_index, is_button) VALUES (?, ?, ?, ?, ?, ?)`
    );
    items.forEach(([label, href, target, order, button]) =>
      insert.run(row!.id, label, href, target, order, button)
    );
  }

  let footer = sqlite
    .prepare(`SELECT id FROM menus WHERE location = 'footer'`)
    .get() as { id: number } | undefined;
  if (!footer) {
    const r = sqlite
      .prepare(`INSERT INTO menus (location) VALUES ('footer')`)
      .run();
    footer = { id: Number(r.lastInsertRowid) };
  }
  const footerCount = sqlite
    .prepare(`SELECT COUNT(*) AS c FROM menu_items WHERE menu_id = ?`)
    .get(footer.id) as { c: number };
  if (footerCount.c === 0) {
    const items = [
      ["Studio", "", null, 0, 0],
    ];
    const insert = sqlite.prepare(
      `INSERT INTO menu_items (menu_id, parent_id, label, href, target, order_index, is_button) VALUES (?, NULL, ?, ?, ?, ?, ?)`
    );
    items.forEach(([label, href, target, order, button]) =>
      insert.run(footer.id, label, href, target, order, button)
    );
  }
}

seedDefaultAdmin();
seedDefaultSettings();
seedIdentity();
seedPrimaryMenu();

console.log("Database initialized successfully (idempotent migration applied).");
