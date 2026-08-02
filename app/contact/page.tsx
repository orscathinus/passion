import type { Metadata } from "next";
import { ContactContent } from "../components/ContactContent";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Contact + Contributions" };

export default function ContactPage() {
  return (
    <><SiteHeader /><ContactContent /><SiteFooter /></>
  );
}
