import {
  adminHeaders,
  adminUnauthorized,
  authorizedAdmin,
  json,
  listSubmissions,
  requireBucket,
} from "../../../../_lib/contributions.js";

export async function onRequestGet(context) {
  const missingBucket = requireBucket(context.env);
  if (missingBucket) return adminHeaders(missingBucket);
  if (!authorizedAdmin(context.request, context.env)) return adminHeaders(adminUnauthorized());

  const fileId = String(context.params?.id || "");
  if (!fileId || fileId.length > 80) return adminHeaders(json({ error: "That file could not be found." }, 404));

  try {
    const submissions = await listSubmissions(context.env.UPLOADS);
    let matchingFile = null;
    for (const submission of submissions) {
      matchingFile = Array.isArray(submission.files)
        ? submission.files.find((file) => file.id === fileId)
        : null;
      if (matchingFile) break;
    }
    if (!matchingFile?.key) return adminHeaders(json({ error: "That file could not be found." }, 404));

    const object = await context.env.UPLOADS.get(matchingFile.key);
    if (!object) return adminHeaders(json({ error: "The stored file is missing." }, 404));

    const headers = new Headers();
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(matchingFile.name || "contribution-file")}`);
    headers.set("Content-Type", matchingFile.contentType || "application/octet-stream");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(object.body, { headers });
  } catch {
    return adminHeaders(json({ error: "The file could not be downloaded." }, 500));
  }
}

export function onRequest() {
  return adminHeaders(json({ error: "Method not allowed." }, 405, { Allow: "GET" }));
}
