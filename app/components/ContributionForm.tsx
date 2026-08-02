"use client";

import { FormEvent, useState } from "react";
import { useCmsDocument } from "./CmsProvider";

export function ContributionForm() {
  const { claims: inquiryClaims } = useCmsDocument();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [notice, setNotice] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "Anonymous contributor");
    const evidence = String(data.get("evidence") || "");
    const explanation = String(data.get("explanation") || "");

    const title = mode === "existing"
      ? `[AllegoryNow] ${String(data.get("position"))} claim #${String(data.get("claim"))}`
      : `[AllegoryNow] Proposed claim: ${String(data.get("newClaimTitle"))}`;

    const body = mode === "existing"
      ? `Contribution type: Existing claim\nClaim: #${String(data.get("claim"))}\nPosition: ${String(data.get("position"))}\n\nEvidence:\n${evidence}\n\nExplanation:\n${explanation}\n\nContributor: ${name}`
      : `Contribution type: New claim proposal\nProposed title: ${String(data.get("newClaimTitle"))}\n\nProposed claim:\n${String(data.get("newClaimStatement"))}\n\nRequired evidence:\n${evidence}\n\nExplanation:\n${explanation}\n\nContributor: ${name}`;

    setNotice("Opening a prepared contribution in a new tab.");
    window.open(`https://github.com/orscathinus/passion/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <form className="contribution-form" onSubmit={submit}>
      <label>Your name <span>optional</span><input name="name" type="text" autoComplete="name" /></label>
      <fieldset className="contribution-choice"><legend>What are you contributing?</legend><label><input checked={mode === "existing"} name="mode" onChange={() => setMode("existing")} type="radio" value="existing" /><span><b>Respond to a claim</b>Support or refute an existing numbered claim.</span></label><label><input checked={mode === "new"} name="mode" onChange={() => setMode("new")} type="radio" value="new" /><span><b>Propose a new claim</b>Submit a claim for administrator review.</span></label></fieldset>

      {mode === "existing" ? <div className="field-row"><label>Claim<select name="claim" required defaultValue=""><option value="" disabled>Select a claim</option>{inquiryClaims.map((claim) => <option key={claim.id} value={claim.id}>#{claim.id} · {claim.title}</option>)}</select></label><label>Your position<select name="position" required defaultValue="Support"><option>Support</option><option>Refute</option></select></label></div> : <><label>Proposed claim title<input name="newClaimTitle" required type="text" placeholder="Short title" /></label><label>Proposed claim statement<textarea name="newClaimStatement" rows={4} required placeholder="State one specific, testable claim." /></label></>}

      <label>{mode === "new" ? "Evidence supporting the proposed claim" : "Evidence supporting your position"}<textarea name="evidence" rows={6} required placeholder="Provide a link, citation, or precise description of the evidence. Evidence is required." /></label>
      <label>Explanation<textarea name="explanation" rows={5} required placeholder="Explain how the evidence supports your position or proposed claim." /></label>
      <label className="check"><input type="checkbox" required /><span>I understand that this submission may be public and contains no sealed records or identifying information about a child.</span></label>
      <button className="button button-primary" type="submit">Prepare contribution <span aria-hidden="true">→</span></button>
      {notice && <p className="form-notice" role="status">{notice}</p>}
    </form>
  );
}
