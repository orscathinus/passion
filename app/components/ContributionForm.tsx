"use client";

import { FormEvent, useState } from "react";
import { cmsApiUrl, useCmsDocument } from "./CmsProvider";

type ContributionResponse = {
  error?: string;
  filesStored?: number;
  receipt?: string;
};

export function ContributionForm() {
  const { claims: inquiryClaims } = useCmsDocument();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setNotice("Uploading files and securely submitting your contribution…");

    try {
      const response = await fetch(cmsApiUrl("/api/contributions"), {
        method: "POST",
        credentials: "omit",
        body: data,
      });
      const payload = await response.json().catch((): ContributionResponse => ({
        error: "The contribution service returned an unreadable response.",
      })) as ContributionResponse;
      if (!response.ok) throw new Error(payload.error || "The contribution could not be submitted.");

      const receipt = payload.receipt || "unavailable";
      const filesStored = typeof payload.filesStored === "number" ? payload.filesStored : 0;
      const storageMessage = filesStored
        ? `${filesStored} file${filesStored === 1 ? " was" : "s were"} stored privately for administrator review.`
        : "No files were attached.";
      setNotice(`Contribution received. Your receipt is ${receipt}. ${storageMessage}`);
      form.reset();
      setMode("existing");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The contribution could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="contribution-form" encType="multipart/form-data" onSubmit={submit}>
      <label>Your name <span>optional</span><input name="name" type="text" autoComplete="name" maxLength={100} /></label>
      <label>Email <span>optional; used only if the administrator needs to follow up</span><input name="email" type="email" autoComplete="email" maxLength={200} /></label>
      <label className="contribution-honeypot" aria-hidden="true">Website<input name="website" type="text" autoComplete="off" tabIndex={-1} /></label>

      <fieldset className="contribution-choice"><legend>What are you contributing?</legend><label><input checked={mode === "existing"} name="mode" onChange={() => setMode("existing")} type="radio" value="existing" /><span><b>Respond to a claim</b>Support or refute an existing numbered claim.</span></label><label><input checked={mode === "new"} name="mode" onChange={() => setMode("new")} type="radio" value="new" /><span><b>Propose a new claim</b>Submit a claim for administrator review.</span></label></fieldset>

      {mode === "existing" ? <div className="field-row"><label>Claim<select name="claim" required defaultValue=""><option value="" disabled>Select a claim</option>{inquiryClaims.map((claim) => <option key={claim.id} value={claim.id}>#{claim.id} · {claim.title}</option>)}</select></label><label>Your position<select name="position" required defaultValue="Support"><option>Support</option><option>Refute</option></select></label></div> : <><label>Proposed claim title<input name="newClaimTitle" required type="text" maxLength={160} placeholder="Short title" /></label><label>Proposed claim statement<textarea name="newClaimStatement" rows={4} required maxLength={4000} placeholder="State one specific, testable claim." /></label></>}

      <label>{mode === "new" ? "Evidence supporting the proposed claim" : "Evidence supporting your position"}<textarea name="evidence" rows={6} required maxLength={12000} placeholder="Provide a link, citation, or precise description of the evidence. Evidence is required." /></label>
      <label>Explanation<textarea name="explanation" rows={5} required maxLength={12000} placeholder="Explain how the evidence supports your position or proposed claim." /></label>
      <label className="contribution-files">Attach supporting files <span>optional · up to 5 files, 20 MB each · PDF, images, text, CSV, Word, Excel, PowerPoint, or OpenDocument</span><input accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp" multiple name="files" type="file" /></label>
      <label className="check"><input name="privacyConfirmation" type="checkbox" value="yes" required /><span>I understand that this submission may be reviewed for publication and contains no sealed records, identifying information about a child, executable files, or private information I lack permission to share.</span></label>
      <button className="button button-primary" disabled={submitting} type="submit">{submitting ? "Submitting…" : "Submit contribution"} <span aria-hidden="true">→</span></button>
      {notice && <p className="form-notice" role="status" aria-live="polite">{notice}</p>}
    </form>
  );
}
