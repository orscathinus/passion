"use client";

import { useCmsDocument } from "./CmsProvider";
import { defaultCmsDocument } from "../data/cms";
import { ExhibitBrowser } from "./ExhibitBrowser";
import { PageIntro } from "./SiteChrome";

export function ExhibitsContent() {
  const document = useCmsDocument();
  const exhibits = document?.exhibits ?? defaultCmsDocument.exhibits;

  return (
    <main>
      <PageIntro
        eyebrow={exhibits.eyebrow ?? defaultCmsDocument.exhibits.eyebrow}
        title={exhibits.title ?? defaultCmsDocument.exhibits.title}
        lede={exhibits.lede ?? defaultCmsDocument.exhibits.lede}
      />
      <ExhibitBrowser />
    </main>
  );
}
