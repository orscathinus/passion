"use client";

import { useMemo, useState } from "react";
import { useCmsDocument } from "./CmsProvider";
import { ExhibitComments } from "./ExhibitComments";

function normalizeNumber(value: string) {
  const cleaned = value.trim().replace(/^#/, "");
  return /^\d+$/.test(cleaned) ? String(Number(cleaned)) : "";
}

export function ExhibitBrowser() {
  const document = useCmsDocument();
  const exhibits = useMemo(
    () => Array.isArray(document?.exhibits?.items) ? document.exhibits.items : [],
    [document],
  );
  const [query, setQuery] = useState("");
  const searchNumber = normalizeNumber(query);
  const searching = query.trim().length > 0;
  const shown = useMemo(
    () => exhibits.filter(
      (exhibit) => !searching || String(Number(exhibit?.no ?? "")) === searchNumber,
    ),
    [exhibits, searchNumber, searching],
  );

  return (
    <section className="shell exhibits-browser">
      <div className="exhibit-search-row">
        <label className="tree-search exhibit-search">
          <span className="sr-only">Search exhibits by number</span>
          <span aria-hidden="true">⌕</span>
          <input
            inputMode="numeric"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter exhibit number"
            type="search"
          />
        </label>
      </div>

      {shown.length ? (
        <div className="exhibit-list">
          {shown.map((exhibit, index) => {
            const exhibitNo = String(exhibit?.no ?? index + 1);
            const exhibitTitle = String(exhibit?.title ?? "Untitled exhibit");
            const exhibitDescription = String(exhibit?.description ?? "");
            const exhibitHref = typeof exhibit?.href === "string" ? exhibit.href.trim() : "";

            return (
              <article className="exhibit-card" key={`${exhibitNo}-${index}`}>
                <div className="exhibit-row">
                  <span className="exhibit-number">
                    Exhibit #{exhibitNo}
                    <b>Template</b>
                  </span>
                  <div>
                    <h2>{exhibitTitle}</h2>
                    <p>{exhibitDescription}</p>
                  </div>
                  <div className="exhibit-action">
                    {exhibitHref ? (
                      <a href={exhibitHref} target="_blank" rel="noopener noreferrer">
                        Open exhibit <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className="exhibit-link-placeholder">[File or source link]</span>
                    )}
                  </div>
                </div>
                <ExhibitComments exhibitNo={exhibitNo} exhibitTitle={exhibitTitle} />
              </article>
            );
          })}
        </div>
      ) : searching ? (
        <div className="exhibits-placeholder" aria-live="polite">
          <span>No result</span>
          <h2>No exhibit has that number.</h2>
          <p>Try another exhibit number.</p>
        </div>
      ) : (
        <div className="exhibits-placeholder" aria-live="polite">
          <span>No exhibits</span>
          <h2>No exhibits are currently published.</h2>
          <p>Add an exhibit in the administrator editor, then publish the draft.</p>
        </div>
      )}
    </section>
  );
}
