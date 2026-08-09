(() => {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    .claim-delete-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
      border: 1px solid rgba(159, 47, 40, .25);
      background: rgba(159, 47, 40, .035);
    }
    .claim-delete-toolbar > div {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .claim-delete-toolbar strong {
      font-size: 13px;
    }
    .claim-delete-toolbar span {
      color: var(--ink-soft);
      font-size: 11px;
      line-height: 1.45;
    }
    .claim-delete-toolbar .danger-button {
      flex: 0 0 auto;
    }
    @media (max-width: 620px) {
      .claim-delete-toolbar {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `;
  document.head.append(style);

  function enhanceClaimDeleteButton() {
    document.querySelectorAll(".claim-editor > .danger-button").forEach((button) => {
      if (button.dataset.claimDeleteEnhanced === "true") return;

      const editor = button.closest(".claim-editor");
      if (!editor) return;

      button.dataset.claimDeleteEnhanced = "true";
      button.textContent = "Delete claim";
      button.title = "Remove this claim from the draft. It will disappear from the public site after you publish.";

      const toolbar = document.createElement("div");
      toolbar.className = "claim-delete-toolbar";

      const copy = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = "Claim actions";
      const note = document.createElement("span");
      note.textContent = "Deleting this claim also removes every line connected to it. The separate Central Conclusion is not affected.";
      copy.append(heading, note);

      toolbar.append(copy, button);
      editor.prepend(toolbar);
    });
  }

  const observer = new MutationObserver(enhanceClaimDeleteButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceClaimDeleteButton, { once: true });
  } else {
    enhanceClaimDeleteButton();
  }
})();
