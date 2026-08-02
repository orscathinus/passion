import type { Metadata } from "next";
import { InquiryPageContent } from "../components/InquiryPageContent";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Tree of Inquiry" };

export default function InquiryPage() {
  return (
    <><SiteHeader /><InquiryPageContent mode="tree" /><SiteFooter /></>
  );
}
