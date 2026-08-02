"use client";

import { useCmsDocument } from "./CmsProvider";
import { ContributionForm } from "./ContributionForm";
import { PageIntro } from "./SiteChrome";

export function ContactContent() {
  const { contact } = useCmsDocument();
  return <main>
    <PageIntro eyebrow={contact.eyebrow} title={contact.title} lede={contact.lede} />
    <section className="section shell contribution-layout"><div><p className="eyebrow">Two ways to contribute</p><div className="contribution-types contribution-types-single"><article><span>01</span><h3>{contact.respondTitle}</h3><p>{contact.respondText}</p></article><article><span>02</span><h3>{contact.proposeTitle}</h3><p>{contact.proposeText}</p></article></div><div className="privacy-box"><b>{contact.privacyTitle}</b><p>{contact.privacyText}</p></div></div><div><p className="eyebrow">Prepare a contribution</p><ContributionForm /></div></section>
  </main>;
}
