"use client";

import { useCmsDocument } from "./CmsProvider";
import { InquiryList } from "./InquiryList";
import { InquiryTree } from "./InquiryTree";
import { PageIntro } from "./SiteChrome";

export function InquiryPageContent({ mode }: { mode: "list" | "tree" }) {
  const { inquiry } = useCmsDocument();
  const isList = mode === "list";
  return <main>
    <PageIntro
      eyebrow={isList ? "Tree of Inquiry · List mode" : inquiry.eyebrow}
      title={isList ? "Test every claim at its strongest point." : inquiry.title}
      lede={isList ? "Every claim uses the same numbering system and has a place for its argument, supports, evidence, and limitations." : inquiry.lede}
    />
    <div className="shell caution-banner"><b>{isList ? "Claims remain open to challenge." : inquiry.cautionTitle}</b><span>{isList ? "A place in this list does not make a statement a proven fact." : inquiry.cautionText}</span></div>
    {isList ? <InquiryList /> : <InquiryTree />}
  </main>;
}
