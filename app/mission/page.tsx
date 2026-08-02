import type { Metadata } from "next";
import { PageIntro, SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Mission" };

export default function MissionPage() {
  return (
    <><SiteHeader /><main>
      <PageIntro eyebrow="Our mission" title="Mission statement coming soon." lede="This space is reserved for the project’s final mission, background, and goals." />
      <section className="section shell mission-placeholder">
        <p>[Your mission statement will be added here.]</p>
      </section>
      <section className="section shell publication-single"><div><p className="eyebrow">Project proposal</p><h2>Read the proposal</h2><p>The proposal is provided as a document and opens directly as a PDF.</p></div><a className="button button-primary" href="/documents/project-proposal.pdf" target="_blank" rel="noreferrer">Open proposal <span aria-hidden="true">↗</span></a></section>
    </main><SiteFooter /></>
  );
}
