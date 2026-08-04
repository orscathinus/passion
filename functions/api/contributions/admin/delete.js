import {
  adminHeaders,
  adminUnauthorized,
  authorizedAdmin,
  deleteSubmissionObjects,
  json,
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
    await deleteSubmissionObjects(context.env.UPLOADS, submissionId);
    return adminHeaders(json({ ok: true }));
  } catch (error) {
    return adminHeaders(json({ error: error instanceof Error ? error.message : "The submission could not be deleted." }, 400));
  }
}

export function onRequest() {
  return adminHeaders(json({ error: "Method not allowed." }, 405, { Allow: "POST" }));
}
