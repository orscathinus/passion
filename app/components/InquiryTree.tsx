"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCmsDocument } from "./CmsProvider";

function point(index: number, total: number, radius: number, offset = -90) {
  const angle = ((offset + (360 / total) * index) * Math.PI) / 180;
  return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius };
}

function normalizeNumber(value: string) {
  const cleaned = value.trim().replace(/^#/, "");
  return /^\d+$/.test(cleaned) ? String(Number(cleaned)) : "";
}

function connectionStrokeWidth(thickness: number) {
  const level = Math.min(5, Math.max(1, Math.round(thickness || 3)));
  return [0, 3, 5.5, 8.5, 12, 16][level];
}

function connectionEnd(
  from: { x: number; y: number },
  to: { x: number; y: number },
  targetLevel: string,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return to;

  const unitX = dx / distance;
  const unitY = dy / distance;
  if (targetLevel === "Central") {
    return { x: to.x - unitX * 12.8, y: to.y - unitY * 12.8 };
  }

  const halfWidth = targetLevel === "Broader" ? 9.6 : 8.2;
  const halfHeight = targetLevel === "Broader" ? 5.5 : 5;
  const horizontal = Math.abs(unitX) < 0.0001 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(unitX);
  const vertical = Math.abs(unitY) < 0.0001 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(unitY);
  const offset = Math.min(horizontal, vertical) + 0.35;
  return { x: to.x - unitX * offset, y: to.y - unitY * offset };
}

export function InquiryTree() {
  const cms = useCmsDocument();
  const inquiryClaims = cms.claims;
  const centralClaim = inquiryClaims.find((claim) => claim.level === "Central") ?? inquiryClaims[0]!;
  const broaderClaims = inquiryClaims.filter((claim) => claim.level === "Broader");
  const focusedClaims = inquiryClaims.filter((claim) => claim.level === "Focused");
  const specificClaims = inquiryClaims.filter((claim) => claim.level === "Specific");
  const positions = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>();
    specificClaims.forEach((claim, index) => result.set(claim.id, point(index, specificClaims.length, 45)));
    focusedClaims.forEach((claim, index) => result.set(claim.id, point(index, focusedClaims.length, 32, -45)));
    broaderClaims.forEach((claim, index) => result.set(claim.id, point(index, broaderClaims.length, 20, -90)));
    result.set(centralClaim.id, { x: 50, y: 50 });
    return result;
  }, [broaderClaims, centralClaim.id, focusedClaims, specificClaims]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("1");
  const searchNumber = normalizeNumber(query);
  const searching = query.trim().length > 0;
  const match = useMemo(() => inquiryClaims.find((claim) => claim.id === searchNumber), [inquiryClaims, searchNumber]);
  const selected = match || inquiryClaims.find((claim) => claim.id === selectedId) || centralClaim;
  const show = (id: string) => !searching || match?.id === id;

  return (
    <section className="shell inquiry-explorer">
      <div className="inquiry-toolbar">
        <div className="mode-links" aria-label="Inquiry views"><Link className="selected" href="/inquiry">Tree mode</Link><Link href="/inquiry/list">List mode</Link></div>
        <label className="tree-search"><span className="sr-only">Search by claim number</span><span aria-hidden="true">⌕</span><input inputMode="numeric" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter claim number" type="search" /></label>
      </div>

      {searching && (
        <div className="tree-search-results" aria-live="polite">
          {match ? <><p>Claim found</p><div><Link href={`/inquiry/list#claim-${match.id}`}><b>#{match.id}</b> {match.title}</Link></div></> : <p>No claim with that number.</p>}
        </div>
      )}

      <div className="tree-wrap concentric-tree-wrap">
        <div className="tree-legend"><span><i className="specific-dot" /> Specific</span><span><i className="claim-dot" /> Focused</span><span><i className="conclusion-dot" /> Broader</span><span><i className="central-dot" /> Central</span></div>
        <div className="concentric-tree" aria-label="Concentric Tree of Inquiry with published connections between claims.">
          <svg className="concentric-lines" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" /><circle cx="50" cy="50" r="32" /><circle cx="50" cy="50" r="20" />
            {cms.connections.map((connection) => {
              const from = positions.get(connection.from);
              const to = positions.get(connection.to);
              if (!from || !to || !show(connection.from) || !show(connection.to)) return null;
              const target = inquiryClaims.find((claim) => claim.id === connection.to);
              const end = connectionEnd(from, to, target?.level ?? "Focused");
              const strokeWidth = connectionStrokeWidth(connection.thickness);
              return <g key={`${connection.from}-${connection.to}`}><line className="claim-connection-halo" x1={from.x} y1={from.y} x2={end.x} y2={end.y} style={{ strokeWidth: strokeWidth + 4 }} strokeLinecap="round" vectorEffect="non-scaling-stroke" /><line className="claim-connection-line" x1={from.x} y1={from.y} x2={end.x} y2={end.y} style={{ strokeWidth }} strokeLinecap="round" vectorEffect="non-scaling-stroke" /></g>;
            })}
          </svg>
          <span className="ring-label ring-label-outer">Specific claims</span><span className="ring-label ring-label-middle">Focused claims</span><span className="ring-label ring-label-inner">Broader claims</span>

          {specificClaims.map((claim, index) => { const position = point(index, specificClaims.length, 45); return show(claim.id) ? <Link className="tree-claim-node tree-specific-node" href={`/inquiry/list#claim-${claim.id}`} key={claim.id} style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-label={`Open claim ${claim.id}: ${claim.title}`}><span>#{claim.id}</span><b>{claim.title}</b></Link> : null; })}
          {focusedClaims.map((claim, index) => { const position = point(index, focusedClaims.length, 32, -45); return show(claim.id) ? <Link className="tree-claim-node" href={`/inquiry/list#claim-${claim.id}`} key={claim.id} style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-label={`Open claim ${claim.id}: ${claim.title}`}><span>#{claim.id}</span><b>{claim.title}</b></Link> : null; })}
          {broaderClaims.map((claim, index) => { const position = point(index, broaderClaims.length, 20, -90); return show(claim.id) ? <button className={`tree-conclusion-node ${selected.id === claim.id ? "selected" : ""}`} key={claim.id} onClick={() => setSelectedId(claim.id)} style={{ left: `${position.x}%`, top: `${position.y}%` }} type="button"><span>#{claim.id}</span><b>{claim.title}</b></button> : null; })}
          {show(centralClaim.id) && <button className="tree-center-node" onClick={() => setSelectedId(centralClaim.id)} type="button"><span>#{centralClaim.id}</span><b>Protective.<br />Explainable.<br />Correctable.</b></button>}
        </div>
      </div>

      <article className="tree-detail detail-goal" aria-live="polite"><div><p className="status">Selected claim</p><span className="detail-id">#{selected.id}</span></div><div><h2>{selected.title}</h2><p>{selected.statement}</p></div></article>
      <div className="tree-bottom-actions"><p className="tree-philosophy"><b>{cms.inquiry.philosophyTitle}</b> {cms.inquiry.philosophyText}</p><Link className="button button-quiet" href="/qa-rules#rules">Read the discussion rules</Link></div>
    </section>
  );
}
