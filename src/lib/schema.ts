import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  location: text("location"),
  locationCity: text("location_city"),
  year: text("year"),
  description: text("description").notNull(),
  descriptionJson: text("description_json"),
  beforeImage: text("before_image"),
  afterImage: text("after_image"),
  model3d: text("model_3d"),
  galleryMediaIds: text("gallery_media_ids"),
  scope: text("scope"),
  posterMediaId: integer("poster_media_id"),
  isPublished: integer("is_published", { mode: "boolean" }).default(true),
  orderIndex: integer("order_index").default(0),
  createdAt: integer("created_at", { mode: "timestamp" } as any)
    .$defaultFn(() => new Date() as any)
    .$type<Date>(),
});

export const testimonials = sqliteTable("testimonials", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role"),
  photo: text("photo"),
  avatarMediaId: integer("avatar_media_id"),
  quote: text("quote").notNull(),
  quoteJson: text("quote_json"),
  isPublished: integer("is_published", { mode: "boolean" }).default(true),
  orderIndex: integer("order_index").default(0),
  createdAt: integer("created_at", { mode: "timestamp" } as any)
    .$defaultFn(() => new Date() as any)
    .$type<Date>(),
});

export const teamMembers = sqliteTable("team_members", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role"),
  bio: text("bio"),
  bioJson: text("bio_json"),
  photo: text("photo"),
  avatarMediaId: integer("avatar_media_id"),
  order: integer("order").default(0),
  isPublished: integer("is_published", { mode: "boolean" }).default(true),
});

export const journalPosts = sqliteTable("journal_posts", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  contentJson: text("content_json"),
  coverImage: text("cover_image"),
  coverMediaId: integer("cover_media_id"),
  galleryMediaIds: text("gallery_media_ids"),
  category: text("category"),
  authorName: text("author_name"),
  isPublished: integer("is_published", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" } as any)
    .$defaultFn(() => new Date() as any)
    .$type<Date>(),
});

export const settings = sqliteTable("settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("admin"),
});

export const media = sqliteTable("media", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  originalName: text("original_name").notNull(),
  storagePath: text("storage_path").notNull(),
  url: text("url").notNull(),
  alt: text("alt"),
  width: integer("width"),
  height: integer("height"),
  createdAt: integer("created_at", { mode: "timestamp" } as any)
    .$defaultFn(() => new Date() as any)
    .$type<Date>(),
});

export const pages = sqliteTable("pages", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ogMediaId: integer("og_media_id"),
  isFront: integer("is_front", { mode: "boolean" }).default(false),
  publishedAt: integer("published_at", { mode: "timestamp" } as any)
    .$type<Date>(),
  createdAt: integer("created_at", { mode: "timestamp" } as any)
    .$defaultFn(() => new Date() as any)
    .$type<Date>(),
});

export const pageBlocks = sqliteTable("page_blocks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  pageId: integer("page_id").notNull(),
  type: text("type").notNull(),
  data: text("data").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const menus = sqliteTable("menus", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  location: text("location").notNull().unique(),
});

export const menuItems = sqliteTable("menu_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  menuId: integer("menu_id").notNull(),
  parentId: integer("parent_id"),
  label: text("label").notNull(),
  href: text("href").notNull(),
  target: text("target"),
  orderIndex: integer("order_index").notNull().default(0),
  isButton: integer("is_button", { mode: "boolean" }).default(false),
});

export const siteIdentity = sqliteTable("site_identity", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  brandName: text("brand_name").notNull().default("Etihad Interiors"),
  tagline: text("tagline"),
  logoMediaId: integer("logo_media_id"),
  faviconMediaId: integer("favicon_media_id"),
  accentMode: text("accent_mode").default("auto"),
  footerCredit: text("footer_credit"),
});

export const translations = sqliteTable("translations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  locale: text("locale").notNull(),
  namespace: text("namespace").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const revisions = sqliteTable("revisions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  payload: text("payload").notNull(),
  savedById: integer("saved_by_id"),
  savedAt: integer("saved_at", { mode: "timestamp" } as any)
    .$defaultFn(() => new Date() as any)
    .$type<Date>(),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  meta: text("meta"),
  createdAt: integer("created_at", { mode: "timestamp" } as any)
    .$defaultFn(() => new Date() as any)
    .$type<Date>(),
});
