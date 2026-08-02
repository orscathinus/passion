import type { Metadata } from "next";
import { ContributionForm } from "../components/ContributionForm";
import { PageIntro, SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Contact + Contributions" };

export default function ContactPage() {
  return (
    <><SiteHeader /><main>
      <PageIntro eyebrow="Contact + contributions" title="Contribute to a specific claim." lede="Support or refute an existing numbered claim with evidence, or propose a new claim for administrator review. Every contribution requires evidence." />
      <section className="section shell contribution-layout"><div><p className="eyebrow">Two ways to contribute</p><div className="contribution-types contribution-types-single"><article><span>01</span><h3>Respond to a claim</h3><p>Name the claim, choose support or refute, and provide evidence for your position.</p></article><article><span>02</span><h3>Propose a claim</h3><p>State one specific new claim and provide evidence that administrators can review.</p></article></div><div className="privacy-box"><b>Protect private information</b><p>Do not submit names of children, home addresses, medical details, sealed records, or other identifying case information.</p></div></div><div><p className="eyebrow">Prepare a contribution</p><ContributionForm /></div></section>
    </main><SiteFooter /></>
  );
}
