"use client";

import { useCmsDocument } from "./CmsProvider";
import { ContributionForm } from "./ContributionForm";
import { PageIntro } from "./SiteChrome";

export function ContactContent() {
  const { contact } = useCmsDocument();
  return <main>
    <PageIntro eyebrow={contact.eyebrow} title={contact.title} lede={contact.lede} />
    <section className="section shell contribution-layout">
      <div>
        <p className="eyebrow">Two ways to contribute</p>
        <div className="contribution-types contribution-types-single">
          <article><span>01</span><h3>{contact.respondTitle}</h3><p>{contact.respondText}</p></article>
          <article><span>02</span><h3>{contact.proposeTitle}</h3><p>{contact.proposeText}</p></article>
        </div>
        <div className="privacy-box"><b>{contact.privacyTitle}</b><p>{contact.privacyText}</p></div>
      </div>
      <div>
        <div className="upload-feature-card">
          <span aria-hidden="true">PDF</span>
          <div><p className="eyebrow">File submissions enabled</p><h2>Upload PDFs or supporting files</h2><p>Attach up to five research files directly in the form below. Files are stored privately and are visible only to the AllegoryNow administrator unless later reviewed and intentionally published.</p></div>
        </div>
        <p className="eyebrow">Submit a contribution</p>
        <ContributionForm />
      </div>
    </section>
  </main>;
}
