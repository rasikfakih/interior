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
  kind TEXT NOT NULL DEFAULT 'distro',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- StudioOS v2.0 Phase 0 tables. Mirrors scripts/migrate.mjs so the
-- SQLite dev path and the live Postgres runtime converge.
CREATE TABLE IF NOT EXISTS project_rooms (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  model_3d TEXT,
  cover_media_id INTEGER,
  hotspots JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS form_definitions (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  fields JSONB NOT NULL,
  submit_label VARCHAR(128),
  success_message TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL,
  payload JSONB NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead pipeline (Modules 1-2). Website leads land from
-- /api/forms/submit with source='website'; manual leads come from the
-- /admin/leads modal. Status funnel: new -> qualified -> site_visit
-- -> quote_sent -> won, plus lost (terminal). Status values are
-- whitelisted in src/lib/leads.ts at the API boundary (no DB CHECK
-- constraint: the funnel must stay editable without a migration).
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64),
  email VARCHAR(255),
  source VARCHAR(64) NOT NULL DEFAULT 'manual',
  budget VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 0,
  lost_reason TEXT,
  last_status_change_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module 2 additive columns for existing leads tables.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ DEFAULT NOW();

-- Module 3: client engagements (CRM projects) + proposal documents.
-- Named client_projects to avoid colliding with the portfolio
-- `projects` table (id SERIAL, slug, title, category...) that ships
-- the public /projects surface. Ids are uuid TEXT generated in app
-- code (crypto.randomUUID) so the same inserts run on SQLite and
-- Postgres without a gen_random_uuid() dependency in the DDL.
-- tenant_id / lead_id are INTEGER because tenants.id and leads.id are
-- SERIAL on Postgres.
CREATE TABLE IF NOT EXISTS client_projects (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  lead_id INTEGER REFERENCES leads(id),
  name TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','design','execution','handover','delivered')),
  budget NUMERIC,
  area_sqft NUMERIC,
  address TEXT,
  portal_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  project_id TEXT NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  lead_id INTEGER REFERENCES leads(id),
  token TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Project Proposal',
  budget NUMERIC,
  timeline_text TEXT,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  boq_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','approved')),
  viewed_at TIMESTAMPTZ,
  viewed_count INTEGER NOT NULL DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  accepted_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_projects_tenant ON client_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_lead ON client_projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_project ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_token ON proposals(token);

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  client_project_id TEXT NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Moodboard',
  canvas_json JSONB NOT NULL DEFAULT '{"zoom":1,"pan":{"x":0,"y":0},"width":2000,"height":1500}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_items (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  w REAL NOT NULL DEFAULT 200,
  h REAL NOT NULL DEFAULT 200,
  rotation REAL NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 0,
  meta_json JSONB NOT NULL DEFAULT '{"note":"","scale":1}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_tenant ON boards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(client_project_id);
CREATE INDEX IF NOT EXISTS idx_board_items_board ON board_items(board_id);
CREATE INDEX IF NOT EXISTS idx_board_items_material ON board_items(material_id);

CREATE TABLE IF NOT EXISTS boq_versions (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  client_project_id TEXT NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'BOQ v1',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','approved','revised')),
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_project_id, version_no)
);

CREATE TABLE IF NOT EXISTS boq_items (
  id TEXT PRIMARY KEY,
  boq_version_id TEXT NOT NULL REFERENCES boq_versions(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  category TEXT NOT NULL DEFAULT 'civil'
    CHECK (category IN ('civil','carpentry','electrical','plumbing','painting','false_ceiling','flooring','soft_furnishing','decor','other')),
  item_name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'nos'
    CHECK (unit IN ('sqft','rft','nos','set','lot','lump','sqm','rm')),
  qty NUMERIC NOT NULL DEFAULT 1,
  material_rate NUMERIC NOT NULL DEFAULT 0,
  labour_rate NUMERIC NOT NULL DEFAULT 0,
  wastage_pct NUMERIC NOT NULL DEFAULT 5,
  gst_pct NUMERIC NOT NULL DEFAULT 18,
  amount NUMERIC NOT NULL DEFAULT 0,
  linked_material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
  linked_board_item_id TEXT REFERENCES board_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boq_versions_tenant ON boq_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_boq_versions_project ON boq_versions(client_project_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_tenant ON boq_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_version ON boq_items(boq_version_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_category ON boq_items(category);
CREATE INDEX IF NOT EXISTS idx_boq_items_material ON boq_items(linked_material_id);

-- Realtime: moodboard canvas collaboration (boards + board_items).
-- Guarded so a fresh Supabase project without the publication still
-- bootstraps cleanly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE boards, board_items;
    EXCEPTION WHEN duplicate_object OR others THEN
      -- Tables are already members of the publication (or the
      -- publication is read-only); that is the desired state, so
      -- swallow the error instead of aborting the transaction.
      NULL;
    END;
  END IF;
END
$$;

-- Module 4: material + vendor library (foundation for the board
-- canvas and BOQ modules). Ids are app-generated uuid TEXT, tenant_id
-- INTEGER, matching the client_projects pattern. Deleting a vendor
-- nulls materials.vendor_id (the route also does this explicitly so
-- the SQLite fallback, where foreign_keys is off by default, behaves
-- identically).
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('stone','wood','textile','hardware','lighting','furniture','paint','civil','electrical','plumbing','other')),
  phone TEXT,
  email TEXT,
  address TEXT,
  lead_time_days INTEGER DEFAULT 7,
  rating INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  vendor_id TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('stone','wood','textile','hardware','lighting','furniture','paint','civil','electrical','plumbing','other')),
  sku TEXT,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'nos'
    CHECK (unit IN ('sqft','rft','nos','set','lot','lump')),
  image_url TEXT,
  gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  specs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  stock_status TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (stock_status IN ('in_stock','low','out_of_stock','discontinued')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_materials_tenant ON materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_vendor ON materials(vendor_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);

-- Module 7: site diary + snag list (offline-first PWA). photos is a
-- JSON array of site-photos storage paths. created_by records the
-- signed-in user email for audit. Deleting a site log nulls
-- snags.site_log_id (the route also does this explicitly so the
-- SQLite fallback behaves identically).
CREATE TABLE IF NOT EXISTS site_logs (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  client_project_id TEXT NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  log_date DATE DEFAULT CURRENT_DATE,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  labour_count INTEGER NOT NULL DEFAULT 0,
  work_done TEXT,
  voice_transcript TEXT,
  weather TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snags (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  client_project_id TEXT NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  site_log_id TEXT REFERENCES site_logs(id) ON DELETE SET NULL,
  photo_url TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','fixed','verified')),
  assigned_to TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high')),
  fixed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_logs_tenant ON site_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_logs_project ON site_logs(client_project_id);
CREATE INDEX IF NOT EXISTS idx_site_logs_date ON site_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_snags_tenant ON snags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_snags_project ON snags(client_project_id);
CREATE INDEX IF NOT EXISTS idx_snags_status ON snags(status);
CREATE INDEX IF NOT EXISTS idx_snags_site_log ON snags(site_log_id);

CREATE TABLE IF NOT EXISTS redirects (
  id SERIAL PRIMARY KEY,
  source VARCHAR(255) NOT NULL,
  destination TEXT NOT NULL,
  status_code INTEGER DEFAULT 301,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS usage_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  kind VARCHAR(64) NOT NULL,
  path TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS license_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  action VARCHAR(64) NOT NULL,
  tier VARCHAR(32),
  seats INTEGER,
  expires_at TIMESTAMPTZ,
  issued_by VARCHAR(255),
  revenue_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Durable license store (singleton row). The signed license document
-- lives here so stamp-advance / re-issue persist on serverless hosts
-- where the deployed bundle is read-only. The legacy data/license.json
-- remains a localhost authoring surface and a first-read import source.
CREATE TABLE IF NOT EXISTS license_doc (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR(32) NOT NULL DEFAULT 'all',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TS-006 additive migrations. ADD COLUMN IF NOT EXISTS is idempotent
-- on Postgres 9.6+; ensureMigrated replays supabase-bootstrap.sql
-- once per cold start under the advisory lock so the columns land
-- without breaking the CREATE TABLE IF NOT EXISTS path.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE site_identity ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE site_identity ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- StudioOS v2.0 Phase 0 column additions (SQLite mirror in migrate.mjs).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 1;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS support_notes TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_health_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS storage_used_bytes INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'unknown';
ALTER TABLE media ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS robots TEXT DEFAULT 'index,follow';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Module 8: client portal (both subdomain and custom domain).
-- White-label portal hostnames live on tenants; the portal page
-- resolves tenant by the project's portal_token and reads these to
-- decide branding (e.g. hide "Powered by Studio OS" on a custom
-- domain). portal_access_count increments per portal page view.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS client_subdomain TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 100;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS portal_token_created_at TIMESTAMPTZ;
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS portal_access_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS client_portal_approvals (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  client_project_id TEXT NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  portal_token TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('board','boq','photo')),
  target_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_comments (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  client_project_id TEXT NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  portal_token TEXT,
  author TEXT NOT NULL CHECK (author IN ('client','studio')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_approvals_tenant ON client_portal_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_approvals_project ON client_portal_approvals(client_project_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_approvals_token ON client_portal_approvals(portal_token);
CREATE INDEX IF NOT EXISTS idx_client_comments_tenant ON client_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_comments_project ON client_comments(client_project_id);
CREATE INDEX IF NOT EXISTS idx_client_comments_token ON client_comments(portal_token);

-- Module 10: freemium plans + billing.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_usd INTEGER NOT NULL DEFAULT 0,
  price_inr INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','yearly')),
  project_limit INTEGER NOT NULL DEFAULT 0,
  lead_limit INTEGER NOT NULL DEFAULT 0,
  board_limit INTEGER NOT NULL DEFAULT 0,
  boq_version_limit INTEGER NOT NULL DEFAULT 0,
  ai_credits_limit INTEGER NOT NULL DEFAULT 0,
  features_json JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  provider TEXT NOT NULL DEFAULT 'manual'
    CHECK (provider IN ('stripe','razorpay','manual')),
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider_subscription_id);

-- Module 9: AI generations + social autopilot.
CREATE TABLE IF NOT EXISTS ai_generations (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  client_project_id TEXT REFERENCES client_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'weekly_report'
    CHECK (type IN ('weekly_report','social_caption','proposal_summary','lead_score','budget_insight')),
  input_json JSONB DEFAULT '{}'::jsonb,
  output_json JSONB DEFAULT '{}'::jsonb,
  model TEXT DEFAULT 'deepseek-v4-flash-0731',
  credits_used INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  client_project_id TEXT NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  ai_generation_id TEXT REFERENCES ai_generations(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'instagram'
    CHECK (platform IN ('instagram','linkedin','facebook','other')),
  caption TEXT,
  hashtags TEXT,
  image_urls JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','published')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_generations_tenant ON ai_generations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_project ON ai_generations(client_project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_type ON ai_generations(type);
CREATE INDEX IF NOT EXISTS idx_social_posts_tenant ON social_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_project ON social_posts(client_project_id);
