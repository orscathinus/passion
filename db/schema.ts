import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cmsDocuments = sqliteTable("cms_documents", {
  id: integer("id").primaryKey(),
  draftJson: text("draft_json").notNull(),
  publishedJson: text("published_json").notNull(),
  draftVersion: integer("draft_version").notNull().default(1),
  publishedVersion: integer("published_version").notNull().default(1),
  updatedAt: integer("updated_at").notNull(),
});

export const cmsVersions = sqliteTable("cms_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  version: integer("version").notNull(),
  documentJson: text("document_json").notNull(),
  actorEmail: text("actor_email").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("cms_versions_created_idx").on(table.createdAt)]);

export const adminCredentials = sqliteTable("admin_credentials", {
  email: text("email").primaryKey(),
  salt: text("salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  iterations: integer("iterations").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const adminSessions = sqliteTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  csrfToken: text("csrf_token").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
}, (table) => [index("admin_sessions_expiry_idx").on(table.expiresAt)]);

export const loginAttempts = sqliteTable("login_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subjectHash: text("subject_hash").notNull(),
  success: integer("success").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("login_attempts_subject_idx").on(table.subjectHash, table.createdAt)]);

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("audit_log_created_idx").on(table.createdAt)]);

export const exhibitComments = sqliteTable("exhibit_comments", {
  id: text("id").primaryKey(),
  exhibitNo: text("exhibit_no").notNull(),
  parentId: text("parent_id"),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  ipHash: text("ip_hash").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("exhibit_comments_exhibit_idx").on(table.exhibitNo, table.status, table.createdAt),
  index("exhibit_comments_parent_idx").on(table.parentId),
  index("exhibit_comments_ip_idx").on(table.ipHash, table.createdAt),
]);
