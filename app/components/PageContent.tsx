"use client";

import { useCmsDocument } from "./CmsProvider";
import { PageIntro } from "./SiteChrome";

export function MissionContent() {
  const { mission } = useCmsDocument();
  return <main>
    <PageIntro eyebrow={mission.eyebrow} title={mission.title} lede={mission.lede} />
    <section className="section shell mission-placeholder"><p>{mission.body}</p></section>
    <section className="section shell publication-single"><div><p className="eyebrow">{mission.proposalEyebrow}</p><h2>{mission.proposalTitle}</h2><p>{mission.proposalText}</p></div></section>
  </main>;
}

export function WhoContent() {
  const { who } = useCmsDocument();
  return <main>
    <PageIntro eyebrow={who.eyebrow} title={who.title} lede={who.lede} />
    <section className="section shell profile-layout profile-layout-single">
      <article className="profile-card"><div className="profile-monogram">{who.monogram}</div><div><p className="eyebrow">Founder + lead researcher</p><h2>{who.name}</h2><p className="profile-role">{who.role}</p><p>{who.bio}</p></div></article>
    </section>
  </main>;
}
