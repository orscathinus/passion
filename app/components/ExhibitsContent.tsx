"use client";

import { useCmsDocument } from "./CmsProvider";
import { ExhibitBrowser } from "./ExhibitBrowser";
import { PageIntro } from "./SiteChrome";

export function ExhibitsContent() {
  const { exhibits } = useCmsDocument();
  return <main><PageIntro eyebrow={exhibits.eyebrow} title={exhibits.title} lede={exhibits.lede} /><ExhibitBrowser /></main>;
}
