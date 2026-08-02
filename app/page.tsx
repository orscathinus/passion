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
          <div className="shell home-hero-inner">
            <div className="hero-copy">
              <h1>{cms.home.headline}</h1>
              <div className="button-row">
                <Link className="button button-primary" href="/inquiry">{cms.home.primaryButton} <span aria-hidden="true">→</span></Link>
                <Link className="button button-hero-quiet" href="/mission">{cms.home.secondaryButton}</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
