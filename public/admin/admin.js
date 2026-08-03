(() => {
  "use strict";

  const SITE_ADMIN_URL = "https://allegorynow.thirtytwo32percent.chatgpt.site/admin/index.html";
  const SITE_ADMIN_HOST = new URL(SITE_ADMIN_URL).hostname;
  const LOCAL_PREVIEW_HOSTS = new Set(["terminal.local", "localhost"]);
  if (location.hostname !== SITE_ADMIN_HOST && !LOCAL_PREVIEW_HOSTS.has(location.hostname)) {
    location.replace(SITE_ADMIN_URL);
    return;
  }

  const app = document.querySelector("#app");
  const sessionActions = document.querySelector("#session-actions");
  const logoutButton = document.querySelector("#logout-button");
  const state = { document: null, csrfToken: "", draftVersion: 0, publishedVersion: 0, page: "home", dirty: false, selectedClaim: "1", connectionStart: "", connectionThickness: 3 };

  const sections = [
    { id: "home", label: "Home", title: "Home page", fields: [["headline","Main headline","textarea"],["goalLabel","Path goal label","input"],["primaryButton","Primary button","input"],["secondaryButton","Secondary button","input"]] },
    { id: "mission", label: "Mission", title: "Mission page", fields: [["eyebrow","Small heading","input"],["title","Page title","textarea"],["lede","Introduction","textarea"],["body","Mission statement","textarea"],["proposalEyebrow","Reform proposal label","input"],["proposalTitle","Reform proposal heading","input"],["proposalText","Reform proposal description","textarea"]] },
    { id: "who", label: "Who We Are", title: "Who We Are page", fields: [["eyebrow","Small heading","input"],["title","Page title","textarea"],["lede","Introduction","textarea"],["monogram","Profile initials","input"],["name","Name","input"],["role","Role and credentials","input"],["bio","Biography","textarea"]] },
    { id: "inquiry", label: "Tree + Claims", title: "Tree of Inquiry", custom: "claims" },
    { id: "exhibits", label: "Exhibits", title: "Exhibits page", custom: "exhibits" },
    { id: "comments", label: "Comments", title: "Comment moderation", custom: "comments" },
    { id: "qa", label: "Q&A + Rules", title: "Q&A and rules", custom: "qa" },
    { id: "contact", label: "Contact", title: "Contact page", fields: [["eyebrow","Small heading","input"],["title","Page title","textarea"],["lede","Introduction","textarea"],["respondTitle","Respond option title","input"],["respondText","Respond option description","textarea"],["proposeTitle","Propose option title","input"],["proposeText","Propose option description","textarea"],["privacyTitle","Privacy warning title","input"],["privacyText","Privacy warning","textarea"]] },
    { id: "site", label: "Site Footer", title: "Site-wide writing", fields: [["brandName","Site name","input"],["footerLeft","Footer left","input"],["footerRight","Footer right","input"]] },
  ];

  async function api(path, options = {}) {
    const response = await fetch(`/api/cms/${path}`, {
      credentials: "same-origin",
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({ error: "The server returned an unreadable response." }));
    if (!response.ok) {
      const error = new Error(payload.error || "The request failed.");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function initialize() {
    sessionActions.hidden = true;
    try {
      const payload = await api("admin/state", { method: "GET", headers: {} });
      if (payload.authenticated) return openEditor(payload);
      renderAuth(payload.needsSetup ? "setup" : "login");
    } catch (error) {
      if (error.status === 401 && error.payload?.signInUrl) {
        location.assign(error.payload.signInUrl);
        return;
      }
      renderFatal(error.message);
    }
  }

  function renderAuth(kind) {
    const template = document.querySelector(`#${kind}-template`);
    app.replaceChildren(template.content.cloneNode(true));
    const form = app.querySelector("form");
    const message = app.querySelector(".form-message");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.textContent = "Checking…";
      message.className = "form-message";
      const data = new FormData(form);
      const password = String(data.get("password") || "");
      if (kind === "setup" && password !== String(data.get("confirm") || "")) {
        message.textContent = "The two passwords do not match.";
        message.classList.add("error");
        return;
      }
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        const payload = await api(`admin/${kind === "setup" ? "setup-password" : "login"}`, { method: "POST", body: JSON.stringify({ password }) });
        openEditor(payload);
      } catch (error) {
        message.textContent = error.message;
        message.classList.add("error");
        button.disabled = false;
      }
    });
  }

  function openEditor(payload) {
    if (!Array.isArray(payload.document.connections)) payload.document.connections = [];
    payload.document.connections = payload.document.connections.map((connection) => ({
      ...connection,
      thickness: Number.isInteger(connection.thickness) && connection.thickness >= 1 && connection.thickness <= 5 ? connection.thickness : 3,
    }));
    Object.assign(state, {
      document: payload.document,
      csrfToken: payload.csrfToken,
      draftVersion: payload.draftVersion,
      publishedVersion: payload.publishedVersion,
      dirty: false,
    });
    app.replaceChildren(document.querySelector("#editor-template").content.cloneNode(true));
    sessionActions.hidden = false;
    buildPagePicker();
    app.querySelector("#save-button").addEventListener("click", saveDraft);
    app.querySelector("#publish-button").addEventListener("click", publish);
    renderSection();
  }

  function buildPagePicker() {
    const picker = app.querySelector("#page-picker");
    picker.replaceChildren();
    sections.forEach((section) => {
      const button = element("button", { type: "button" }, section.label);
      button.dataset.page = section.id;
      button.addEventListener("click", () => { state.page = section.id; renderSection(); });
      picker.append(button);
    });
  }

  function renderSection() {
    const definition = sections.find((item) => item.id === state.page);
    app.querySelector("#editor-title").textContent = definition.title;
    app.querySelectorAll("#page-picker button").forEach((button) => button.classList.toggle("active", button.dataset.page === state.page));
    const form = app.querySelector("#content-form");
    form.replaceChildren();
    const editingContent = definition.custom !== "comments";
    app.querySelector("#save-button").hidden = !editingContent;
    app.querySelector("#publish-button").hidden = !editingContent;
    if (definition.custom === "claims") renderClaims(form);
    else if (definition.custom === "qa") renderQa(form);
    else if (definition.custom === "exhibits") renderExhibits(form);
    else if (definition.custom === "comments") renderComments(form);
    else renderFields(form, state.document[definition.id], definition.fields);
    updateVersions();
  }

  function renderFields(container, target, fields) {
    fields.forEach(([key, label, kind]) => container.append(field(label, target[key], kind, (value) => { target[key] = value; markDirty(); })));
  }

  function renderClaims(container) {
    const intro = element("section", { class: "editor-section" });
    intro.append(element("h3", {}, "Tree page writing"));
    renderFields(intro, state.document.inquiry, [["eyebrow","Small heading","input"],["title","Page title","textarea"],["lede","Introduction","textarea"],["cautionTitle","Caution heading","input"],["cautionText","Caution text","textarea"],["philosophyTitle","Connections heading","input"],["philosophyText","Connections text","textarea"]]);
    container.append(intro);

    const supportsSection = element("section", { class: "editor-section" });
    supportsSection.append(element("h3", {}, "Support categories"), element("p", { class: "field-note" }, "Support IDs are stable references used by claims."));
    const supportList = element("div", { class: "repeater-list" });
    state.document.supports.forEach((support, index) => {
      const card = element("div", { class: "repeater-card" });
      card.append(cardHeader(`Support ${support.id}`, () => { if (confirm("Remove this support category from the draft?")) { state.document.supports.splice(index, 1); markDirty(); renderSection(); } }));
      renderFields(card, support, [["id","Stable ID","input"],["title","Title","input"],["description","Description","textarea"]]);
      supportList.append(card);
    });
    const addSupport = element("button", { class: "secondary-button", type: "button" }, "Add support category");
    addSupport.addEventListener("click", () => { const next = nextSupportId(); state.document.supports.push({ id: next, title: "New support", description: "Describe this support category." }); markDirty(); renderSection(); });
    supportsSection.append(supportList, addSupport);
    container.append(supportsSection);

    const claimsSection = element("section", { class: "editor-section" });
    const heading = element("div");
    heading.append(element("h3", {}, "Claims"), element("p", { class: "field-note" }, "Add or edit claims here. Changes remain drafts until you publish them."));
    const addClaim = element("button", { class: "primary-button", type: "button" }, "Add new claim");
    addClaim.addEventListener("click", () => {
      const id = String(Math.max(0, ...state.document.claims.map((claim) => Number(claim.id) || 0)) + 1);
      state.document.claims.push({ id, level: "Focused", title: "New claim", statement: "State the claim precisely.", argument: "Explain the overall argument.", supportIds: [], evidence: [], limitation: "Add a serious counterargument or limitation." });
      state.selectedClaim = id;
      markDirty();
      renderSection();
    });
    const tools = element("div", { class: "claim-tools" });
    tools.append(addClaim);
    claimsSection.append(heading, tools);

    if (!state.document.claims.some((claim) => claim.id === state.selectedClaim)) state.selectedClaim = state.document.claims[0]?.id || "";
    const layout = element("div", { class: "claim-layout" });
    const list = element("div", { class: "claim-list" });
    [...state.document.claims].sort((a,b) => Number(a.id) - Number(b.id)).forEach((claim) => {
      const button = element("button", { type: "button", class: claim.id === state.selectedClaim ? "active" : "" });
      button.append(element("b", {}, `#${claim.id} · ${claim.level}`), element("span", {}, claim.title));
      button.addEventListener("click", () => { state.selectedClaim = claim.id; renderSection(); });
      list.append(button);
    });
    layout.append(list, renderClaimEditor());
    claimsSection.append(layout);
    container.append(claimsSection);
    renderConnections(container);
  }

  function renderClaimEditor() {
    const claim = state.document.claims.find((item) => item.id === state.selectedClaim);
    const editor = element("div", { class: "claim-editor" });
    if (!claim) return editor;
    editor.append(field("Claim number", claim.id, "input", (value) => {
      const previousId = claim.id;
      claim.id = value;
      state.selectedClaim = value;
      state.document.connections.forEach((connection) => {
        if (connection.from === previousId) connection.from = value;
        if (connection.to === previousId) connection.to = value;
      });
      if (state.connectionStart === previousId) state.connectionStart = value;
      markDirty();
    }));
    const levelLabel = element("label", {}, "Claim level");
    const select = element("select");
    ["Central","Broader","Focused","Specific"].forEach((value) => select.append(element("option", { value, selected: claim.level === value ? "selected" : null }, value)));
    select.value = claim.level;
    select.addEventListener("change", () => { claim.level = select.value; markDirty(); });
    levelLabel.append(select);
    editor.append(levelLabel);
    renderFields(editor, claim, [["title","Title","textarea"],["statement","Claim statement","textarea"],["argument","Overall argument","textarea"],["limitation","Counterargument or limitation","textarea"]]);
    editor.append(field("Support IDs (comma-separated)", claim.supportIds.join(", "), "input", (value) => { claim.supportIds = value.split(",").map((item) => item.trim()).filter(Boolean); markDirty(); }));
    editor.append(field("Evidence (one per line: Label | URL)", claim.evidence.map((item) => `${item.label} | ${item.href}`).join("\n"), "textarea", (value) => { claim.evidence = value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const divider = line.indexOf("|"); return divider < 0 ? { label: line, href: "" } : { label: line.slice(0,divider).trim(), href: line.slice(divider + 1).trim() }; }); markDirty(); }));
    const remove = element("button", { class: "danger-button", type: "button" }, "Archive this claim from the draft");
    remove.disabled = claim.level === "Central";
    remove.addEventListener("click", () => { if (confirm(`Remove claim #${claim.id} from the draft? Its published version remains live until you publish.`)) { state.document.claims = state.document.claims.filter((item) => item !== claim); state.document.connections = state.document.connections.filter((connection) => connection.from !== claim.id && connection.to !== claim.id); state.selectedClaim = state.document.claims[0]?.id || ""; if (state.connectionStart === claim.id) state.connectionStart = ""; markDirty(); renderSection(); } });
    editor.append(remove);
    return editor;
  }

  function renderConnections(container) {
    const section = element("section", { class: "editor-section connection-section" });
    section.append(
      element("h3", {}, "Lines between claims"),
      element("p", { class: "field-note" }, state.connectionStart
        ? `Claim #${state.connectionStart} selected. Now click the claim it supports.`
        : "Click the supporting claim first, then click the claim it supports. An arrow will be drawn in that direction."),
    );

    const thicknessControl = element("label", { class: "connection-thickness-control" });
    const thicknessCopy = element("span");
    thicknessCopy.append(
      element("b", {}, "New line thickness"),
      element("small", {}, "Choose a width, then click the two claims you want to connect."),
    );
    const thicknessInput = element("input", { type: "range", min: "1", max: "5", step: "1", value: String(state.connectionThickness), "aria-label": "New line thickness" });
    const thicknessOutput = element("output", {}, thicknessLabel(state.connectionThickness));
    thicknessInput.addEventListener("input", () => {
      state.connectionThickness = Number(thicknessInput.value);
      thicknessOutput.textContent = thicknessLabel(state.connectionThickness);
    });
    thicknessControl.append(thicknessCopy, thicknessInput, thicknessOutput);
    section.append(thicknessControl);

    const scroll = element("div", { class: "connection-map-scroll" });
    const map = element("div", { class: "connection-map" });
    const labels = element("div", { class: "connection-level-labels", "aria-hidden": "true" });
    ["Specific claims", "Focused claims", "Broader claims", "Central claim"].forEach((label) => labels.append(element("span", {}, label)));
    map.append(labels);
    const svg = svgElement("svg", { class: "connection-map-lines", viewBox: "0 0 100 100", "aria-hidden": "true", preserveAspectRatio: "none" });

    const positions = connectionPositions();
    state.document.connections.forEach((connection, index) => {
      const from = positions.get(connection.from);
      const to = positions.get(connection.to);
      if (!from || !to) return;
      const strokeWidth = connectionStrokeWidth(connection.thickness);
      svg.append(svgElement("line", { class: "connection-line-halo", x1: from.x, y1: from.y, x2: to.x, y2: to.y, "stroke-width": strokeWidth + 2.5, "stroke-linecap": "round", "data-connection-halo-index": index }));
      svg.append(svgElement("line", { class: "connection-line", x1: from.x, y1: from.y, x2: to.x, y2: to.y, "stroke-width": strokeWidth, "stroke-linecap": "round", "data-connection-index": index }));
    });
    map.append(svg);

    [...state.document.claims].sort((a, b) => Number(a.id) - Number(b.id)).forEach((claim) => {
      const position = positions.get(claim.id);
      if (!position) return;
      const button = element("button", { type: "button", class: `connection-node level-${claim.level.toLowerCase()}${state.connectionStart === claim.id ? " selected" : ""}`, "aria-pressed": state.connectionStart === claim.id ? "true" : "false" });
      button.style.left = `${position.x}%`;
      button.style.top = `${position.y}%`;
      button.append(element("b", {}, `#${claim.id} · ${claim.level}`), element("span", {}, claim.title));
      button.addEventListener("click", () => selectConnectionClaim(claim.id));
      map.append(button);
    });
    scroll.append(map);
    section.append(scroll);

    const list = element("div", { class: "connection-list" });
    if (!state.document.connections.length) {
      list.append(element("p", { class: "field-note" }, "No lines have been added yet."));
    } else {
      state.document.connections.forEach((connection, index) => {
        const from = state.document.claims.find((claim) => claim.id === connection.from);
        const to = state.document.claims.find((claim) => claim.id === connection.to);
        const row = element("div", { class: "connection-row" });
        row.append(element("span", { class: "connection-row-label" }, `#${connection.from} ${from?.title || "Unknown claim"} → #${connection.to} ${to?.title || "Unknown claim"}`));
        const controls = element("div", { class: "connection-row-controls" });
        const widthLabel = element("label", { class: "connection-row-thickness" }, "Thickness");
        const widthInput = element("input", { type: "range", min: "1", max: "5", step: "1", value: String(connection.thickness), "aria-label": `Thickness of line from claim ${connection.from} to claim ${connection.to}` });
        const widthOutput = element("output", {}, thicknessLabel(connection.thickness));
        widthInput.addEventListener("input", () => {
          connection.thickness = Number(widthInput.value);
          widthOutput.textContent = thicknessLabel(connection.thickness);
          const strokeWidth = connectionStrokeWidth(connection.thickness);
          svg.querySelector(`[data-connection-index="${index}"]`)?.setAttribute("stroke-width", String(strokeWidth));
          svg.querySelector(`[data-connection-halo-index="${index}"]`)?.setAttribute("stroke-width", String(strokeWidth + 2.5));
          markDirty();
        });
        widthLabel.append(widthInput, widthOutput);
        const remove = element("button", { class: "small-button", type: "button" }, "Remove line");
        remove.addEventListener("click", () => { state.document.connections.splice(index, 1); markDirty(); renderSection(); });
        controls.append(widthLabel, remove);
        row.append(controls);
        list.append(row);
      });
    }
    section.append(list);
    container.append(section);
  }

  function selectConnectionClaim(id) {
    if (!state.connectionStart) {
      state.connectionStart = id;
      renderSection();
      setNotice(`Claim #${id} selected as the supporting claim.`);
      return;
    }
    if (state.connectionStart === id) {
      state.connectionStart = "";
      renderSection();
      setNotice("Connection selection cleared.");
      return;
    }
    const from = state.connectionStart;
    state.connectionStart = "";
    if (state.document.connections.some((connection) => connection.from === from && connection.to === id)) {
      renderSection();
      setNotice(`The line from claim #${from} to claim #${id} already exists.`, true);
      return;
    }
    state.document.connections.push({ from, to: id, thickness: state.connectionThickness });
    markDirty();
    renderSection();
    setNotice(`Line added: claim #${from} supports claim #${id}. Save the draft when ready.`);
  }

  function connectionPositions() {
    const positions = new Map();
    const levelX = { Specific: 12, Focused: 38, Broader: 65, Central: 88 };
    Object.keys(levelX).forEach((level) => {
      const claims = state.document.claims.filter((claim) => claim.level === level).sort((a, b) => Number(a.id) - Number(b.id));
      claims.forEach((claim, index) => positions.set(claim.id, { x: levelX[level], y: ((index + 1) / (claims.length + 1)) * 100 }));
    });
    return positions;
  }

  function connectionStrokeWidth(value) {
    const level = Math.min(5, Math.max(1, Math.round(value || 3)));
    return [0, 1.5, 2.5, 3.5, 5, 6.5][level];
  }

  function thicknessLabel(value) {
    if (value <= 1) return "Thin · level 1";
    if (value >= 5) return "Thick · level 5";
    return `${value < 3 ? "Light" : value > 3 ? "Bold" : "Medium"} · level ${value}`;
  }

  function renderQa(container) {
    const intro = element("section", { class: "editor-section" });
    intro.append(element("h3", {}, "Page introduction"));
    renderFields(intro, state.document.qa, [["eyebrow","Small heading","input"],["title","Page title","textarea"],["lede","Introduction","textarea"]]);
    container.append(intro);
    const list = element("div", { class: "repeater-list" });
    state.document.qa.items.forEach((item, index) => {
      const card = element("div", { class: "repeater-card" });
      card.append(cardHeader(`Question ${index + 1}`, () => { state.document.qa.items.splice(index,1); markDirty(); renderSection(); }));
      renderFields(card, item, [["question","Question","textarea"],["answer","Answer","textarea"]]);
      list.append(card);
    });
    container.append(list);
    const add = element("button", { class: "secondary-button", type: "button" }, "Add question");
    add.addEventListener("click", () => { state.document.qa.items.push({ question: "New question", answer: "Add the answer." }); markDirty(); renderSection(); });
    container.append(add);
  }

  function renderExhibits(container) {
    const intro = element("section", { class: "editor-section" });
    intro.append(element("h3", {}, "Page introduction"));
    renderFields(intro, state.document.exhibits, [["eyebrow","Small heading","input"],["title","Page title","textarea"],["lede","Introduction","textarea"]]);
    container.append(intro);
    const list = element("div", { class: "repeater-list" });
    state.document.exhibits.items.forEach((item, index) => {
      const card = element("div", { class: "repeater-card" });
      card.append(cardHeader(`Exhibit #${item.no}`, () => { state.document.exhibits.items.splice(index,1); markDirty(); renderSection(); }));
      renderFields(card, item, [["no","Exhibit number","input"],["title","Title","textarea"],["description","Description","textarea"],["href","File or source link","input"]]);
      list.append(card);
    });
    container.append(list);
    const add = element("button", { class: "secondary-button", type: "button" }, "Add exhibit");
    add.addEventListener("click", () => { const no = String(Math.max(0, ...state.document.exhibits.items.map((item) => Number(item.no) || 0)) + 1); state.document.exhibits.items.push({ no, title: "New exhibit", description: "Describe the exhibit and its relevance.", href: "" }); markDirty(); renderSection(); });
    container.append(add);
  }

  function renderComments(container) {
    const section = element("section", { class: "editor-section moderation-section" });
    section.append(
      element("h3", {}, "Public exhibit discussions"),
      element("p", { class: "field-note" }, "Comments appear immediately after they are posted. Hide comments that reveal private information, target people, or violate the discussion rules. Hidden comments can be restored."),
    );
    const list = element("div", { class: "moderation-list" });
    list.append(element("p", { class: "field-note" }, "Loading comments…"));
    section.append(list);
    container.append(section);

    api("admin/comments", { method: "GET", headers: {} }).then((payload) => {
      if (state.page !== "comments" || !list.isConnected) return;
      list.replaceChildren();
      const comments = Array.isArray(payload.comments) ? payload.comments : [];
      if (!comments.length) {
        list.append(element("p", { class: "moderation-empty" }, "No comments have been posted yet."));
        return;
      }

      comments.forEach((comment) => {
        const card = element("article", { class: `moderation-card${comment.status === "hidden" ? " hidden-comment" : ""}` });
        const header = element("header");
        const identity = element("div");
        identity.append(
          element("b", {}, comment.authorName),
          element("span", {}, `Exhibit #${comment.exhibitNo}${comment.parentId ? " · Reply" : " · Top-level comment"}`),
        );
        const status = element("span", { class: `moderation-status ${comment.status}` }, comment.status === "hidden" ? "Hidden" : "Visible");
        header.append(identity, status);
        card.append(
          header,
          element("p", { class: "moderation-body" }, comment.body),
          element("time", {}, new Date(comment.createdAt * 1000).toLocaleString()),
        );
        const action = element("button", { class: comment.status === "hidden" ? "secondary-button" : "danger-button", type: "button" }, comment.status === "hidden" ? "Restore comment" : "Hide comment");
        action.addEventListener("click", async () => {
          const nextStatus = comment.status === "hidden" ? "visible" : "hidden";
          action.disabled = true;
          setNotice(`${nextStatus === "hidden" ? "Hiding" : "Restoring"} comment…`);
          try {
            const result = await api("admin/comments/moderate", {
              method: "POST",
              headers: { "x-allegory-csrf": state.csrfToken },
              body: JSON.stringify({ commentId: comment.id, status: nextStatus }),
            });
            state.csrfToken = result.csrfToken;
            setNotice(`Comment ${nextStatus === "hidden" ? "hidden" : "restored"}. The public discussion is updated immediately.`);
            renderSection();
          } catch (error) {
            action.disabled = false;
            setNotice(error.message, true);
          }
        });
        card.append(action);
        list.append(card);
      });
    }).catch((error) => {
      if (!list.isConnected) return;
      list.replaceChildren(element("p", { class: "moderation-empty error" }, error.message));
    });
  }

  function field(labelText, value, kind, onChange) {
    const label = element("label", {}, labelText);
    const control = element(kind === "textarea" ? "textarea" : "input", kind === "textarea" ? { rows: "5" } : { type: "text" });
    control.value = value ?? "";
    control.addEventListener("input", () => onChange(control.value));
    label.append(control);
    return label;
  }

  function cardHeader(title, removeHandler) {
    const header = element("header");
    const remove = element("button", { class: "small-button", type: "button" }, "Remove");
    remove.addEventListener("click", removeHandler);
    header.append(element("b", {}, title), remove);
    return header;
  }

  function markDirty() {
    state.dirty = true;
    app.querySelector("#editor-title").classList.add("unsaved");
    setNotice("Draft has unsaved changes.");
  }

  async function saveDraft() {
    const button = app.querySelector("#save-button");
    button.disabled = true;
    setNotice("Saving draft…");
    try {
      const payload = await api("admin/save-draft", { method: "POST", headers: { "x-allegory-csrf": state.csrfToken }, body: JSON.stringify({ document: state.document, expectedDraftVersion: state.draftVersion }) });
      state.draftVersion = payload.draftVersion;
      state.csrfToken = payload.csrfToken;
      state.dirty = false;
      app.querySelector("#editor-title").classList.remove("unsaved");
      updateVersions();
      setNotice("Draft saved. The public site has not changed.");
      return true;
    } catch (error) {
      setNotice(error.message, true);
      if (error.status === 401) setTimeout(initialize, 900);
      return false;
    } finally { button.disabled = false; }
  }

  async function publish() {
    if (state.dirty && !(await saveDraft())) return;
    if (!confirm("Publish this saved draft to the public website? Visitors will see the new writing and claims.")) return;
    const button = app.querySelector("#publish-button");
    button.disabled = true;
    setNotice("Publishing…");
    try {
      const payload = await api("admin/publish", { method: "POST", headers: { "x-allegory-csrf": state.csrfToken }, body: JSON.stringify({ expectedDraftVersion: state.draftVersion }) });
      state.publishedVersion = payload.publishedVersion;
      state.csrfToken = payload.csrfToken;
      updateVersions();
      setNotice("Published. The public site will update within about a minute.");
    } catch (error) { setNotice(error.message, true); }
    finally { button.disabled = false; }
  }

  function updateVersions() {
    app.querySelector("#draft-version").textContent = `Draft version ${state.draftVersion}`;
    app.querySelector("#published-version").textContent = `Published version ${state.publishedVersion}`;
  }

  function setNotice(message, error = false) {
    const notice = app.querySelector("#editor-notice");
    if (!notice) return;
    notice.textContent = message;
    notice.className = error ? "editor-notice error" : "editor-notice";
  }

  function nextSupportId() {
    const maximum = Math.max(0, ...state.document.supports.map((item) => Number(String(item.id).replace(/\D/g,"")) || 0));
    return `S${String(maximum + 1).padStart(2,"0")}`;
  }

  function element(tag, attributes = {}, text) {
    const node = document.createElement(tag);
    Object.entries(attributes).forEach(([key,value]) => {
      if (value === null || value === undefined) return;
      if (key === "class") node.className = value;
      else if (key === "selected") node.selected = true;
      else node.setAttribute(key, value);
    });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgElement(tag, attributes = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function renderFatal(message) {
    sessionActions.hidden = true;
    const card = element("section", { class: "auth-card" });
    card.append(element("p", { class: "kicker" }, "Administrator area unavailable"), element("h1", {}, "The editor could not open."), element("p", {}, message));
    app.replaceChildren(card);
  }

  logoutButton.addEventListener("click", async () => {
    try { await api("admin/logout", { method: "POST", headers: { "x-allegory-csrf": state.csrfToken }, body: "{}" }); } catch { /* lock locally either way */ }
    sessionActions.hidden = true;
    state.document = null;
    renderAuth("login");
  });

  window.addEventListener("beforeunload", (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
  initialize();
})();
