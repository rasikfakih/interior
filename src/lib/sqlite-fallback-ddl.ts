/**
 * SQLite schema bootstrap for v1.1.2 fallback.
 *
 * The Postgres-first runtime owns the canonical schema (see
 * supabase-bootstrap.sql). When DATABASE_URL is unset and the
 * runtime falls back to local SQLite, this DDL keeps the
 * local-Sqlite dev/qa path usable. It is structurally aligned
 * with the Postgres DDL but lives in a separate module so the
 * dev loop doesn't need a Postgres connection.
 *
 * Idempotent: every CREATE is IF NOT EXISTS. Run on first cold
 * start of the Vercel fallback path, then memoised.
 */

export const SQLITE_FALLBACK_DDL = [
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT,
    location_city TEXT,
    year TEXT,
    description TEXT NOT NULL,
    description_json TEXT,
    before_image TEXT,
    after_image TEXT,
    model_3d TEXT,
    gallery_media_ids TEXT,
    scope TEXT,
    poster_media_id INTEGER,
    is_published INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    photo TEXT,
    avatar_media_id INTEGER,
    quote TEXT NOT NULL,
    quote_json TEXT,
    is_published INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    bio TEXT,
    bio_json TEXT,
    photo TEXT,
    avatar_media_id INTEGER,
    "order" INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS journal_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    content_json TEXT,
    cover_image TEXT,
    cover_media_id INTEGER,
    gallery_media_ids TEXT,
    category TEXT,
    author_name TEXT,
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin'
  )`,

  `CREATE TABLE IF NOT EXISTS media (
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

  `CREATE TABLE IF NOT EXISTS pages (
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

  `CREATE TABLE IF NOT EXISTS page_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT UNIQUE NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id INTEGER NOT NULL,
    parent_id INTEGER,
    label TEXT NOT NULL,
    href TEXT NOT NULL,
    target TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_button INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS site_identity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name TEXT NOT NULL DEFAULT 'Etihad Interiors',
    tagline TEXT,
    logo_media_id INTEGER,
    favicon_media_id INTEGER,
    logo_url TEXT,
    favicon_url TEXT,
    accent_mode TEXT DEFAULT 'auto',
    footer_credit TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    locale TEXT NOT NULL,
    namespace TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE (locale, namespace, key)
  )`,

  `CREATE TABLE IF NOT EXISTS revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    payload TEXT NOT NULL,
    saved_by_id INTEGER,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    meta TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    studio_name TEXT NOT NULL,
    owner_email TEXT,
    domain TEXT,
    tier TEXT NOT NULL DEFAULT 'personal',
    state TEXT NOT NULL DEFAULT 'pending',
    hmac_key TEXT,
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    revoked_at DATETIME
  )`,

  `CREATE TABLE IF NOT EXISTS tenant_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    active INTEGER DEFAULT 1
  )`,
];