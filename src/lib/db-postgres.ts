/**
 * Postgres mirror of the SQLite schema in ./schema.ts.
 *
 * Phase 1 of the v1.1.2 migration: column-for-column adjacency with
 * the SQLite tables, includes the `before_image` and `after_image`
 * columns on `projects` (already present in schema.ts; preserved
 * here so PHP/SQLite-vs-Node/Postgres routes stay symmetric).
 *
 * Naming convention: Postgres snake_case columns match the SQLite
 * column names so raw SQL DDL portable between engines.
 */

import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 128 }).notNull(),
  location: varchar('location', { length: 255 }),
  locationCity: varchar('location_city', { length: 128 }),
  year: varchar('year', { length: 32 }),
  description: text('description').notNull(),
  descriptionJson: jsonb('description_json'),
  beforeImage: text('before_image'),
  afterImage: text('after_image'),
  model3d: text('model_3d'),
  galleryMediaIds: text('gallery_media_ids'),
  scope: varchar('scope', { length: 255 }),
  posterMediaId: integer('poster_media_id'),
  isPublished: boolean('is_published').default(true),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const testimonials = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }),
  photo: text('photo'),
  avatarMediaId: integer('avatar_media_id'),
  quote: text('quote').notNull(),
  quoteJson: jsonb('quote_json'),
  isPublished: boolean('is_published').default(true),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }),
  bio: text('bio'),
  bioJson: jsonb('bio_json'),
  photo: text('photo'),
  avatarMediaId: integer('avatar_media_id'),
  order: integer('order').default(0),
  isPublished: boolean('is_published').default(true),
});

export const journalPosts = pgTable('journal_posts', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  contentJson: jsonb('content_json'),
  coverImage: text('cover_image'),
  coverMediaId: integer('cover_media_id'),
  galleryMediaIds: text('gallery_media_ids'),
  category: varchar('category', { length: 128 }),
  authorName: varchar('author_name', { length: 255 }),
  isPublished: boolean('is_published').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 32 }).default('admin'),
});

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  kind: varchar('kind', { length: 64 }).notNull(),
  mime: varchar('mime', { length: 128 }).notNull(),
  size: integer('size').notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  storagePath: text('storage_path').notNull(),
  url: text('url').notNull(),
  alt: text('alt'),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pages = pgTable('pages', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('draft'),
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: text('seo_description'),
  ogMediaId: integer('og_media_id'),
  isFront: boolean('is_front').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pageBlocks = pgTable('page_blocks', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  data: jsonb('data').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
});

export const menus = pgTable('menus', {
  id: serial('id').primaryKey(),
  location: varchar('location', { length: 64 }).notNull().unique(),
});

export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  menuId: integer('menu_id').notNull(),
  parentId: integer('parent_id'),
  label: varchar('label', { length: 255 }).notNull(),
  href: text('href').notNull(),
  target: varchar('target', { length: 32 }),
  orderIndex: integer('order_index').notNull().default(0),
  isButton: boolean('is_button').default(false),
});

export const siteIdentity = pgTable('site_identity', {
  id: serial('id').primaryKey(),
  brandName: varchar('brand_name', { length: 128 }).notNull().default('Etihad Interiors'),
  tagline: text('tagline'),
  logoMediaId: integer('logo_media_id'),
  faviconMediaId: integer('favicon_media_id'),
  accentMode: varchar('accent_mode', { length: 32 }).default('auto'),
  footerCredit: text('footer_credit'),
});

export const translations = pgTable('translations', {
  id: serial('id').primaryKey(),
  locale: varchar('locale', { length: 16 }).notNull(),
  namespace: varchar('namespace', { length: 128 }).notNull(),
  key: varchar('key', { length: 255 }).notNull(),
  value: text('value').notNull(),
});

export const revisions = pgTable('revisions', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 64 }).notNull(),
  entityId: integer('entity_id').notNull(),
  payload: jsonb('payload').notNull(),
  savedById: integer('saved_by_id'),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  kind: varchar('kind', { length: 64 }).notNull(),
  message: text('message').notNull(),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  studioName: varchar('studio_name', { length: 255 }).notNull(),
  ownerEmail: varchar('owner_email', { length: 255 }),
  domain: varchar('domain', { length: 255 }),
  tier: varchar('tier', { length: 32 }).default('personal'),
  state: varchar('state', { length: 32 }).default('pending'),
  hmacKey: text('hmac_key'),
  installedAt: timestamp('installed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const tenantData = pgTable('tenant_data', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().unique(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).defaultNow(),
});

import type { drizzle as drizzleType } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export function drizzlePostgres(pool: pg.Pool) {
  return drizzle(pool, {
    schema: {
      projects,
      testimonials,
      teamMembers,
      journalPosts,
      settings,
      users,
      media,
      pages,
      pageBlocks,
      menus,
      menuItems,
      siteIdentity,
      translations,
      revisions,
      auditLog,
      tenants,
      tenantData,
      newsletterSubscribers,
    },
  });
}
