"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCmsDocument } from "./CmsProvider";

function normalizeNumber(value: string) {
  const cleaned = value.trim().replace(/^#/, "");
  return /^\d+$/.test(cleaned) ? String(Number(cleaned)) : "";
}

export function InquiryList() {
  const { claims: inquiryClaims, supports } = useCmsDocument();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const searchNumber = normalizeNumber(query);
  const searching = query.trim().length > 0;

  const shown = useMemo(() => inquiryClaims
    .filter((claim) => !searching || claim.id === searchNumber)
    .sort((a, b) => sort === "asc" ? Number(a.id) - Number(b.id) : Number(b.id) - Number(a.id)), [inquiryClaims, searchNumber, searching, sort]);

  return (
    <section className="shell inquiry-list-page">
      <div className="inquiry-toolbar"><div className="mode-links" aria-label="Inquiry views"><Link href="/inquiry">Tree mode</Link><Link className="selected" href="/inquiry/list">List mode</Link></div><div className="tree-tools"><label className="tree-search"><span className="sr-only">Search by claim number</span><span aria-hidden="true">⌕</span><input inputMode="numeric" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter claim number" type="search" /></label><label className="tree-sort"><span>Claim order</span><select value={sort} onChange={(event) => setSort(event.target.value as "asc" | "desc")}><option value="asc">1 → 12</option><option value="desc">12 → 1</option></select></label></div></div>
      <div className="list-meta"><p className="list-count" aria-live="polite">{searching ? (shown.length ? "1 claim found" : "No claim with that number") : `Showing all ${inquiryClaims.length} claims`}</p><Link href="/qa-rules#rules">Read the discussion rules →</Link></div>

      <div className="claim-list">
        {shown.map((claim) => {
          const expanded = expandedId === claim.id;
          return <article className={`claim-record ${expanded ? "expanded" : ""}`} id={`claim-${claim.id}`} key={claim.id}>
            <button className="claim-summary" type="button" onClick={() => setExpandedId(expanded ? null : claim.id)} aria-expanded={expanded} aria-controls={`claim-details-${claim.id}`}>
              <div className="claim-summary-heading"><div><span className="claim-number">#{claim.id}</span><span className="claim-level">{claim.level}</span></div><h2>{claim.title}</h2></div>
              <div className="claim-overall-argument"><span>Overall argument</span><p>{claim.argument}</p></div>
              <span className="claim-expand-icon" aria-hidden="true">{expanded ? "−" : "+"}</span>
            </button>
            {expanded && <div className="claim-details" id={`claim-details-${claim.id}`}>
              <section className="claim-statement"><h3>Claim statement</h3><p>{claim.statement}</p></section>
              <div className="claim-record-grid">
                <section><h3>Supports</h3>{claim.supportIds.length ? <ul>{claim.supportIds.map((id) => { const support = supports.find((item) => item.id === id); return <li key={id}><b>{support?.title}</b><span>{support?.description}</span></li>; })}</ul> : <p className="empty-field">Supports have not been added.</p>}</section>
                <section><h3>Evidence</h3>{claim.evidence.length ? <div className="evidence-links">{claim.evidence.map((item) => <a href={item.href} key={item.label}>{item.label}<span aria-hidden="true">↗</span></a>)}</div> : <p className="empty-field">Evidence has not been added.</p>}</section>
                <section><h3>Counterargument or limit</h3><p>{claim.limitation}</p></section>
              </div>
            </div>}
          </article>;
        })}
      </div>
    </section>
  );
}
