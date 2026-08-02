import type { Metadata } from "next";
import { PageIntro, SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Q&A + Rules" };

const faqs = [
  ["What are the rules for discussion?", "Use evidence. Address one claim at a time. Protect children and private information. Do not share sealed records. Do not harass or target people. Separate facts from interpretations, represent opposing positions fairly, correct the record when credible evidence changes the analysis, and keep the discussion focused on understanding and reform."],
  ["Is AllegoryNow arguing that every Family Court decision is wrong?", "No. The project studies structural risks and recurring questions. Individual judges, attorneys, and cases differ, and evidence should not be stretched beyond what it shows."],
  ["Does appearing in the Tree of Inquiry mean a claim is proven?", "No. The tree includes questions at different stages. Each claim should show its status, supports, counterarguments, and limits."],
  ["What counts as evidence?", "Court opinions, statutes, rules, official reports, academic research, reliable data, and carefully labeled first-person accounts. Each type has different strengths and limits."],
  ["Why include personal accounts at all?", "Accounts can reveal questions that institutional records miss. They are labeled and corroborated where possible; one account is not treated as proof of a system-wide pattern."],
  ["Can I submit a disagreement?", "Yes. A specific counterargument with reasons or sources is one of the most useful contributions you can make."],
  ["Is this legal advice?", "No. The site is for research and public education. Anyone facing a legal problem should speak with a qualified attorney or legal-services organization."],
  ["Why focus on attorneys for children first?", "Independent representation is central when courts make decisions that affect a child's relationships, stability, and rights. It is also a focused question that can be studied through rules, cases, and scholarship."],
  ["How are corrections handled?", "Corrections should identify the exact statement, explain the issue, and provide a source when possible. Material changes will be reflected in the relevant claim or exhibit."],
];

export default function QaRulesPage() {
  return (
    <><SiteHeader /><main>
      <PageIntro eyebrow="Q&A" title="Questions and discussion rules." lede="The rules appear as the first question so they are easy to find and link to directly." />
      <section className="section shell qa-single"><div><p className="eyebrow">Frequently asked questions</p><div className="faq-list">{faqs.map(([q, a], index) => <details id={index === 0 ? "rules" : undefined} key={q} open={index === 0}><summary><span>{q}</span><i aria-hidden="true">+</i></summary><p>{a}</p></details>)}</div></div></section>
    </main><SiteFooter /></>
  );
}
