import type { Metadata } from "next";
import { InquiryPageContent } from "../../components/InquiryPageContent";
import { SiteFooter, SiteHeader } from "../../components/SiteChrome";

export const metadata: Metadata = { title: "Focused Claims" };

export default function InquiryListPage() {
  return (
    <><SiteHeader /><InquiryPageContent mode="list" /><SiteFooter /></>
  );
}
