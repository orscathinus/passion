import type { Metadata } from "next";
import { WhoContent } from "../components/PageContent";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Who We Are" };

export default function WhoPage() {
  return (
    <><SiteHeader /><WhoContent /><SiteFooter /></>
  );
}
