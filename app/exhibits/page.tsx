import type { Metadata } from "next";
import { ExhibitsContent } from "../components/ExhibitsContent";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Exhibits & Evidence" };

export default function ExhibitsPage() {
  return (
    <><SiteHeader /><ExhibitsContent /><SiteFooter /></>
  );
}
