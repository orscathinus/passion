import type { Metadata } from "next";
import { PageIntro, SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Who We Are" };
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function WhoPage() {
  return (
    <><SiteHeader /><main>
      <PageIntro eyebrow="Who we are" title="A student-led project built around civic inquiry." lede="Use this page as a clean template. Replace the bracketed text with your final biography, roles, and verified credentials before publishing." />
      <section className="section shell profile-layout profile-layout-single">
        <article className="profile-card"><div className="profile-monogram">YN</div><div><p className="eyebrow">Founder + lead researcher</p><h2>[Your full name]</h2><p className="profile-role">[Student researcher · School · Graduation year]</p><p>[Write 100–150 words explaining who you are and your relevant background. Keep the focus on the work and avoid private family details.]</p></div></article>
      </section>
      <section className="section shell"><div className="section-heading"><p className="eyebrow">Research paper</p><h2>Project research</h2></div><div className="publication-grid publication-grid-single"><a href={`${basePath}/documents/research-paper.pdf`} target="_blank" rel="noreferrer" className="publication-card"><span>Research paper</span><h3>Independent Advocacy for Children in New York Family Court</h3><p>A document-based study of structural risk and independent advocacy.</p><b>Open paper ↗</b></a></div></section>
    </main><SiteFooter /></>
  );
}
