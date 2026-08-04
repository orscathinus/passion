import {
  adminHeaders,
  adminUnauthorized,
  authorizedAdmin,
  json,
  listSubmissions,
  requireBucket,
} from "../../../_lib/contributions.js";

export async function onRequestGet(context) {
  const missingBucket = requireBucket(context.env);
  if (missingBucket) return adminHeaders(missingBucket);
  if (!authorizedAdmin(context.request, context.env)) return adminHeaders(adminUnauthorized());

  try {
    const submissions = await listSubmissions(context.env.UPLOADS);
    return adminHeaders(json({ submissions }));
  } catch {
    return adminHeaders(json({ error: "The submissions could not be loaded." }, 500));
  }
}

export function onRequest() {
  return adminHeaders(json({ error: "Method not allowed." }, 405, { Allow: "GET" }));
}
