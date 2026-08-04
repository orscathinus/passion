(() => {
  "use strict";

  const list = document.querySelector("#submission-list");
  const notice = document.querySelector("#notice");
  const summary = document.querySelector("#summary");
  const filter = document.querySelector("#status-filter");
  const refreshButton = document.querySelector("#refresh-button");
  let submissions = [];
  let csrfToken = "";

  function element(tag, attributes = {}, text = "") {
    const node = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    });
    if (text) node.textContent = text;
    return node;
  }

  function setNotice(message, isError = false) {
    notice.textContent = message;
    notice.classList.toggle("error", isError);
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp * 1000));
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function section(title, content) {
    const wrapper = element("section", { class: "submission-section" });
    wrapper.append(element("h3", {}, title));
    wrapper.append(element("p", {}, content || "Not provided."));
    return wrapper;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: "include", ...options });
    const payload = await response.json().catch(() => ({ error: "The server returned an unreadable response." }));
    if (!response.ok) {
      if (payload.signInUrl) window.location.assign(payload.signInUrl);
      throw new Error(payload.error || "The request failed.");
    }
    if (payload.csrfToken) csrfToken = payload.csrfToken;
    return payload;
  }

  function render() {
    const selected = filter.value;
    const shown = submissions.filter((submission) => selected === "all" || submission.status === selected);
    summary.textContent = `${shown.length} of ${submissions.length} submission${submissions.length === 1 ? "" : "s"}`;
    list.replaceChildren();

    if (!shown.length) {
      const empty = element("div", { class: "empty" });
      empty.append(element("h2", {}, "No submissions in this view."));
      empty.append(element("p", {}, "Change the status filter or refresh the page."));
      list.append(empty);
      return;
    }

    shown.forEach((submission) => {
      const card = element("article", { class: "submission-card" });
      const head = element("header", { class: "submission-head" });
      const heading = element("div");
      const subject = submission.mode === "existing"
        ? `${submission.position} Claim #${submission.claimId}`
        : submission.proposedTitle || "Proposed claim";
      heading.append(element("p", { class: "kicker" }, submission.mode === "existing" ? "Existing claim response" : "New claim proposal"));
      heading.append(element("h2", {}, subject));
      const contact = submission.contributorEmail ? ` · ${submission.contributorEmail}` : "";
      heading.append(element("p", { class: "submission-meta" }, `${submission.contributorName}${contact} · ${formatDate(submission.createdAt)} · Receipt ${submission.id.slice(0, 8).toUpperCase()}`));
      head.append(heading, element("span", { class: "status-pill" }, submission.status));
      card.append(head);

      const grid = element("div", { class: "submission-grid" });
      if (submission.mode === "new") grid.append(section("Proposed statement", submission.proposedStatement));
      grid.append(section("Evidence", submission.evidence));
      grid.append(section("Explanation", submission.explanation));

      const fileSection = element("section", { class: "submission-section" });
      fileSection.append(element("h3", {}, "Attached files"));
      if (submission.files.length) {
        const files = element("ul", { class: "file-list" });
        submission.files.forEach((file) => {
          const item = element("li");
          const details = element("span");
          details.append(document.createTextNode(file.name));
          details.append(element("small", {}, `${formatBytes(file.size)} · ${file.contentType || "unknown type"}`));
          const download = element("a", { class: "download-link", href: `/api/contributions/admin/file/${encodeURIComponent(file.id)}` }, "Download");
          item.append(details, download);
          files.append(item);
        });
        fileSection.append(files);
      } else {
        fileSection.append(element("p", {}, "No files attached."));
      }
      grid.append(fileSection);
      card.append(grid);

      const actions = element("div", { class: "submission-actions" });
      ["new", "reviewed", "archived"].forEach((status) => {
        if (status === submission.status) return;
        const button = element("button", { type: "button" }, `Mark ${status}`);
        button.addEventListener("click", () => updateStatus(submission.id, status, button));
        actions.append(button);
      });
      const remove = element("button", { type: "button", class: "danger" }, "Delete submission and files");
      remove.addEventListener("click", () => removeSubmission(submission.id, remove));
      actions.append(remove);
      card.append(actions);
      list.append(card);
    });
  }

  async function updateStatus(submissionId, status, button) {
    button.disabled = true;
    setNotice("Updating review status…");
    try {
      await api("/api/contributions/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-allegory-csrf": csrfToken },
        body: JSON.stringify({ submissionId, status }),
      });
      const submission = submissions.find((item) => item.id === submissionId);
      if (submission) submission.status = status;
      setNotice("Review status updated.");
      render();
    } catch (error) {
      setNotice(error.message, true);
      button.disabled = false;
    }
  }

  async function removeSubmission(submissionId, button) {
    if (!window.confirm("Permanently delete this submission and every attached file? This cannot be undone.")) return;
    button.disabled = true;
    setNotice("Deleting submission and stored files…");
    try {
      await api("/api/contributions/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-allegory-csrf": csrfToken },
        body: JSON.stringify({ submissionId }),
      });
      submissions = submissions.filter((item) => item.id !== submissionId);
      setNotice("Submission deleted.");
      render();
    } catch (error) {
      setNotice(error.message, true);
      button.disabled = false;
    }
  }

  async function load() {
    refreshButton.disabled = true;
    setNotice("Loading submissions…");
    try {
      const payload = await api("/api/contributions/admin");
      submissions = Array.isArray(payload.submissions) ? payload.submissions : [];
      setNotice(submissions.length ? "Private submissions loaded." : "No contributions have been submitted yet.");
      render();
    } catch (error) {
      setNotice(`${error.message} Open the website editor, unlock it, and return to this page.`, true);
      list.replaceChildren();
    } finally {
      refreshButton.disabled = false;
    }
  }

  filter.addEventListener("change", render);
  refreshButton.addEventListener("click", load);
  load();
})();
