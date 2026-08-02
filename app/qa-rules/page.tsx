import type { Metadata } from "next";
import { QaContent } from "../components/QaContent";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Q&A + Rules" };

export default function QaRulesPage() {
  return (
    <><SiteHeader /><QaContent /><SiteFooter /></>
  );
}
