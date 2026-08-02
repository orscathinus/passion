"use client";

import { useCmsDocument } from "./CmsProvider";
import { PageIntro } from "./SiteChrome";

export function QaContent() {
  const { qa } = useCmsDocument();
  return <main>
    <PageIntro eyebrow={qa.eyebrow} title={qa.title} lede={qa.lede} />
    <section className="section shell qa-single"><div><p className="eyebrow">Frequently asked questions</p><div className="faq-list">{qa.items.map((item, index) => <details id={index === 0 ? "rules" : undefined} key={`${index}-${item.question}`} open={index === 0}><summary><span>{item.question}</span><i aria-hidden="true">+</i></summary><p>{item.answer}</p></details>)}</div></div></section>
  </main>;
}
