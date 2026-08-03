import type { Metadata } from "next";
import { MissionContent } from "../components/PageContent";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Mission" };

export default function MissionPage() {
  return (
    <><SiteHeader /><MissionContent /><SiteFooter /></>
  );
}
