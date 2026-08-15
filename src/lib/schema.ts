import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";

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
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const settings = sqliteTable("settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const leads = sqliteTable("leads", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  source: text("source").notNull().default("manual"),
  budget: text("budget"),
  status: text("status").notNull().default("new"),
  score: integer("score").notNull().default(0),
  lostReason: text("lost_reason"),
  lastStatusChangeAt: integer("last_status_change_at", { mode: "timestamp" })
    .$type<Date>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const clientProjects = sqliteTable("client_projects", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  leadId: integer("lead_id"),
  name: text("name").notNull(),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  status: text("status").notNull().default("draft"),
  budget: real("budget"),
  areaSqft: real("area_sqft"),
  address: text("address"),
  portalToken: text("portal_token").unique(),
  portalTokenCreatedAt: integer("portal_token_created_at", { mode: "timestamp" })
    .$type<Date | null>(),
  portalAccessCount: integer("portal_access_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const clientPortalApprovals = sqliteTable("client_portal_approvals", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientProjectId: text("client_project_id").notNull(),
  portalToken: text("portal_token").notNull(),
  type: text("type").notNull().default("board"),
  targetId: text("target_id").notNull(),
  status: text("status").notNull().default("pending"),
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const clientComments = sqliteTable("client_comments", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientProjectId: text("client_project_id").notNull(),
  portalToken: text("portal_token"),
  author: text("author").notNull().default("client"),
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  projectId: text("project_id").notNull(),
  leadId: integer("lead_id"),
  token: text("token").notNull().unique(),
  title: text("title").notNull().default("Project Proposal"),
  budget: real("budget"),
  timelineText: text("timeline_text"),
  contentJson: text("content_json").notNull().default("{}"),
  boqVersionId: text("boq_version_id"),
  status: text("status").notNull().default("draft"),
  viewedAt: integer("viewed_at", { mode: "timestamp" }).$type<Date>(),
  viewedCount: integer("viewed_count").notNull().default(0),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }).$type<Date>(),
  acceptedByName: text("accepted_by_name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const vendors = sqliteTable("vendors", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  leadTimeDays: integer("lead_time_days").default(7),
  rating: integer("rating").default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const materials = sqliteTable("materials", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  vendorId: text("vendor_id"),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"),
  sku: text("sku"),
  costPerUnit: real("cost_per_unit").notNull().default(0),
  unit: text("unit").notNull().default("nos"),
  imageUrl: text("image_url"),
  galleryUrls: text("gallery_urls").notNull().default("[]"),
  specsJson: text("specs_json").notNull().default("{}"),
  stockStatus: text("stock_status").notNull().default("in_stock"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const boards = sqliteTable("boards", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientProjectId: text("client_project_id").notNull(),
  title: text("title").notNull().default("Moodboard"),
  canvasJson: text("canvas_json").notNull().default(
    '{"zoom":1,"pan":{"x":0,"y":0},"width":2000,"height":1500}'
  ),
  status: text("status").notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const boardItems = sqliteTable("board_items", {
  id: text("id").primaryKey(),
  boardId: text("board_id").notNull(),
  materialId: text("material_id"),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  w: real("w").notNull().default(200),
  h: real("h").notNull().default(200),
  rotation: real("rotation").notNull().default(0),
  zIndex: integer("z_index").notNull().default(0),
  metaJson: text("meta_json").notNull().default('{"note":"","scale":1}'),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const boqVersions = sqliteTable("boq_versions", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientProjectId: text("client_project_id").notNull(),
  versionNo: integer("version_no").notNull(),
  title: text("title").notNull().default("BOQ v1"),
  status: text("status").notNull().default("draft"),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const boqItems = sqliteTable("boq_items", {
  id: text("id").primaryKey(),
  boqVersionId: text("boq_version_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  category: text("category").notNull().default("civil"),
  itemName: text("item_name").notNull(),
  description: text("description"),
  unit: text("unit").notNull().default("nos"),
  qty: real("qty").notNull().default(1),
  materialRate: real("material_rate").notNull().default(0),
  labourRate: real("labour_rate").notNull().default(0),
  wastagePct: real("wastage_pct").notNull().default(5),
  gstPct: real("gst_pct").notNull().default(18),
  amount: real("amount").notNull().default(0),
  linkedMaterialId: text("linked_material_id"),
  linkedBoardItemId: text("linked_board_item_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const siteLogs = sqliteTable("site_logs", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientProjectId: text("client_project_id").notNull(),
  logDate: text("log_date"),
  photos: text("photos").notNull().default("[]"),
  labourCount: integer("labour_count").notNull().default(0),
  workDone: text("work_done"),
  voiceTranscript: text("voice_transcript"),
  weather: text("weather"),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const snags = sqliteTable("snags", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientProjectId: text("client_project_id").notNull(),
  siteLogId: text("site_log_id"),
  photoUrl: text("photo_url"),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  assignedTo: text("assigned_to"),
  priority: text("priority").notNull().default("medium"),
  fixedAt: integer("fixed_at", { mode: "timestamp" })
    .$type<Date | null>(),
  verifiedAt: integer("verified_at", { mode: "timestamp" })
    .$type<Date | null>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const aiGenerations = sqliteTable("ai_generations", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientProjectId: text("client_project_id"),
  type: text("type").notNull().default("weekly_report"),
  inputJson: text("input_json").notNull().default("{}"),
  outputJson: text("output_json").notNull().default("{}"),
  model: text("model").default("deepseek-v4-flash-0731"),
  creditsUsed: integer("credits_used").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const socialPosts = sqliteTable("social_posts", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  clientProjectId: text("client_project_id").notNull(),
  aiGenerationId: text("ai_generation_id"),
  platform: text("platform").notNull().default("instagram"),
  caption: text("caption"),
  hashtags: text("hashtags"),
  imageUrls: text("image_urls").notNull().default("[]"),
  status: text("status").notNull().default("draft"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" })
    .$type<Date | null>(),
  publishedAt: integer("published_at", { mode: "timestamp" })
    .$type<Date | null>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("admin"),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceUsd: integer("price_usd").notNull().default(0),
  priceInr: integer("price_inr").notNull().default(0),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  projectLimit: integer("project_limit").notNull().default(0),
  leadLimit: integer("lead_limit").notNull().default(0),
  boardLimit: integer("board_limit").notNull().default(0),
  boqVersionLimit: integer("boq_version_limit").notNull().default(0),
  aiCreditsLimit: integer("ai_credits_limit").notNull().default(0),
  featuresJson: text("features_json").notNull().default("{}"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  planId: text("plan_id").notNull(),
  provider: text("provider").notNull().default("manual"),
  providerSubscriptionId: text("provider_subscription_id"),
  status: text("status").notNull().default("pending"),
  currentPeriodStart: integer("current_period_start", { mode: "timestamp" })
    .$type<Date | null>(),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" })
    .$type<Date | null>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
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
  publishedAt: integer("published_at", { mode: "timestamp" })
    .$type<Date>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
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
  savedAt: integer("saved_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  meta: text("meta"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$type<Date>(),
});
