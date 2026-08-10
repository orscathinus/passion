import type { ObjectStore, SqlDatabase } from "./persistence";

export type MigrationExportEnv = {
  DB: SqlDatabase;
  MIGRATION_TOKEN?: string;
  UPLOADS: ObjectStore;
};

const TABLE_QUERIES = {
  cmsDocuments: "SELECT id, draft_json, published_json, draft_version, published_version, updated_at FROM cms_documents",
  cmsVersions: "SELECT id, kind, version, document_json, actor_email, created_at FROM cms_versions ORDER BY id ASC",
  adminCredentials: "SELECT email, salt, password_hash, iterations, created_at, updated_at FROM admin_credentials",
  auditLog: "SELECT id, actor_email, action, details, created_at FROM audit_log ORDER BY id ASC",
  exhibitComments: "SELECT id, exhibit_no, parent_id, author_name, body, status, ip_hash, created_at, updated_at FROM exhibit_comments ORDER BY created_at ASC, id ASC",
  contributionSubmissions: "SELECT id, contributor_name, contributor_email, mode, claim_id, position, proposed_title, proposed_statement, evidence, explanation, status, ip_hash, created_at, updated_at FROM contribution_submissions ORDER BY created_at ASC, id ASC",
  contributionFiles: "SELECT id, submission_id, object_key, original_name, content_type, size_bytes, created_at FROM contribution_files ORDER BY created_at ASC, id ASC",
} as const;

export async function handleMigrationExport(request: Request, env: MigrationExportEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/_migration/")) return null;
  if (!env.MIGRATION_TOKEN) return json({ error: "Not found." }, 404);
  if (!authorized(request, env.MIGRATION_TOKEN)) return json({ error: "Not found." }, 404);

  if (url.pathname === "/api/_migration/export" && request.method === "GET") {
    const tableEntries = await Promise.all(Object.entries(TABLE_QUERIES).map(async ([name, sql]) => {
      try {
        const result = await env.DB.prepare(sql).all<Record<string, unknown>>();
        return [name, result.results ?? []] as const;
      } catch {
        return [name, []] as const;
      }
    }));
    return json({
      format: "allegorynow-cloudflare-export-v1",
      exportedAt: Math.floor(Date.now() / 1000),
      tables: Object.fromEntries(tableEntries),
    });
  }

  const filePrefix = "/api/_migration/file/";
  if (url.pathname.startsWith(filePrefix) && request.method === "GET") {
    const fileId = decodeURIComponent(url.pathname.slice(filePrefix.length));
    if (!fileId || fileId.length > 80) return json({ error: "Not found." }, 404);
    const row = await env.DB.prepare("SELECT object_key, content_type, size_bytes FROM contribution_files WHERE id = ?")
      .bind(fileId).first<{ content_type: string; object_key: string; size_bytes: number }>();
    if (!row) return json({ error: "Not found." }, 404);
    const object = await env.UPLOADS.get(row.object_key);
    if (!object) return json({ error: "Stored file missing." }, 404);
    return new Response(object.body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Length": String(row.size_bytes),
        "Content-Type": row.content_type || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return json({ error: "Not found." }, 404);
}

function authorized(request: Request, expected: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const length = Math.max(supplied.length, expected.length);
  let difference = supplied.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (supplied.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
