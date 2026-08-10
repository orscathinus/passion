import { createPool, type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import type { ExecuteValues } from "mysql2";
import type { ObjectStore, SqlDatabase, SqlRows, SqlRunResult, SqlStatement, StoredObject } from "../server/persistence";
import publishedSeed from "./published-seed.json";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS cms_documents (
    id INT NOT NULL PRIMARY KEY,
    draft_json LONGTEXT NOT NULL,
    published_json LONGTEXT NOT NULL,
    draft_version BIGINT NOT NULL DEFAULT 1,
    published_version BIGINT NOT NULL DEFAULT 1,
    updated_at BIGINT NOT NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS cms_versions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    kind VARCHAR(32) NOT NULL,
    version BIGINT NOT NULL,
    document_json LONGTEXT NOT NULL,
    actor_email VARCHAR(254) NOT NULL,
    created_at BIGINT NOT NULL,
    INDEX cms_versions_created_idx (created_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS admin_credentials (
    email VARCHAR(254) NOT NULL PRIMARY KEY,
    salt VARCHAR(128) CHARACTER SET ascii NOT NULL,
    password_hash VARCHAR(128) CHARACTER SET ascii NOT NULL,
    iterations INT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash VARCHAR(128) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    csrf_token VARCHAR(128) CHARACTER SET ascii NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    last_seen_at BIGINT NOT NULL,
    INDEX admin_sessions_expiry_idx (expires_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    subject_hash VARCHAR(128) CHARACTER SET ascii NOT NULL,
    success TINYINT NOT NULL,
    created_at BIGINT NOT NULL,
    INDEX login_attempts_subject_idx (subject_hash, created_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_email VARCHAR(254) NOT NULL,
    action VARCHAR(80) NOT NULL,
    details TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    INDEX audit_log_created_idx (created_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS exhibit_comments (
    id VARCHAR(80) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    exhibit_no VARCHAR(20) NOT NULL,
    parent_id VARCHAR(80) CHARACTER SET ascii NULL,
    author_name VARCHAR(60) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'visible',
    ip_hash VARCHAR(128) CHARACTER SET ascii NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    INDEX exhibit_comments_exhibit_idx (exhibit_no, status, created_at),
    INDEX exhibit_comments_parent_idx (parent_id),
    INDEX exhibit_comments_ip_idx (ip_hash, created_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS contribution_submissions (
    id VARCHAR(80) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    contributor_name VARCHAR(100) NOT NULL,
    contributor_email VARCHAR(254) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    claim_id VARCHAR(20) NOT NULL,
    position VARCHAR(20) NOT NULL,
    proposed_title VARCHAR(160) NOT NULL,
    proposed_statement TEXT NOT NULL,
    evidence MEDIUMTEXT NOT NULL,
    explanation MEDIUMTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    ip_hash VARCHAR(128) CHARACTER SET ascii NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    INDEX contribution_submissions_created_idx (created_at),
    INDEX contribution_submissions_status_idx (status, created_at),
    INDEX contribution_submissions_ip_idx (ip_hash, created_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS contribution_files (
    id VARCHAR(80) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    submission_id VARCHAR(80) CHARACTER SET ascii NOT NULL,
    object_key VARCHAR(512) CHARACTER SET ascii NOT NULL,
    original_name VARCHAR(180) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    UNIQUE KEY contribution_files_object_key_idx (object_key),
    INDEX contribution_files_submission_idx (submission_id, created_at)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS contribution_file_blobs (
    object_key VARCHAR(512) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    content LONGBLOB NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS migration_imports (
    id VARCHAR(80) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    imported_at BIGINT NOT NULL,
    source_url VARCHAR(700) NOT NULL,
    details TEXT NOT NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
] as const;

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required Hostinger environment variable: ${name}`);
  return value;
}

function databaseConfig() {
  const port = Number(process.env.DB_PORT ?? "3306");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("DB_PORT must be a valid TCP port.");
  return {
    host: requiredEnvironment("DB_HOST"),
    port,
    user: requiredEnvironment("DB_USER"),
    password: requiredEnvironment("DB_PASSWORD"),
    database: requiredEnvironment("DB_NAME"),
  };
}

function normalizeSql(sql: string) {
  const trimmed = sql.trim();
  if (/^INSERT INTO cms_documents\b/i.test(trimmed) && /ON CONFLICT\(id\) DO NOTHING$/i.test(trimmed)) {
    return trimmed
      .replace(/^INSERT INTO/i, "INSERT IGNORE INTO")
      .replace(/\s+ON CONFLICT\(id\) DO NOTHING$/i, "");
  }
  return sql;
}

function isRuntimeSchemaStatement(sql: string) {
  return /^\s*CREATE\s+(?:TABLE|INDEX)\b/i.test(sql);
}

class MysqlStatement implements SqlStatement {
  private values: ExecuteValues[] = [];

  constructor(private readonly pool: Pool, private readonly sourceSql: string) {}

  bind(...values: unknown[]) {
    const statement = new MysqlStatement(this.pool, this.sourceSql);
    statement.values = values.map(sqlValue);
    return statement;
  }

  private async execute() {
    if (isRuntimeSchemaStatement(this.sourceSql)) return { rows: [], changes: 0 };
    const [result] = await this.pool.execute(normalizeSql(this.sourceSql), this.values);
    if (Array.isArray(result)) return { rows: result as RowDataPacket[], changes: 0 };
    return { rows: [], changes: (result as ResultSetHeader).affectedRows ?? 0 };
  }

  async run(): Promise<SqlRunResult> {
    const result = await this.execute();
    return { meta: { changes: result.changes } };
  }

  async all<T>(): Promise<SqlRows<T>> {
    const result = await this.execute();
    return { results: result.rows as T[] };
  }

  async first<T>(): Promise<T | null> {
    const result = await this.execute();
    return (result.rows[0] as T | undefined) ?? null;
  }
}

function sqlValue(value: unknown): ExecuteValues {
  if (value === undefined || value === null) return null;
  if (["string", "number", "bigint", "boolean"].includes(typeof value)) return value as string | number | bigint | boolean;
  if (value instanceof Date || value instanceof Uint8Array || Buffer.isBuffer(value) || value instanceof Blob) return value;
  throw new Error("An unsupported value was passed to the MySQL adapter.");
}

export class MysqlDatabase implements SqlDatabase {
  constructor(readonly pool: Pool) {}

  prepare(sql: string) {
    return new MysqlStatement(this.pool, sql);
  }

  async batch(statements: SqlStatement[]) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

export class MysqlObjectStore implements ObjectStore {
  constructor(private readonly database: SqlDatabase) {}

  async put(key: string, value: ReadableStream) {
    const bytes = new Uint8Array(await new Response(value).arrayBuffer());
    await this.database.prepare(
      "INSERT INTO contribution_file_blobs (object_key, content, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = VALUES(updated_at)",
    ).bind(key, Buffer.from(bytes), Math.floor(Date.now() / 1000)).run();
  }

  async get(key: string): Promise<StoredObject | null> {
    const row = await this.database.prepare("SELECT content FROM contribution_file_blobs WHERE object_key = ?")
      .bind(key).first<{ content: Buffer | Uint8Array }>();
    if (!row) return null;
    return { body: new Uint8Array(row.content) };
  }

  async delete(key: string) {
    await this.database.prepare("DELETE FROM contribution_file_blobs WHERE object_key = ?").bind(key).run();
  }
}

async function createSchema(pool: Pool) {
  for (const statement of SCHEMA_STATEMENTS) await pool.query(statement);
}

async function seedPublishedDocument(database: SqlDatabase) {
  const existing = await database.prepare("SELECT id FROM cms_documents WHERE id = 1").first<{ id: number }>();
  if (existing) return;
  const documentJson = JSON.stringify(publishedSeed.document);
  const timestamp = Math.floor(Date.now() / 1000);
  await database.prepare(
    "INSERT INTO cms_documents (id, draft_json, published_json, draft_version, published_version, updated_at) VALUES (1, ?, ?, ?, ?, ?)",
  ).bind(documentJson, documentJson, publishedSeed.version, publishedSeed.version, timestamp).run();
}

export type HostingerRuntime = {
  ADMIN_AUTH_MODE: "password";
  ADMIN_EMAILS: string;
  DB: MysqlDatabase;
  UPLOADS: MysqlObjectStore;
  pool: Pool;
};

let runtimePromise: Promise<HostingerRuntime> | undefined;

export function getHostingerRuntime() {
  runtimePromise ??= (async () => {
    const pool = createPool({
      ...databaseConfig(),
      charset: "utf8mb4",
      connectionLimit: 5,
      enableKeepAlive: true,
      idleTimeout: 60_000,
      maxIdle: 5,
      queueLimit: 20,
      timezone: "Z",
    });
    await createSchema(pool);
    const database = new MysqlDatabase(pool);
    await seedPublishedDocument(database);
    return {
      ADMIN_AUTH_MODE: "password" as const,
      ADMIN_EMAILS: requiredEnvironment("ADMIN_EMAILS"),
      DB: database,
      UPLOADS: new MysqlObjectStore(database),
      pool,
    };
  })();
  return runtimePromise;
}
