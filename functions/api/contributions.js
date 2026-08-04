import {
  collectAndValidateFiles,
  emailText,
  fileKey,
  json,
  metadataKey,
  requireBucket,
  safeFilename,
  text,
} from "../_lib/contributions.js";

export async function onRequestPost(context) {
  const missingBucket = requireBucket(context.env);
  if (missingBucket) return missingBucket;

  try {
    const form = await context.request.formData();
    if (text(form.get("website"), 0, 200, true)) return json({ ok: true }, 201);

    const modeValue = text(form.get("mode"), 1, 20, true);
    const mode = modeValue === "existing" || modeValue === "new" ? modeValue : null;
    if (!mode) throw new Error("Choose whether you are responding to a claim or proposing a new claim.");

    const contributorName = text(form.get("name"), 0, 100, true) || "Anonymous contributor";
    const contributorEmail = emailText(form.get("email"));
    const claimId = mode === "existing" ? text(form.get("claim"), 1, 20, true) : "";
    const position = mode === "existing" ? text(form.get("position"), 1, 20, true) : "";
    const proposedTitle = mode === "new" ? text(form.get("newClaimTitle"), 3, 160, true) : "";
    const proposedStatement = mode === "new" ? text(form.get("newClaimStatement"), 10, 4000, false) : "";
    const evidence = text(form.get("evidence"), 3, 12000, false);
    const explanation = text(form.get("explanation"), 3, 12000, false);
    if (form.get("privacyConfirmation") !== "yes") {
      throw new Error("Confirm that the submission contains no sealed records or identifying information about a child.");
    }

    const files = collectAndValidateFiles(form);
    const submissionId = crypto.randomUUID();
    const createdAt = Math.floor(Date.now() / 1000);
    const storedFiles = [];
    const uploadedKeys = [];

    try {
      for (const file of files) {
        const fileId = crypto.randomUUID();
        const originalName = safeFilename(file.name);
        const objectKey = fileKey(submissionId, fileId, originalName);
        await context.env.UPLOADS.put(objectKey, file.stream(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" },
          customMetadata: { submissionId, fileId, originalName },
        });
        uploadedKeys.push(objectKey);
        storedFiles.push({
          id: fileId,
          key: objectKey,
          name: originalName,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        });
      }

      const metadata = {
        id: submissionId,
        contributorName,
        contributorEmail,
        mode,
        claimId,
        position,
        proposedTitle,
        proposedStatement,
        evidence,
        explanation,
        status: "new",
        createdAt,
        updatedAt: createdAt,
        files: storedFiles,
      };
      await context.env.UPLOADS.put(metadataKey(submissionId), JSON.stringify(metadata), {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
      });
    } catch (storageError) {
      if (uploadedKeys.length) await context.env.UPLOADS.delete(uploadedKeys).catch(() => undefined);
      throw storageError;
    }

    return json({
      ok: true,
      receipt: submissionId.slice(0, 8).toUpperCase(),
      filesStored: storedFiles.length,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The contribution could not be submitted.";
    return json({ error: message }, 400);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { Allow: "POST, OPTIONS" } });
}

export function onRequest() {
  return json({ error: "Method not allowed." }, 405, { Allow: "POST, OPTIONS" });
}
