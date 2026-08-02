import type { Metadata } from "next";
import { InquiryList } from "../../components/InquiryList";
import { PageIntro, SiteFooter, SiteHeader } from "../../components/SiteChrome";

export const metadata: Metadata = { title: "Focused Claims" };

export default function InquiryListPage() {
  return (
    <><SiteHeader /><main>
      <PageIntro eyebrow="Tree of Inquiry · List mode" title="Test every claim at its strongest point." lede="Every claim uses the same numbering system and has a place for its argument, supports, evidence, and limitations." />
      <div className="shell caution-banner"><b>Claims remain open to challenge.</b><span>A place in this list does not make a statement a proven fact.</span></div>
      <InquiryList />
    </main><SiteFooter /></>
  );
}
