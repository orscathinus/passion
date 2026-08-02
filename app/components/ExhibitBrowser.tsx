"use client";

import { useMemo, useState } from "react";
import { useCmsDocument } from "./CmsProvider";

function normalizeNumber(value: string) {
  const cleaned = value.trim().replace(/^#/, "");
  return /^\d+$/.test(cleaned) ? String(Number(cleaned)) : "";
}

export function ExhibitBrowser() {
  const { exhibits: exhibitContent } = useCmsDocument();
  const exhibits = exhibitContent.items;
  const [query, setQuery] = useState("");
  const searchNumber = normalizeNumber(query);
  const searching = query.trim().length > 0;
  const shown = useMemo(() => exhibits.filter((exhibit) => !searching || String(Number(exhibit.no)) === searchNumber), [exhibits, searchNumber, searching]);

  return (
    <section className="shell exhibits-browser">
      <div className="exhibit-search-row">
        <label className="tree-search exhibit-search"><span className="sr-only">Search exhibits by number</span><span aria-hidden="true">⌕</span><input inputMode="numeric" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter exhibit number" type="search" /></label>
      </div>
      {shown.length ? <div className="exhibit-list">{shown.map((exhibit) => <article className="exhibit-row" key={exhibit.no}><span className="exhibit-number">Exhibit #{exhibit.no}<b>Template</b></span><div><h2>{exhibit.title}</h2><p>{exhibit.description}</p><dl className="exhibit-meta"><div><dt>Source</dt><dd>{exhibit.source}</dd></div><div><dt>Date</dt><dd>{exhibit.date}</dd></div><div><dt>Related claims</dt><dd>{exhibit.relatedClaims}</dd></div></dl></div><div className="exhibit-action">{exhibit.href ? <a href={exhibit.href}>Open exhibit <span aria-hidden="true">↗</span></a> : <span className="exhibit-link-placeholder">[File or source link]</span>}</div></article>)}</div> : <div className="exhibits-placeholder" aria-live="polite"><span>No result</span><h2>No exhibit has that number.</h2><p>Search for Exhibit #1 to view the default template.</p></div>}
    </section>
  );
}
