import type { Metadata } from "next";
import { WhoContent } from "../components/PageContent";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Who We Are" };
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function WhoPage() {
  return (
    <><SiteHeader /><WhoContent basePath={basePath} /><SiteFooter /></>
  );
}
