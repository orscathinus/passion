import {
  adminHeaders,
  adminUnauthorized,
  authorizedAdmin,
  json,
  loadMetadata,
  metadataKey,
  requireBucket,
  text,
} from "../../../_lib/contributions.js";

export async function onRequestPost(context) {
  const missingBucket = requireBucket(context.env);
  if (missingBucket) return adminHeaders(missingBucket);
  if (!authorizedAdmin(context.request, context.env)) return adminHeaders(adminUnauthorized());

  try {
    const body = await context.request.json();
    const submissionId = text(body?.submissionId, 1, 80, true);
    const status = ["new", "reviewed", "archived"].includes(body?.status) ? body.status : null;
    if (!status) throw new Error("Choose a valid review status.");

    const key = metadataKey(submissionId);
    const metadata = await loadMetadata(context.env.UPLOADS, key);
    if (!metadata) return adminHeaders(json({ error: "That submission could not be found." }, 404));
    metadata.status = status;
    metadata.updatedAt = Math.floor(Date.now() / 1000);
    await context.env.UPLOADS.put(key, JSON.stringify(metadata), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
    return adminHeaders(json({ ok: true }));
  } catch (error) {
    return adminHeaders(json({ error: error instanceof Error ? error.message : "The status could not be updated." }, 400));
  }
}

export function onRequest() {
  return adminHeaders(json({ error: "Method not allowed." }, 405, { Allow: "POST" }));
}
