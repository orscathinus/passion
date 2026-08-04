const MAX_FILES = 5;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "webp", "txt", "md", "csv",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
]);

export function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export function requireBucket(env) {
  if (!env?.UPLOADS) {
    return json({
      error: "Contribution storage is not configured. Add an R2 binding named UPLOADS to this Cloudflare Pages project, then redeploy.",
    }, 503);
  }
  return null;
}

export function text(value, minimum, maximum, singleLine) {
  if (value === null || value === undefined) {
    if (minimum === 0) return "";
    throw new Error("Complete all required fields.");
  }
  if (typeof value !== "string") throw new Error("A form field was not valid text.");
  const withoutControls = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const normalized = (singleLine ? withoutControls.replace(/\s+/g, " ") : withoutControls.replace(/\r\n/g, "\n")).trim();
  if (normalized.length < minimum) throw new Error("Complete all required fields.");
  if (normalized.length > maximum) throw new Error("One of the fields is too long.");
  return normalized;
}

export function emailText(value) {
  const email = text(value, 0, 200, true);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address or leave it blank.");
  }
  return email;
}

export function safeFilename(name) {
  const normalized = (name || "file")
    .normalize("NFKC")
    .replace(/[\\/]/g, "-")
    .replace(/[^a-zA-Z0-9._() -]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (normalized || "file").slice(0, 180);
}

export function collectAndValidateFiles(form) {
  const files = form.getAll("files").filter((entry) => entry instanceof File && entry.size > 0);
  if (files.length > MAX_FILES) throw new Error(`Upload no more than ${MAX_FILES} files.`);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error("The combined files are too large. Keep the total under 40 MB.");

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name || "A file"} is larger than 20 MB.`);
    const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error(`${file.name || "That file"} is not an accepted research-file type.`);
    }
  }
  return files;
}

export function metadataKey(submissionId) {
  return `contributions/${submissionId}/submission.json`;
}

export function fileKey(submissionId, fileId, name) {
  return `contributions/${submissionId}/files/${fileId}-${safeFilename(name)}`;
}

export async function loadMetadata(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return null;
  try {
    return await object.json();
  } catch {
    return null;
  }
}

export async function listSubmissions(bucket) {
  const metadataKeys = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix: "contributions/", cursor, limit: 1000 });
    for (const object of page.objects) {
      if (object.key.endsWith("/submission.json")) metadataKeys.push(object.key);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const submissions = [];
  for (let index = 0; index < metadataKeys.length; index += 25) {
    const group = metadataKeys.slice(index, index + 25);
    const records = await Promise.all(group.map((key) => loadMetadata(bucket, key)));
    for (const record of records) if (record) submissions.push(record);
  }
  submissions.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  return submissions;
}

export async function deleteSubmissionObjects(bucket, submissionId) {
  const keys = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix: `contributions/${submissionId}/`, cursor, limit: 1000 });
    keys.push(...page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  if (keys.length) await bucket.delete(keys);
}

export function authorizedAdmin(request, env) {
  const configuredToken = typeof env?.CONTRIBUTIONS_ADMIN_TOKEN === "string"
    ? env.CONTRIBUTIONS_ADMIN_TOKEN.trim()
    : "";
  const authorization = request.headers.get("Authorization") || "";
  const suppliedToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (configuredToken && suppliedToken && constantTimeEqual(configuredToken, suppliedToken)) return true;

  const email = (request.headers.get("cf-access-authenticated-user-email") || "").trim().toLowerCase();
  const allowed = new Set(String(env?.ADMIN_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  return Boolean(email && allowed.has(email));
}

export function adminUnauthorized() {
  return json({
    error: "Administrator authorization is required. Configure CONTRIBUTIONS_ADMIN_TOKEN as a Cloudflare Pages secret or protect this route with Cloudflare Access.",
  }, 401, { "WWW-Authenticate": "Bearer" });
}

export function adminHeaders(response) {
  const secured = new Response(response.body, response);
  secured.headers.set("Cache-Control", "private, no-store");
  secured.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  secured.headers.set("Referrer-Policy", "no-referrer");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  return secured;
}

function constantTimeEqual(left, right) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}
