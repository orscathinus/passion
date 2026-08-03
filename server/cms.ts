import { defaultCmsDocument, type CmsDocument } from "../app/data/cms";
import { derivePassword } from "./password";

export type CmsEnv = {
  ADMIN_EMAILS?: string;
  DB: D1Database;
};

type SessionRow = {
  csrf_token: string;
  email: string;
  expires_at: number;
  token_hash: string;
};

type DocumentRow = {
  draft_json: string;
  draft_version: number;
  published_json: string;
  published_version: number;
};

const COOKIE_NAME = "__Host-allegory_admin";
const SESSION_SECONDS = 60 * 60;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_LOGIN_FAILURES = 5;
const PASSWORD_ITERATIONS = 180_000;
const MAX_BODY_BYTES = 900_000;
const PUBLIC_ORIGINS = new Set([
  "https://orscathinus.github.io",
  "https://passion-4mg.pages.dev",
]);

export async function handleCmsRequest(request: Request, env: CmsEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/cms/")) return null;

  try {
    await ensureDatabase(env.DB);

    if (url.pathname === "/api/cms/public" && request.method === "GET") {
      return publicDocument(request, env.DB);
    }

    if (!url.pathname.startsWith("/api/cms/admin/")) {
      return json({ error: "Not found." }, 404);
    }

    const identity = requireAdminIdentity(request, env);
    if (identity instanceof Response) return identity;

    if (url.pathname === "/api/cms/admin/state" && request.method === "GET") {
      return adminState(request, env.DB, identity);
    }
    if (url.pathname === "/api/cms/admin/setup-password" && request.method === "POST") {
      return setupPassword(request, env.DB, identity);
    }
    if (url.pathname === "/api/cms/admin/login" && request.method === "POST") {
      return login(request, env.DB, identity);
    }
    if (url.pathname === "/api/cms/admin/save-draft" && request.method === "POST") {
      return saveDraft(request, env.DB, identity);
    }
    if (url.pathname === "/api/cms/admin/publish" && request.method === "POST") {
      return publish(request, env.DB, identity);
    }
    if (url.pathname === "/api/cms/admin/logout" && request.method === "POST") {
      return logout(request, env.DB, identity);
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    const message = error instanceof CmsValidationError ? error.message : "The editor service could not complete that request.";
    const status = error instanceof CmsValidationError ? 400 : 500;
    return json({ error: message }, status);
  }
}

export function applyAdminSecurityHeaders(request: Request, response: Response): Response {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/cms/admin/")) return response;

  const secured = new Response(response.body, response);
  secured.headers.set("Cache-Control", "no-store");
  secured.headers.set("Content-Security-Policy", "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  secured.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  secured.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  secured.headers.set("Referrer-Policy", "no-referrer");
  secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  return secured;
}

async function ensureDatabase(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS cms_documents (id INTEGER PRIMARY KEY, draft_json TEXT NOT NULL, published_json TEXT NOT NULL, draft_version INTEGER NOT NULL DEFAULT 1, published_version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS cms_versions (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, version INTEGER NOT NULL, document_json TEXT NOT NULL, actor_email TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS cms_versions_created_idx ON cms_versions (created_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS admin_credentials (email TEXT PRIMARY KEY, salt TEXT NOT NULL, password_hash TEXT NOT NULL, iterations INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions (expires_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_hash TEXT NOT NULL, success INTEGER NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS login_attempts_subject_idx ON login_attempts (subject_hash, created_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_email TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at)"),
  ]);

  const defaults = JSON.stringify(defaultCmsDocument);
  await db.prepare("INSERT INTO cms_documents (id, draft_json, published_json, draft_version, published_version, updated_at) VALUES (1, ?, ?, 1, 1, ?) ON CONFLICT(id) DO NOTHING")
    .bind(defaults, defaults, now()).run();
  await db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(now()).run();
  await db.prepare("DELETE FROM login_attempts WHERE created_at <= ?").bind(now() - 86400).run();
}

async function publicDocument(request: Request, db: D1Database) {
  const row = await documentRow(db);
  const response = json({ document: safeStoredDocument(row.published_json), version: row.published_version }, 200, {
    "Cache-Control": "no-store",
  });
  const origin = request.headers.get("Origin");
  if (origin && PUBLIC_ORIGINS.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return response;
}

function requireAdminIdentity(request: Request, env: CmsEnv): string | Response {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) {
    const returnTo = encodeURIComponent("/admin/index.html");
    return json({ code: "SIGN_IN_REQUIRED", signInUrl: `/signin-with-chatgpt?return_to=${returnTo}` }, 401);
  }

  const allowed = new Set((env.ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  if (!allowed.size) return json({ error: "Administrator access has not been configured." }, 503);
  if (!allowed.has(email)) return json({ error: "This account is not authorized to administer AllegoryNow." }, 403);
  return email;
}

async function adminState(request: Request, db: D1Database, email: string) {
  const session = await findSession(request, db, email);
  const credential = await db.prepare("SELECT email FROM admin_credentials WHERE email = ?").bind(email).first<{ email: string }>();
  if (!session) return json({ authenticated: false, needsSetup: !credential });

  const row = await documentRow(db);
  return json({
    authenticated: true,
    csrfToken: session.csrf_token,
    document: safeStoredDocument(row.draft_json),
    draftVersion: row.draft_version,
    publishedVersion: row.published_version,
  });
}

async function setupPassword(request: Request, db: D1Database, email: string) {
  requireSameOrigin(request);
  const existing = await db.prepare("SELECT email FROM admin_credentials WHERE email = ?").bind(email).first();
  if (existing) return json({ error: "The administrator password has already been created." }, 409);

  const body = await readBody<{ password?: unknown }>(request);
  const password = requireStrongPassword(body.password);
  const salt = randomToken(24);
  const passwordHash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  const timestamp = now();
  await db.prepare("INSERT INTO admin_credentials (email, salt, password_hash, iterations, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(email, salt, passwordHash, PASSWORD_ITERATIONS, timestamp, timestamp).run();
  await audit(db, email, "password_setup", "Initial administrator password created");
  return createSessionResponse(db, email, 201);
}

async function login(request: Request, db: D1Database, email: string) {
  requireSameOrigin(request);
  const body = await readBody<{ password?: unknown }>(request);
  const password = typeof body.password === "string" ? body.password : "";
  const subjectHash = await sha256(`${email}|${request.headers.get("cf-connecting-ip") ?? "unknown"}`);
  const since = now() - LOGIN_WINDOW_SECONDS;
  const failures = await db.prepare("SELECT COUNT(*) AS count FROM login_attempts WHERE subject_hash = ? AND success = 0 AND created_at > ?")
    .bind(subjectHash, since).first<{ count: number }>();
  if ((failures?.count ?? 0) >= MAX_LOGIN_FAILURES) {
    return json({ error: "Too many unsuccessful attempts. Try again in 15 minutes." }, 429, { "Retry-After": "900" });
  }

  const credential = await db.prepare("SELECT salt, password_hash, iterations FROM admin_credentials WHERE email = ?")
    .bind(email).first<{ salt: string; password_hash: string; iterations: number }>();
  const candidate = credential ? await derivePassword(password, credential.salt, credential.iterations) : await derivePassword(password, randomToken(24), PASSWORD_ITERATIONS);
  const valid = Boolean(credential && constantTimeEqual(candidate, credential.password_hash));
  await db.prepare("INSERT INTO login_attempts (subject_hash, success, created_at) VALUES (?, ?, ?)").bind(subjectHash, valid ? 1 : 0, now()).run();
  if (!valid) return json({ error: "The password is incorrect." }, 401);

  await db.prepare("DELETE FROM login_attempts WHERE subject_hash = ?").bind(subjectHash).run();
  await audit(db, email, "login", "Administrator signed in");
  return createSessionResponse(db, email);
}

async function saveDraft(request: Request, db: D1Database, email: string) {
  requireSameOrigin(request);
  const session = await requireSessionAndCsrf(request, db, email);
  if (session instanceof Response) return session;
  const body = await readBody<{ document?: unknown; expectedDraftVersion?: unknown }>(request);
  const document = normalizeDocument(body.document);
  const expected = requireVersion(body.expectedDraftVersion);
  const row = await documentRow(db);
  if (row.draft_version !== expected) return json({ error: "Another edit was saved first. Reload before saving again." }, 409);

  const nextVersion = expected + 1;
  const updated = await db.prepare("UPDATE cms_documents SET draft_json = ?, draft_version = ?, updated_at = ? WHERE id = 1 AND draft_version = ?")
    .bind(JSON.stringify(document), nextVersion, now(), expected).run();
  if (!updated.meta.changes) return json({ error: "The draft changed before this save completed. Reload and try again." }, 409);
  await db.prepare("INSERT INTO cms_versions (kind, version, document_json, actor_email, created_at) VALUES ('draft', ?, ?, ?, ?)")
    .bind(expected, row.draft_json, email, now()).run();
  await audit(db, email, "save_draft", `Draft version ${nextVersion}`);
  return json({ ok: true, draftVersion: nextVersion, csrfToken: session.csrf_token });
}

async function publish(request: Request, db: D1Database, email: string) {
  requireSameOrigin(request);
  const session = await requireSessionAndCsrf(request, db, email);
  if (session instanceof Response) return session;
  const body = await readBody<{ expectedDraftVersion?: unknown }>(request);
  const expected = requireVersion(body.expectedDraftVersion);
  const row = await documentRow(db);
  if (row.draft_version !== expected) return json({ error: "The draft changed before publication. Reload and review it again." }, 409);

  const nextPublished = row.published_version + 1;
  const updated = await db.prepare("UPDATE cms_documents SET published_json = draft_json, published_version = ?, updated_at = ? WHERE id = 1 AND draft_version = ? AND published_version = ?")
    .bind(nextPublished, now(), expected, row.published_version).run();
  if (!updated.meta.changes) return json({ error: "Publication state changed. Reload and try again." }, 409);
  await db.prepare("INSERT INTO cms_versions (kind, version, document_json, actor_email, created_at) VALUES ('published', ?, ?, ?, ?)")
    .bind(row.published_version, row.published_json, email, now()).run();
  await audit(db, email, "publish", `Published version ${nextPublished} from draft ${expected}`);
  return json({ ok: true, publishedVersion: nextPublished, csrfToken: session.csrf_token });
}

async function logout(request: Request, db: D1Database, email: string) {
  requireSameOrigin(request);
  const session = await requireSessionAndCsrf(request, db, email);
  if (session instanceof Response) return session;
  await db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(session.token_hash).run();
  const response = json({ ok: true });
  response.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  return response;
}

async function requireSessionAndCsrf(request: Request, db: D1Database, email: string): Promise<SessionRow | Response> {
  const session = await findSession(request, db, email);
  if (!session) return json({ error: "Your administrator session expired. Sign in again." }, 401);
  const supplied = request.headers.get("x-allegory-csrf") ?? "";
  if (!constantTimeEqual(supplied, session.csrf_token)) return json({ error: "The security token is invalid. Reload the editor." }, 403);
  return session;
}

async function findSession(request: Request, db: D1Database, email: string): Promise<SessionRow | null> {
  const rawToken = readCookie(request.headers.get("Cookie") ?? "", COOKIE_NAME);
  if (!rawToken) return null;
  const tokenHash = await sha256(rawToken);
  const session = await db.prepare("SELECT token_hash, email, csrf_token, expires_at FROM admin_sessions WHERE token_hash = ? AND email = ? AND expires_at > ?")
    .bind(tokenHash, email, now()).first<SessionRow>();
  if (!session) return null;
  await db.prepare("UPDATE admin_sessions SET last_seen_at = ? WHERE token_hash = ?").bind(now(), tokenHash).run();
  return session;
}

async function createSessionResponse(db: D1Database, email: string, status = 200) {
  const rawToken = randomToken(32);
  const tokenHash = await sha256(rawToken);
  const csrfToken = randomToken(24);
  const timestamp = now();
  await db.prepare("INSERT INTO admin_sessions (token_hash, email, csrf_token, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(tokenHash, email, csrfToken, timestamp + SESSION_SECONDS, timestamp, timestamp).run();
  const row = await documentRow(db);
  const response = json({ authenticated: true, csrfToken, document: safeStoredDocument(row.draft_json), draftVersion: row.draft_version, publishedVersion: row.published_version }, status);
  response.headers.append("Set-Cookie", `${COOKIE_NAME}=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`);
  return response;
}

async function documentRow(db: D1Database): Promise<DocumentRow> {
  const row = await db.prepare("SELECT draft_json, published_json, draft_version, published_version FROM cms_documents WHERE id = 1").first<DocumentRow>();
  if (!row) throw new Error("CMS document is unavailable");
  return row;
}

function safeStoredDocument(value: string): CmsDocument {
  try { return normalizeDocument(JSON.parse(value)); } catch { return defaultCmsDocument; }
}

function normalizeDocument(value: unknown): CmsDocument {
  if (!isRecord(value) || value.schemaVersion !== 1) throw new CmsValidationError("The draft format is invalid.");
  const section = <T extends Record<string, string>>(key: keyof CmsDocument, template: T): T => {
    const input = value[key];
    if (!isRecord(input)) throw new CmsValidationError(`The ${String(key)} section is invalid.`);
    return Object.fromEntries(Object.keys(template).map((field) => [field, text(input[field], `${String(key)}.${field}`, 12_000)])) as T;
  };

  const supportsInput = value.supports;
  if (!Array.isArray(supportsInput) || supportsInput.length > 100) throw new CmsValidationError("Supports must be a list of no more than 100 entries.");
  const supports = supportsInput.map((item, index) => {
    if (!isRecord(item)) throw new CmsValidationError(`Support ${index + 1} is invalid.`);
    return { id: text(item.id, "support id", 20), title: text(item.title, "support title", 250), description: text(item.description, "support description", 2_000) };
  });
  unique(supports.map((item) => item.id), "support IDs");

  const claimsInput = value.claims;
  if (!Array.isArray(claimsInput) || !claimsInput.length || claimsInput.length > 200) throw new CmsValidationError("Claims must contain between 1 and 200 entries.");
  const claims = claimsInput.map((item, index) => {
    if (!isRecord(item)) throw new CmsValidationError(`Claim ${index + 1} is invalid.`);
    const id = text(item.id, "claim id", 12);
    if (!/^\d+$/.test(id)) throw new CmsValidationError(`Claim ${id || index + 1} needs a numeric ID.`);
    if (String(Number(id)) !== id) throw new CmsValidationError(`Claim ${id} cannot contain leading zeroes.`);
    const level = text(item.level, `claim ${id} level`, 20);
    if (!["Central", "Broader", "Focused", "Specific"].includes(level)) throw new CmsValidationError(`Claim ${id} has an invalid level.`);
    if (!Array.isArray(item.supportIds) || item.supportIds.length > 50) throw new CmsValidationError(`Claim ${id} has invalid supports.`);
    if (!Array.isArray(item.evidence) || item.evidence.length > 100) throw new CmsValidationError(`Claim ${id} has invalid evidence.`);
    const supportIds = item.supportIds.map((entry) => text(entry, `claim ${id} support`, 20));
    const evidence = item.evidence.map((entry, evidenceIndex) => {
      if (!isRecord(entry)) throw new CmsValidationError(`Claim ${id}, evidence ${evidenceIndex + 1} is invalid.`);
      const href = text(entry.href, `claim ${id} evidence link`, 2_000);
      validateLink(href, false);
      return { label: text(entry.label, `claim ${id} evidence label`, 300), href };
    });
    return {
      id,
      level: level as "Central" | "Broader" | "Focused" | "Specific",
      title: text(item.title, `claim ${id} title`, 500),
      statement: text(item.statement, `claim ${id} statement`, 6_000),
      argument: text(item.argument, `claim ${id} argument`, 8_000),
      supportIds,
      evidence,
      limitation: text(item.limitation, `claim ${id} limitation`, 8_000),
    };
  });
  unique(claims.map((claim) => claim.id), "claim IDs");
  const knownClaims = new Set(claims.map((claim) => claim.id));
  const connectionsInput = value.connections ?? [];
  if (!Array.isArray(connectionsInput) || connectionsInput.length > 500) {
    throw new CmsValidationError("Claim connections must be a list of no more than 500 entries.");
  }
  const connections = connectionsInput.map((item, index) => {
    if (!isRecord(item)) throw new CmsValidationError(`Claim connection ${index + 1} is invalid.`);
    const from = text(item.from, `claim connection ${index + 1} starting claim`, 12);
    const to = text(item.to, `claim connection ${index + 1} destination claim`, 12);
    const thickness = item.thickness ?? 3;
    if (!knownClaims.has(from) || !knownClaims.has(to)) {
      throw new CmsValidationError(`Claim connection ${index + 1} refers to a missing claim.`);
    }
    if (from === to) throw new CmsValidationError(`Claim ${from} cannot connect to itself.`);
    if (typeof thickness !== "number" || !Number.isInteger(thickness) || thickness < 1 || thickness > 5) {
      throw new CmsValidationError(`Claim connection ${index + 1} needs a thickness from 1 to 5.`);
    }
    return { from, thickness, to };
  });
  unique(connections.map((connection) => `${connection.from}->${connection.to}`), "claim connections");
  const knownSupports = new Set(supports.map((support) => support.id));
  for (const claim of claims) {
    const missing = claim.supportIds.find((supportId) => !knownSupports.has(supportId));
    if (missing) throw new CmsValidationError(`Claim ${claim.id} refers to missing support ${missing}.`);
  }
  if (!claims.some((claim) => claim.level === "Central")) throw new CmsValidationError("At least one Central claim is required.");

  const qaInput = isRecord(value.qa) ? value.qa : null;
  if (!qaInput || !Array.isArray(qaInput.items) || qaInput.items.length > 100) throw new CmsValidationError("The Q&A list is invalid.");
  const qa = { ...section("qa", { eyebrow: "", title: "", lede: "" }), items: qaInput.items.map((item, index) => {
    if (!isRecord(item)) throw new CmsValidationError(`Q&A item ${index + 1} is invalid.`);
    return { question: text(item.question, `question ${index + 1}`, 1_000), answer: text(item.answer, `answer ${index + 1}`, 10_000) };
  }) };

  const exhibitsInput = isRecord(value.exhibits) ? value.exhibits : null;
  if (!exhibitsInput || !Array.isArray(exhibitsInput.items) || exhibitsInput.items.length > 200) throw new CmsValidationError("The exhibit list is invalid.");
  const exhibits = { ...section("exhibits", { eyebrow: "", title: "", lede: "" }), items: exhibitsInput.items.map((item, index) => {
    if (!isRecord(item)) throw new CmsValidationError(`Exhibit ${index + 1} is invalid.`);
    const href = text(item.href, `exhibit ${index + 1} link`, 2_000, true);
    validateLink(href, true);
    return {
      no: text(item.no, `exhibit ${index + 1} number`, 20),
      title: text(item.title, `exhibit ${index + 1} title`, 500),
      description: text(item.description, `exhibit ${index + 1} description`, 8_000),
      source: text(item.source, `exhibit ${index + 1} source`, 1_000),
      date: text(item.date, `exhibit ${index + 1} date`, 100),
      relatedClaims: text(item.relatedClaims, `exhibit ${index + 1} claims`, 500),
      href,
    };
  }) };
  unique(exhibits.items.map((item) => item.no), "exhibit numbers");

  const mission = section("mission", defaultCmsDocument.mission);
  if (mission.proposalEyebrow === "Project proposal") mission.proposalEyebrow = defaultCmsDocument.mission.proposalEyebrow;
  if (mission.proposalTitle === "Read the proposal") mission.proposalTitle = defaultCmsDocument.mission.proposalTitle;
  if (mission.proposalText === "The proposal is provided as a document and opens directly as a PDF.") mission.proposalText = defaultCmsDocument.mission.proposalText;
  if (mission.proposalButton === "Open proposal") mission.proposalButton = defaultCmsDocument.mission.proposalButton;

  return {
    schemaVersion: 1,
    site: section("site", defaultCmsDocument.site),
    home: section("home", defaultCmsDocument.home),
    mission,
    who: section("who", defaultCmsDocument.who),
    inquiry: section("inquiry", defaultCmsDocument.inquiry),
    supports,
    claims,
    connections,
    exhibits,
    qa,
    contact: section("contact", defaultCmsDocument.contact),
  };
}

function validateLink(value: string, allowEmpty: boolean) {
  if (!value && allowEmpty) return;
  if (value.startsWith("/")) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return;
  } catch { /* handled below */ }
  throw new CmsValidationError("Links must use https://, http://, or a site-relative /path.");
}

function text(value: unknown, label: string, maximum: number, allowEmpty = false) {
  if (typeof value !== "string") throw new CmsValidationError(`${label} must be text.`);
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!allowEmpty && !normalized) throw new CmsValidationError(`${label} cannot be empty.`);
  if (normalized.length > maximum) throw new CmsValidationError(`${label} is too long.`);
  return normalized;
}

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new CmsValidationError(`${label} must be unique.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requireVersion(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1) throw new CmsValidationError("The draft version is invalid.");
  return Number(value);
}

function requireStrongPassword(value: unknown) {
  if (typeof value !== "string" || value.length < 16 || value.length > 128) throw new CmsValidationError("Use a password between 16 and 128 characters.");
  const categories = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
  const passphrase = value.trim().split(/\s+/).length >= 4;
  if (categories < 3 && !passphrase) throw new CmsValidationError("Use a four-word passphrase or a mix of letters, numbers, and symbols.");
  return value;
}

async function readBody<T>(request: Request): Promise<T> {
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new CmsValidationError("The draft is too large.");
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) throw new CmsValidationError("Requests must use JSON.");
  const value = await request.json() as T;
  if (JSON.stringify(value).length > MAX_BODY_BYTES) throw new CmsValidationError("The draft is too large.");
  return value;
}

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) throw new CmsValidationError("This request did not come from the administrator page.");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

function randomToken(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
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

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", ...headers } });
}

function now() { return Math.floor(Date.now() / 1000); }

class CmsValidationError extends Error {}
