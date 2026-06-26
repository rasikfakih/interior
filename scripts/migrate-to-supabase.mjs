#!/usr/bin/env node
/**
 * scripts/migrate-to-supabase.mjs
 *
 * Phase 1 of the v1.1.2 migration. Reads DATABASE_URL from the
 * operator's .env.local, applies supabase-bootstrap.sql DDL via the
 * pg Pool, then writes the rows from data/etihad.db into the new
 * Postgres tables.
 *
 * Idempotent. Safe to re-run. Does not touch Vercel runtime.
 */
import fs from 'fs';
import path from 'path';
import url from 'url';
import pg from 'pg';
import Database from 'better-sqlite3';

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
    const value = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set. Aborting.');
  process.exit(1);
}

const JSON_COLUMNS = new Set([
  'data',
  'meta',
  'payload',
  'description_json',
  'quote_json',
  'bio_json',
  'content_json',
]);

function bool(v) { return v ? 1 : 0; }
function str(v) { return v == null ? null : String(v); }
function int(v) { return v == null ? null : Number(v); }
function json(v) {
  if (v == null) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
}

async function replayTable(pool, sqlite, table, pKey, columns, map, opts = {}) {
  const includeId = opts.includeId !== false;
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  if (!rows.length) {
    console.log(`-- ${table}: 0 rows, skipping`);
    return;
  }
  const cols = includeId ? ['id', ...columns] : columns;
  let inserted = 0;
  for (const r of rows) {
    const raw = map(r);
    if (includeId) {
      raw.id = int(r.id);
    }
    const keys = Object.keys(raw);
    const placeholders = keys.map((c, i) =>
      JSON_COLUMNS.has(c) ? `$${i + 1}::jsonb` : `$${i + 1}`
    ).join(',');
    const updates = keys
      .filter((c) => c !== pKey)
      .map((c) => `${c}=EXCLUDED.${c}`)
      .join(',');
    const sql =
      `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) ` +
      `ON CONFLICT (${pKey}) DO UPDATE SET ${updates}`;
    const params = keys.map((c) => {
      const v = raw[c];
      return JSON_COLUMNS.has(c) ? JSON.stringify(v) : v;
    });
    await pool.query(sql, params);
    inserted += 1;
  }
  console.log(`-- ${table}: replayed ${inserted} row(s)`);
}

async function main() {
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase.com') || dbUrl.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  console.log('-- applying DDL');
  const ddl = fs.readFileSync(path.join(repoRoot, 'supabase-bootstrap.sql'), 'utf8');
  await pool.query(ddl);

  const sqlite = new Database(path.join(repoRoot, 'data', 'etihad.db'), { readonly: true });

  await replayTable(pool, sqlite, 'users', 'email',
    ['email', 'password_hash', 'role'],
    (r) => ({
      email: str(r.email),
      password_hash: str(r.password_hash),
      role: str(r.role || 'admin'),
    }));

  await replayTable(pool, sqlite, 'tenants', 'slug',
    ['slug', 'studio_name', 'owner_email', 'domain', 'tier', 'state', 'hmac_key'],
    (r) => ({
      slug: str(r.slug),
      studio_name: str(r.studio_name),
      owner_email: str(r.owner_email),
      domain: str(r.domain),
      tier: str(r.tier || 'personal'),
      state: str(r.state || 'active'),
      hmac_key: str(r.hmac_key),
    }));

  await replayTable(pool, sqlite, 'site_identity', 'id',
    ['brand_name', 'tagline', 'accent_mode', 'footer_credit'],
    (r) => ({
      brand_name: str(r.brand_name || 'Etihad Interiors'),
      tagline: str(r.tagline),
      accent_mode: str(r.accent_mode || 'auto'),
      footer_credit: str(r.footer_credit),
    }));

  await replayTable(pool, sqlite, 'settings', 'key',
    ['key', 'value'],
    (r) => ({
      key: str(r.key),
      value: str(r.value),
    }), { includeId: false });

  await replayTable(pool, sqlite, 'pages', 'slug',
    ['slug', 'title', 'status', 'seo_title', 'seo_description', 'is_front'],
    (r) => ({
      slug: str(r.slug),
      title: str(r.title),
      status: str(r.status || 'published'),
      seo_title: str(r.seo_title),
      seo_description: str(r.seo_description),
      is_front: bool(r.is_front),
    }));

  await replayTable(pool, sqlite, 'page_blocks', 'id',
    ['page_id', 'type', 'data', 'order_index'],
    (r) => ({
      page_id: int(r.page_id),
      type: str(r.type),
      data: json(r.data),
      order_index: int(r.order_index || 0),
    }));

  await replayTable(pool, sqlite, 'menus', 'id',
    ['location'],
    (r) => ({
      location: str(r.location),
    }));

  await replayTable(pool, sqlite, 'menu_items', 'id',
    ['menu_id', 'parent_id', 'label', 'href', 'target', 'order_index', 'is_button'],
    (r) => ({
      menu_id: int(r.menu_id),
      parent_id: int(r.parent_id),
      label: str(r.label),
      href: str(r.href),
      target: str(r.target),
      order_index: int(r.order_index || 0),
      is_button: bool(r.is_button),
    }));

  sqlite.close();
  await pool.end();
  console.log('-- done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
