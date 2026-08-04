const COOKIE_NAME = "__Host-allegory_admin";
const MAX_FILES = 5;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const RATE_WINDOW_SECONDS = 60 * 60;
const RATE_MAXIMUM = 3;

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "webp", "txt", "md", "csv",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
]);

export type ContributionEnv = {
  ADMIN_EMAILS?: string;
  DB: D1Database;
  UPLOADS: R2Bucket;
};

type SessionRow = {
  csrf_token: string;
  email: string;
  expires_at: number;
  token_hash: string;
};

type SubmissionRow = {
  id: string;
  contributor_name: string;
  contributor_email: string;
  mode: "existing" | "new";
  claim_id: string;
  position: string;
  proposed_title: string;
  proposed_statement: string;
  evidence: string;
  explanation: string;
  status: "new" | "reviewed" | "archived";
  created_at: number;
};

type FileRow = {
  id: string;
  submission_id: string;
  object_key: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  created_at: number;
};

class ContributionValidationError extends Error {}

export function applyContributionAdminSecurityHeaders(request: Request, response: Response): Response {
  if (!new URL(request.url).pathname.startsWith("/api/contributions/admin")) return response;
  const secured = new Response(response.body, response);
  secured.headers.set("Cache-Control", "private, no-store");
  secured.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  secured.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  secured.headers.set("Referrer-Policy", "no-referrer");
  secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  return secured;
}

export async function handleContributionRequest(request: Request, env: ContributionEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/contributions")) return null;

  try {
    await ensureDatabase(env.DB);

    if (url.pathname === "/api/contributions" && request.method === "OPTIONS") {
      return publicCors(new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
      }));
    }

    if (url.pathname === "/api/contributions" && request.method === "POST") {
      return createContribution(request, env);
    }

    if (!url.pathname.startsWith("/api/contributions/admin")) {
      return json({ error: "Not found." }, 404);
    }

    const identity = requireAdminIdentity(request, env);
    if (identity instanceof Response) return identity;
    const session = await requireAdminSession(request, env.DB, identity, request.method !== "GET");
    if (session instanceof Response) return session;

    if (url.pathname === "/api/contributions/admin" && request.method === "GET") {
      return listContributions(env.DB, session.csrf_token);
    }

    const filePrefix = "/api/contributions/admin/file/";
    if (url.pathname.startsWith(filePrefix) && request.method === "GET") {
      return downloadFile(env, decodeURIComponent(url.pathname.slice(filePrefix.length)));
    }

    if (url.pathname === "/api/contributions/admin/status" && request.method === "POST") {
      return updateStatus(request, env.DB, identity, session.csrf_token);
    }

    if (url.pathname === "/api/contributions/admin/delete" && request.method === "POST") {
      return deleteContribution(request, env, identity, session.csrf_token);
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    const message = error instanceof ContributionValidationError
      ? error.message
      : "The contribution service could not complete that request.";
    const response = json({ error: message }, error instanceof ContributionValidationError ? 400 : 500);
    return url.pathname === "/api/contributions" ? publicCors(response) : response;
  }
}

async function ensureDatabase(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions (expires_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_email TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS contribution_submissions (id TEXT PRIMARY KEY, contributor_name TEXT NOT NULL, contributor_email TEXT NOT NULL, mode TEXT NOT NULL, claim_id TEXT NOT NULL, position TEXT NOT NULL, proposed_title TEXT NOT NULL, proposed_statement TEXT NOT NULL, evidence TEXT NOT NULL, explanation TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS contribution_submissions_created_idx ON contribution_submissions (created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS contribution_submissions_status_idx ON contribution_submissions (status, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS contribution_submissions_ip_idx ON contribution_submissions (ip_hash, created_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS contribution_files (id TEXT PRIMARY KEY, submission_id TEXT NOT NULL, object_key TEXT NOT NULL, original_name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS contribution_files_submission_idx ON contribution_files (submission_id, created_at)"),
  ]);
}

async function createContribution(request: Request, env: ContributionEnv) {
  const form = await request.formData();
  if (text(form.get("website"), 0, 200, true)) return publicCors(json({ ok: true }, 201));

  const modeValue = text(form.get("mode"), 1, 20, true);
  const mode = modeValue === "existing" || modeValue === "new" ? modeValue : null;
  if (!mode) throw new ContributionValidationError("Choose whether you are responding to a claim or proposing a new claim.");

  const contributorName = text(form.get("name"), 0, 100, true) || "Anonymous contributor";
  const contributorEmail = emailText(form.get("email"));
  const claimId = mode === "existing" ? text(form.get("claim"), 1, 20, true) : "";
  const position = mode === "existing" ? text(form.get("position"), 1, 20, true) : "";
  const proposedTitle = mode === "new" ? text(form.get("newClaimTitle"), 3, 160, true) : "";
  const proposedStatement = mode === "new" ? text(form.get("newClaimStatement"), 10, 4_000, false) : "";
  const evidence = text(form.get("evidence"), 3, 12_000, false);
  const explanation = text(form.get("explanation"), 3, 12_000, false);
  const confirmed = form.get("privacyConfirmation") === "yes";
  if (!confirmed) throw new ContributionValidationError("Confirm that the submission contains no sealed records or identifying information about a child.");

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > MAX_FILES) throw new ContributionValidationError(`Upload no more than ${MAX_FILES} files.`);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) throw new ContributionValidationError("The combined files are too large. Keep the total under 40 MB.");
  files.forEach(validateFile);

  const visitorAddress = request.headers.get("cf-connecting-ip") ?? "unknown";
  const visitorAgent = (request.headers.get("user-agent") ?? "unknown").slice(0, 200);
  const ipHash = await sha256(`contribution|${visitorAddress}|${visitorAgent}`);
  const timestamp = now();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS count FROM contribution_submissions WHERE ip_hash = ? AND created_at > ?")
    .bind(ipHash, timestamp - RATE_WINDOW_SECONDS).first<{ count: number }>();
  if ((recent?.count ?? 0) >= RATE_MAXIMUM) {
    return publicCors(json({ error: "Several contributions were submitted from this connection recently. Please try again in about an hour." }, 429, { "Retry-After": String(RATE_WINDOW_SECONDS) }));
  }

  const submissionId = crypto.randomUUID();
  const uploadedKeys: string[] = [];

  try {
    await env.DB.prepare("INSERT INTO contribution_submissions (id, contributor_name, contributor_email, mode, claim_id, position, proposed_title, proposed_statement, evidence, explanation, status, ip_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)")
      .bind(submissionId, contributorName, contributorEmail, mode, claimId, position, proposedTitle, proposedStatement, evidence, explanation, ipHash, timestamp, timestamp).run();

    for (const file of files) {
      const fileId = crypto.randomUUID();
      const safeName = safeFilename(file.name);
      const date = new Date(timestamp * 1000);
      const objectKey = `contributions/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${submissionId}/${fileId}-${safeName}`;
      await env.UPLOADS.put(objectKey, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
        customMetadata: { submissionId, fileId, originalName: safeName },
      });
      uploadedKeys.push(objectKey);
      await env.DB.prepare("INSERT INTO contribution_files (id, submission_id, object_key, original_name, content_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(fileId, submissionId, objectKey, safeName, file.type || "application/octet-stream", file.size, timestamp).run();
    }
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => env.UPLOADS.delete(key).catch(() => undefined)));
    await env.DB.prepare("DELETE FROM contribution_files WHERE submission_id = ?").bind(submissionId).run().catch(() => undefined);
    await env.DB.prepare("DELETE FROM contribution_submissions WHERE id = ?").bind(submissionId).run().catch(() => undefined);
    throw error;
  }

  return publicCors(json({
    ok: true,
    receipt: submissionId.slice(0, 8).toUpperCase(),
    filesStored: files.length,
  }, 201));
}

function validateFile(file: File) {
  if (file.size > MAX_FILE_BYTES) throw new ContributionValidationError(`${file.name || "A file"} is larger than 20 MB.`);
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new ContributionValidationError(`${file.name || "That file"} is not an accepted research-file type.`);
  }
}

async function listContributions(db: D1Database, csrfToken: string) {
  const submissionsResult = await db.prepare("SELECT id, contributor_name, contributor_email, mode, claim_id, position, proposed_title, proposed_statement, evidence, explanation, status, created_at FROM contribution_submissions ORDER BY created_at DESC LIMIT 200")
    .all<SubmissionRow>();
  const filesResult = await db.prepare("SELECT id, submission_id, object_key, original_name, content_type, size_bytes, created_at FROM contribution_files ORDER BY created_at ASC")
    .all<FileRow>();
  const filesBySubmission = new Map<string, FileRow[]>();
  for (const file of filesResult.results ?? []) {
    const collection = filesBySubmission.get(file.submission_id) ?? [];
    collection.push(file);
    filesBySubmission.set(file.submission_id, collection);
  }

  return json({
    csrfToken,
    submissions: (submissionsResult.results ?? []).map((row) => ({
      id: row.id,
      contributorName: row.contributor_name,
      contributorEmail: row.contributor_email,
      mode: row.mode,
      claimId: row.claim_id,
      position: row.position,
      proposedTitle: row.proposed_title,
      proposedStatement: row.proposed_statement,
      evidence: row.evidence,
      explanation: row.explanation,
      status: row.status,
      createdAt: row.created_at,
      files: (filesBySubmission.get(row.id) ?? []).map((file) => ({
        id: file.id,
        name: file.original_name,
        contentType: file.content_type,
        size: file.size_bytes,
      })),
    })),
  });
}

async function downloadFile(env: ContributionEnv, fileId: string) {
  if (!fileId || fileId.length > 80) return json({ error: "That file could not be found." }, 404);
  const row = await env.DB.prepare("SELECT id, object_key, original_name, content_type, size_bytes FROM contribution_files WHERE id = ?")
    .bind(fileId).first<Pick<FileRow, "id" | "object_key" | "original_name" | "content_type" | "size_bytes">>();
  if (!row) return json({ error: "That file could not be found." }, 404);
  const object = await env.UPLOADS.get(row.object_key);
  if (!object) return json({ error: "The stored file is missing." }, 404);

  const headers = new Headers();
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`);
  headers.set("Content-Length", String(row.size_bytes));
  headers.set("Content-Type", row.content_type || "application/octet-stream");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

async function updateStatus(request: Request, db: D1Database, email: string, csrfToken: string) {
  requireSameOrigin(request);
  const body = await readJson<{ submissionId?: unknown; status?: unknown }>(request);
  const submissionId = text(body.submissionId, 1, 80, true);
  const status = body.status === "new" || body.status === "reviewed" || body.status === "archived" ? body.status : null;
  if (!status) throw new ContributionValidationError("Choose a valid review status.");
  const updated = await db.prepare("UPDATE contribution_submissions SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, now(), submissionId).run();
  if (!updated.meta.changes) return json({ error: "That contribution could not be found." }, 404);
  await audit(db, email, "update_contribution_status", `${status} contribution ${submissionId}`);
  return json({ ok: true, csrfToken });
}

async function deleteContribution(request: Request, env: ContributionEnv, email: string, csrfToken: string) {
  requireSameOrigin(request);
  const body = await readJson<{ submissionId?: unknown }>(request);
  const submissionId = text(body.submissionId, 1, 80, true);
  const files = await env.DB.prepare("SELECT object_key FROM contribution_files WHERE submission_id = ?")
    .bind(submissionId).all<{ object_key: string }>();
  await Promise.all((files.results ?? []).map((file) => env.UPLOADS.delete(file.object_key)));
  await env.DB.prepare("DELETE FROM contribution_files WHERE submission_id = ?").bind(submissionId).run();
  const deleted = await env.DB.prepare("DELETE FROM contribution_submissions WHERE id = ?").bind(submissionId).run();
  if (!deleted.meta.changes) return json({ error: "That contribution could not be found." }, 404);
  await audit(env.DB, email, "delete_contribution", `Deleted contribution ${submissionId}`);
  return json({ ok: true, csrfToken });
}

function requireAdminIdentity(request: Request, env: ContributionEnv): string | Response {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) {
    const returnTo = encodeURIComponent("/admin/uploads.html");
    return json({ code: "SIGN_IN_REQUIRED", signInUrl: `/signin-with-chatgpt?return_to=${returnTo}` }, 401);
  }
  const allowed = new Set((env.ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  if (!allowed.size) return json({ error: "Administrator access has not been configured." }, 503);
  if (!allowed.has(email)) return json({ error: "This account is not authorized to administer AllegoryNow." }, 403);
  return email;
}

async function requireAdminSession(request: Request, db: D1Database, email: string, requireCsrf: boolean): Promise<SessionRow | Response> {
  const rawToken = readCookie(request.headers.get("Cookie") ?? "", COOKIE_NAME);
  if (!rawToken) return json({ error: "Unlock the website editor before reviewing contributions." }, 401);
  const tokenHash = await sha256(rawToken);
  const session = await db.prepare("SELECT token_hash, email, csrf_token, expires_at FROM admin_sessions WHERE token_hash = ? AND email = ? AND expires_at > ?")
    .bind(tokenHash, email, now()).first<SessionRow>();
  if (!session) return json({ error: "Your administrator session expired. Unlock the editor again." }, 401);
  if (requireCsrf) {
    requireSameOrigin(request);
    const supplied = request.headers.get("x-allegory-csrf") ?? "";
    if (!constantTimeEqual(supplied, session.csrf_token)) return json({ error: "The security token is invalid. Reload this page." }, 403);
  }
  await db.prepare("UPDATE admin_sessions SET last_seen_at = ? WHERE token_hash = ?").bind(now(), tokenHash).run();
  return session;
}

function text(value: FormDataEntryValue | unknown, minimum: number, maximum: number, singleLine: boolean) {
  if (value === null || value === undefined) {
    if (minimum === 0) return "";
    throw new ContributionValidationError("A required field is missing.");
  }
  if (typeof value !== "string") throw new ContributionValidationError("A form field was not valid text.");
  const withoutControls = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const normalized = (singleLine ? withoutControls.replace(/\s+/g, " ") : withoutControls.replace(/\r\n/g, "\n")).trim();
  if (normalized.length < minimum) throw new ContributionValidationError("Complete all required fields.");
  if (normalized.length > maximum) throw new ContributionValidationError("One of the fields is too long.");
  return normalized;
}

function emailText(value: FormDataEntryValue | null) {
  const email = text(value, 0, 200, true);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ContributionValidationError("Enter a valid email address or leave it blank.");
  return email;
}

function safeFilename(name: string) {
  const normalized = (name || "file").normalize("NFKC").replace(/[\\/]/g, "-").replace(/[^a-zA-Z0-9._() -]/g, "_").replace(/\s+/g, " ").trim();
  return (normalized || "file").slice(0, 180);
}

async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) throw new ContributionValidationError("Expected a JSON request.");
  return request.json() as Promise<T>;
}

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) throw new ContributionValidationError("This request did not come from the administrator page.");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

function readCookie(cookieHeader: string, name: string) {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

async function audit(db: D1Database, email: string, action: string, details: string) {
  await db.prepare("INSERT INTO audit_log (actor_email, action, details, created_at) VALUES (?, ?, ?, ?)").bind(email, action, details, now()).run();
}

function publicCors(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return response;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", ...headers } });
}

function now() { return Math.floor(Date.now() / 1000); }
