"use client";

import { useCmsDocument } from "./CmsProvider";
import { PageIntro } from "./SiteChrome";

export function MissionContent({ basePath }: { basePath: string }) {
  const { mission } = useCmsDocument();
  return <main>
    <PageIntro eyebrow={mission.eyebrow} title={mission.title} lede={mission.lede} />
    <section className="section shell mission-placeholder"><p>{mission.body}</p></section>
    <section className="section shell publication-single"><div><p className="eyebrow">{mission.proposalEyebrow}</p><h2>{mission.proposalTitle}</h2><p>{mission.proposalText}</p></div><a className="button button-primary" href={`${basePath}/documents/project-proposal.pdf`} target="_blank" rel="noreferrer">{mission.proposalButton} <span aria-hidden="true">↗</span></a></section>
  </main>;
}

export function WhoContent({ basePath }: { basePath: string }) {
  const { who } = useCmsDocument();
  return <main>
    <PageIntro eyebrow={who.eyebrow} title={who.title} lede={who.lede} />
    <section className="section shell profile-layout profile-layout-single">
      <article className="profile-card"><div className="profile-monogram">{who.monogram}</div><div><p className="eyebrow">Founder + lead researcher</p><h2>{who.name}</h2><p className="profile-role">{who.role}</p><p>{who.bio}</p></div></article>
    </section>
    <section className="section shell"><div className="section-heading"><p className="eyebrow">Research paper</p><h2>Project research</h2></div><div className="publication-grid publication-grid-single"><a href={`${basePath}/documents/research-paper.pdf`} target="_blank" rel="noreferrer" className="publication-card"><span>Research paper</span><h3>{who.paperTitle}</h3><p>{who.paperDescription}</p><b>Open paper ↗</b></a></div></section>
  </main>;
}
