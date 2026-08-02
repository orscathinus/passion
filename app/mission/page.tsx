import type { Metadata } from "next";
import { MissionContent } from "../components/PageContent";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Mission" };
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function MissionPage() {
  return (
    <><SiteHeader /><MissionContent basePath={basePath} /><SiteFooter /></>
  );
}
