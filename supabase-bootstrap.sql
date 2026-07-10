-- supabase-bootstrap.sql
-- Phase 1 of v1.1.2 migration. Creates tables in Supabase Postgres
-- mirroring the SQLite schema in src/lib/schema.ts. New columns
-- before_image and after_image on projects are present (they exist
-- in schema.ts already).
--
-- Apply this file from scripts/migrate-to-supabase.mjs, or run it
-- directly via psql / Supabase SQL editor.
--
-- Idempotent: every CREATE is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL,
  location VARCHAR(255),
  location_city VARCHAR(128),
  year VARCHAR(32),
  description TEXT NOT NULL,
  description_json JSONB,
  before_image TEXT,
  after_image TEXT,
  model_3d TEXT,
  gallery_media_ids TEXT,
  scope VARCHAR(255),
  poster_media_id INTEGER,
  is_published BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  photo TEXT,
  avatar_media_id INTEGER,
  quote TEXT NOT NULL,
  quote_json JSONB,
  is_published BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  bio TEXT,
  bio_json JSONB,
  photo TEXT,
  avatar_media_id INTEGER,
  "order" INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS journal_posts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  content_json JSONB,
  cover_image TEXT,
  cover_media_id INTEGER,
  gallery_media_ids TEXT,
  category VARCHAR(128),
  author_name VARCHAR(255),
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(32) DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(64) NOT NULL,
  mime VARCHAR(128) NOT NULL,
  size INTEGER NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  alt TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  seo_title VARCHAR(255),
  seo_description TEXT,
  og_media_id INTEGER,
  is_front BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_blocks (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL,
  type VARCHAR(64) NOT NULL,
  data JSONB NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menus (
  id SERIAL PRIMARY KEY,
  location VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  menu_id INTEGER NOT NULL,
  parent_id INTEGER,
  label VARCHAR(255) NOT NULL,
  href TEXT NOT NULL,
  target VARCHAR(32),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_button BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS site_identity (
  id SERIAL PRIMARY KEY,
  brand_name VARCHAR(128) NOT NULL DEFAULT 'Etihad Interiors',
  tagline TEXT,
  logo_media_id INTEGER,
  favicon_media_id INTEGER,
  accent_mode VARCHAR(32) DEFAULT 'auto',
  footer_credit TEXT
);

CREATE TABLE IF NOT EXISTS translations (
  id SERIAL PRIMARY KEY,
  locale VARCHAR(16) NOT NULL,
  namespace VARCHAR(128) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revisions (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(64) NOT NULL,
  entity_id INTEGER NOT NULL,
  payload JSONB NOT NULL,
  saved_by_id INTEGER,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(128) NOT NULL UNIQUE,
  studio_name VARCHAR(255) NOT NULL,
  owner_email VARCHAR(255),
  domain VARCHAR(255),
  tier VARCHAR(32) DEFAULT 'personal',
  state VARCHAR(32) DEFAULT 'pending',
  hmac_key TEXT,
  installed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tenant_data (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL UNIQUE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- TS-006 additive migrations. ADD COLUMN IF NOT EXISTS is idempotent
-- on Postgres 9.6+; ensureMigrated replays supabase-bootstrap.sql
-- once per cold start under the advisory lock so the columns land
-- without breaking the CREATE TABLE IF NOT EXISTS path.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE site_identity ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE site_identity ADD COLUMN IF NOT EXISTS favicon_url TEXT;
