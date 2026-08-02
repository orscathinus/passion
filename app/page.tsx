"use client";

import Link from "next/link";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import { useCmsDocument } from "./components/CmsProvider";

export default function Home() {
  const cms = useCmsDocument();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="home-hero">
          <div className="shell home-hero-inner home-hero-grid">
            <div className="hero-copy">
              <h1>{cms.home.headline}</h1>
              <div className="button-row">
                <Link className="button button-primary" href="/inquiry">{cms.home.primaryButton} <span aria-hidden="true">→</span></Link>
                <Link className="button button-hero-quiet" href="/mission">{cms.home.secondaryButton}</Link>
              </div>
            </div>
            <div className="hero-path-art" aria-label={`A winding path reaching ${cms.home.goalLabel}`} role="img">
              <svg viewBox="0 0 520 560" aria-hidden="true">
                <path className="path-shadow" d="M62 516 C62 420 208 454 196 356 C184 258 358 319 338 207 C321 112 440 141 458 55" />
                <path className="path-dashes" d="M62 516 C62 420 208 454 196 356 C184 258 358 319 338 207 C321 112 440 141 458 55" />
                <circle className="path-start" cx="62" cy="516" r="8" />
                <circle className="path-goal-ring" cx="458" cy="55" r="27" />
                <circle className="path-goal" cx="458" cy="55" r="8" />
              </svg>
              <span className="path-goal-label">{cms.home.goalLabel}</span>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
