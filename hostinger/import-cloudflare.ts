import type { HostingerRuntime } from "./mysql";

type ExportManifest = {
  format: "allegorynow-cloudflare-export-v1";
  tables: Record<string, unknown[]>;
};

type TableDefinition = {
  columns: string[];
  keyColumns: string[];
  name: string;
};

const TABLES: Record<string, TableDefinition> = {
  cmsDocuments: {
    name: "cms_documents",
    columns: ["id", "draft_json", "published_json", "draft_version", "published_version", "updated_at"],
    keyColumns: ["id"],
  },
  cmsVersions: {
    name: "cms_versions",
    columns: ["id", "kind", "version", "document_json", "actor_email", "created_at"],
    keyColumns: ["id"],
  },
  adminCredentials: {
    name: "admin_credentials",
    columns: ["email", "salt", "password_hash", "iterations", "created_at", "updated_at"],
    keyColumns: ["email"],
  },
  auditLog: {
    name: "audit_log",
    columns: ["id", "actor_email", "action", "details", "created_at"],
    keyColumns: ["id"],
  },
  exhibitComments: {
    name: "exhibit_comments",
    columns: ["id", "exhibit_no", "parent_id", "author_name", "body", "status", "ip_hash", "created_at", "updated_at"],
    keyColumns: ["id"],
  },
  contributionSubmissions: {
    name: "contribution_submissions",
    columns: ["id", "contributor_name", "contributor_email", "mode", "claim_id", "position", "proposed_title", "proposed_statement", "evidence", "explanation", "status", "ip_hash", "created_at", "updated_at"],
    keyColumns: ["id"],
  },
  contributionFiles: {
    name: "contribution_files",
    columns: ["id", "submission_id", "object_key", "original_name", "content_type", "size_bytes", "created_at"],
    keyColumns: ["id"],
  },
};

export async function importCloudflareData(runtime: HostingerRuntime) {
  const sourceUrl = migrationSourceUrl();
  const token = requiredEnvironment("MIGRATION_TOKEN");
  const migrationId = "cloudflare-d1-r2-v1";
  const prior = await runtime.DB.prepare("SELECT id, imported_at, details FROM migration_imports WHERE id = ?")
    .bind(migrationId).first<{ details: string; id: string; imported_at: number }>();
  if (prior) return { alreadyImported: true, importedAt: prior.imported_at, details: JSON.parse(prior.details) };

  const response = await fetch(`${sourceUrl}/api/_migration/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Cloudflare export failed with HTTP ${response.status}.`);
  const manifest = await response.json() as ExportManifest;
  if (manifest.format !== "allegorynow-cloudflare-export-v1" || !manifest.tables || typeof manifest.tables !== "object") {
    throw new Error("Cloudflare returned an unsupported migration export.");
  }

  const counts: Record<string, number> = {};
  for (const [manifestName, definition] of Object.entries(TABLES)) {
    const rows = Array.isArray(manifest.tables[manifestName]) ? manifest.tables[manifestName] : [];
    counts[manifestName] = rows.length;
    for (const row of rows) await upsertRow(runtime, definition, row);
  }

  const files = Array.isArray(manifest.tables.contributionFiles) ? manifest.tables.contributionFiles : [];
  let fileCount = 0;
  for (const candidate of files) {
    const row = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : null;
    const id = typeof row?.id === "string" ? row.id : "";
    const objectKey = typeof row?.object_key === "string" ? row.object_key : "";
    if (!id || !objectKey) throw new Error("A contribution file record in the migration export is invalid.");
    const fileResponse = await fetch(`${sourceUrl}/api/_migration/file/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fileResponse.ok || !fileResponse.body) throw new Error(`Could not transfer contribution file ${id}.`);
    await runtime.UPLOADS.put(objectKey, fileResponse.body);
    fileCount += 1;
  }

  const details = { ...counts, fileBlobs: fileCount };
  await runtime.DB.prepare("INSERT INTO migration_imports (id, imported_at, source_url, details) VALUES (?, ?, ?, ?)")
    .bind(migrationId, Math.floor(Date.now() / 1000), sourceUrl, JSON.stringify(details)).run();
  return { alreadyImported: false, details };
}

async function upsertRow(runtime: HostingerRuntime, definition: TableDefinition, candidate: unknown) {
  if (!candidate || typeof candidate !== "object") throw new Error(`Invalid ${definition.name} row in migration export.`);
  const row = candidate as Record<string, unknown>;
  const values = definition.columns.map((column) => row[column] ?? null);
  const updateColumns = definition.columns.filter((column) => !definition.keyColumns.includes(column));
  const sql = [
    `INSERT INTO ${definition.name} (${definition.columns.join(", ")})`,
    `VALUES (${definition.columns.map(() => "?").join(", ")})`,
    `ON DUPLICATE KEY UPDATE ${updateColumns.map((column) => `${column} = VALUES(${column})`).join(", ")}`,
  ].join(" ");
  await runtime.DB.prepare(sql).bind(...values).run();
}

function migrationSourceUrl() {
  const source = requiredEnvironment("MIGRATION_SOURCE_URL").replace(/\/+$/, "");
  const url = new URL(source);
  if (url.protocol !== "https:") throw new Error("MIGRATION_SOURCE_URL must use HTTPS.");
  return url.origin;
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required migration environment variable: ${name}`);
  return value;
}

export function migrationRequestAuthorized(request: Request) {
  const expected = process.env.MIGRATION_TOKEN ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected) return false;
  const length = Math.max(supplied.length, expected.length);
  let difference = supplied.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (supplied.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}
