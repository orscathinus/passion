import type { Metadata } from "next";
import { InquiryTree } from "../components/InquiryTree";
import { PageIntro, SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Tree of Inquiry" };

export default function InquiryPage() {
  return (
    <><SiteHeader /><main>
      <PageIntro eyebrow="Tree of Inquiry · Family Court" title="Start at the outside. Test every step inward." lede="All claims use one numbering system. Connections between claims are intentionally blank until the project’s administrators add them." />
      <div className="shell caution-banner"><b>Read claims as questions under investigation.</b><span>A listed claim is not automatically a proven fact.</span></div>
      <InquiryTree />
    </main><SiteFooter /></>
  );
}
