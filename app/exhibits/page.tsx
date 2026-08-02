import type { Metadata } from "next";
import { ExhibitBrowser } from "../components/ExhibitBrowser";
import { PageIntro, SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Exhibits & Evidence" };

export default function ExhibitsPage() {
  return (
    <><SiteHeader /><main>
      <PageIntro eyebrow="Exhibits + evidence" title="Family Court exhibits." lede="This collection is separate from the research paper. Exhibit #1 is a placeholder template for future entries." />
      <ExhibitBrowser />
    </main><SiteFooter /></>
  );
}
