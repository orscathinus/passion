"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useCmsDocument } from "./CmsProvider";

const MIN_TREE_SCALE = 0.5;
const MAX_TREE_SCALE = 2.5;
const TREE_SCALE_STEP = 0.2;

type TreeView = { scale: number; x: number; y: number };
type ViewPoint = { x: number; y: number };
type TreeGesture =
  | { kind: "pan"; pointerId: number; start: ViewPoint; view: TreeView }
  | { kind: "pinch"; anchor: ViewPoint; distance: number };

function clampScale(scale: number) {
  return Math.min(MAX_TREE_SCALE, Math.max(MIN_TREE_SCALE, scale));
}

function midpoint(first: ViewPoint, second: ViewPoint) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function distance(first: ViewPoint, second: ViewPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

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
  return [0, 1.5, 2.5, 3.5, 5, 6.5][level];
}

export function InquiryTree() {
  const cms = useCmsDocument();
  const inquiryClaims = cms.claims;
  const centralClaim = inquiryClaims.find((claim) => claim.level === "Central") ?? inquiryClaims[0]!;
  const broaderClaims = inquiryClaims.filter((claim) => claim.level === "Broader");
  const specificClaims = inquiryClaims.filter((claim) => claim.level === "Specific");
  const positions = useMemo(() => {
    const result = new Map<string, { x: number; y: number }>();
    specificClaims.forEach((claim, index) => result.set(claim.id, point(index, specificClaims.length, 45)));
    broaderClaims.forEach((claim, index) => result.set(claim.id, point(index, broaderClaims.length, 20, -90)));
    result.set(centralClaim.id, { x: 50, y: 50 });
    return result;
  }, [broaderClaims, centralClaim.id, specificClaims]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<TreeView>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  const pointersRef = useRef(new Map<number, ViewPoint>());
  const gestureRef = useRef<TreeGesture | null>(null);
  const suppressClickUntilRef = useRef(0);
  const searchNumber = normalizeNumber(query);
  const searching = query.trim().length > 0;
  const match = useMemo(() => inquiryClaims.find((claim) => claim.id === searchNumber), [inquiryClaims, searchNumber]);
  const show = (id: string) => !searching || match?.id === id;

  const updateView = (next: TreeView) => {
    viewRef.current = next;
    setView(next);
  };

  const localPoint = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: clientX, y: clientY };
  };

  const zoomAt = (nextScale: number, anchor?: ViewPoint) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const target = anchor ?? { x: rect.width / 2, y: rect.height / 2 };
    const current = viewRef.current;
    const scale = clampScale(nextScale);
    const worldX = (target.x - rect.width / 2 - current.x) / current.scale;
    const worldY = (target.y - rect.height / 2 - current.y) / current.scale;
    updateView({
      scale,
      x: target.x - rect.width / 2 - worldX * scale,
      y: target.y - rect.height / 2 - worldY * scale,
    });
  };

  const beginPinch = () => {
    const points = [...pointersRef.current.values()];
    const viewport = viewportRef.current;
    if (points.length < 2 || !viewport) return;
    const center = midpoint(points[0], points[1]);
    const rect = viewport.getBoundingClientRect();
    const current = viewRef.current;
    gestureRef.current = {
      kind: "pinch",
      anchor: {
        x: (center.x - rect.width / 2 - current.x) / current.scale,
        y: (center.y - rect.height / 2 - current.y) / current.scale,
      },
      distance: Math.max(1, distance(points[0], points[1]) / current.scale),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("a, button")) return;
    const point = localPoint(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointersRef.current.size === 1) {
      gestureRef.current = { kind: "pan", pointerId: event.pointerId, start: point, view: viewRef.current };
    } else {
      suppressClickUntilRef.current = Date.now() + 350;
      beginPinch();
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = localPoint(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, point);
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (pointersRef.current.size >= 2) {
      if (gesture.kind !== "pinch") beginPinch();
      const pinch = gestureRef.current;
      const points = [...pointersRef.current.values()];
      const viewport = viewportRef.current;
      if (!viewport || pinch?.kind !== "pinch" || points.length < 2) return;
      const center = midpoint(points[0], points[1]);
      const rect = viewport.getBoundingClientRect();
      const scale = clampScale(distance(points[0], points[1]) / pinch.distance);
      suppressClickUntilRef.current = Date.now() + 350;
      setIsPanning(true);
      updateView({
        scale,
        x: center.x - rect.width / 2 - pinch.anchor.x * scale,
        y: center.y - rect.height / 2 - pinch.anchor.y * scale,
      });
      return;
    }

    if (gesture.kind === "pan" && gesture.pointerId === event.pointerId) {
      const x = gesture.view.x + point.x - gesture.start.x;
      const y = gesture.view.y + point.y - gesture.start.y;
      if (Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > 4) {
        suppressClickUntilRef.current = Date.now() + 350;
        setIsPanning(true);
      }
      updateView({ ...gesture.view, x, y });
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const remaining = [...pointersRef.current.entries()];
    if (remaining.length === 1) {
      gestureRef.current = { kind: "pan", pointerId: remaining[0][0], start: remaining[0][1], view: viewRef.current };
    } else if (remaining.length >= 2) {
      beginPinch();
    } else {
      gestureRef.current = null;
      setIsPanning(false);
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    zoomAt(viewRef.current.scale * factor, localPoint(event.clientX, event.clientY));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const movement = event.shiftKey ? 80 : 40;
    if (["+", "=", "-", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
    if (event.key === "+" || event.key === "=") zoomAt(viewRef.current.scale + TREE_SCALE_STEP);
    if (event.key === "-") zoomAt(viewRef.current.scale - TREE_SCALE_STEP);
    if (event.key === "0") updateView({ scale: 1, x: 0, y: 0 });
    if (event.key === "ArrowLeft") updateView({ ...viewRef.current, x: viewRef.current.x - movement });
    if (event.key === "ArrowRight") updateView({ ...viewRef.current, x: viewRef.current.x + movement });
    if (event.key === "ArrowUp") updateView({ ...viewRef.current, y: viewRef.current.y - movement });
    if (event.key === "ArrowDown") updateView({ ...viewRef.current, y: viewRef.current.y + movement });
  };

  const resetView = () => updateView({ scale: 1, x: 0, y: 0 });

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
        <div className="tree-legend"><span><i className="specific-dot" /> Specific</span><span><i className="conclusion-dot" /> Broader</span><span><i className="central-dot" /> Central</span></div>
        <div className="tree-panzoom-shell">
          <div className="tree-zoom-controls" aria-label="Tree zoom controls">
            <button type="button" onClick={() => zoomAt(viewRef.current.scale - TREE_SCALE_STEP)} aria-label="Zoom out">−</button>
            <output aria-live="polite">{Math.round(view.scale * 100)}%</output>
            <button type="button" onClick={() => zoomAt(viewRef.current.scale + TREE_SCALE_STEP)} aria-label="Zoom in">+</button>
            <button className="tree-reset-view" type="button" onClick={resetView}>Reset</button>
          </div>
          <p className="tree-panzoom-hint"><span className="tree-desktop-hint">Scroll to zoom · Drag to move</span><span className="tree-touch-hint">Pinch to zoom · Drag to move</span></p>
          <div
            className={`tree-viewport${isPanning ? " is-panning" : ""}`}
            ref={viewportRef}
            role="region"
            aria-label="Zoomable and movable Tree of Inquiry"
            tabIndex={0}
            onClickCapture={(event) => {
              if (Date.now() >= suppressClickUntilRef.current) return;
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntilRef.current = 0;
            }}
            onKeyDown={handleKeyDown}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onWheel={handleWheel}
          >
        <div
          className="concentric-tree"
          style={{ transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) scale(${view.scale})` }}
          aria-label="Concentric Tree of Inquiry with published connections between claims."
        >
          <svg className="concentric-lines" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" /><circle cx="50" cy="50" r="20" />
            {cms.connections.map((connection) => {
              const from = positions.get(connection.from);
              const to = positions.get(connection.to);
              if (!from || !to || !show(connection.from) || !show(connection.to)) return null;
              const strokeWidth = connectionStrokeWidth(connection.thickness);
              return <g key={`${connection.from}-${connection.to}`}><line className="claim-connection-halo" x1={from.x} y1={from.y} x2={to.x} y2={to.y} style={{ strokeWidth: strokeWidth + 2.5 }} strokeLinecap="round" vectorEffect="non-scaling-stroke" /><line className="claim-connection-line" x1={from.x} y1={from.y} x2={to.x} y2={to.y} style={{ strokeWidth }} strokeLinecap="round" vectorEffect="non-scaling-stroke" /></g>;
            })}
          </svg>
          <span className="ring-label ring-label-outer">Specific claims</span><span className="ring-label ring-label-inner">Broader claims</span>

          {specificClaims.map((claim, index) => { const position = point(index, specificClaims.length, 45); return show(claim.id) ? <Link className="tree-claim-node tree-specific-node" href={`/inquiry/list#claim-${claim.id}`} key={claim.id} style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-label={`Open claim ${claim.id}: ${claim.title}`}><span>#{claim.id}</span><b>{claim.title}</b></Link> : null; })}
          {broaderClaims.map((claim, index) => { const position = point(index, broaderClaims.length, 20, -90); return show(claim.id) ? <Link className="tree-conclusion-node" href={`/inquiry/list#claim-${claim.id}`} key={claim.id} style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-label={`Open claim ${claim.id}: ${claim.title}`}><span>#{claim.id}</span><b>{claim.title}</b></Link> : null; })}
          {show(centralClaim.id) && <Link className="tree-center-node" href={`/inquiry/list#claim-${centralClaim.id}`} aria-label={`Open central claim: ${centralClaim.title}`} />}
        </div>
          </div>
        </div>
      </div>

      <div className="tree-bottom-actions"><p className="tree-philosophy"><b>{cms.inquiry.philosophyTitle}</b> {cms.inquiry.philosophyText}</p><Link className="button button-quiet" href="/qa-rules#rules">Read the discussion rules</Link></div>
    </section>
  );
}
