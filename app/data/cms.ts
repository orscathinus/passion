import { inquiryClaims, supports, type InquiryClaim, type Support } from "./inquiry";

export type FaqItem = {
  answer: string;
  question: string;
};

export type Exhibit = {
  description: string;
  href: string;
  no: string;
  title: string;
};

export type ClaimConnection = {
  from: string;
  thickness: number;
  to: string;
};

export type CmsDocument = {
  schemaVersion: 1;
  site: {
    brandName: string;
    footerLeft: string;
    footerRight: string;
  };
  home: {
    goalLabel: string;
    headline: string;
    primaryButton: string;
    secondaryButton: string;
  };
  mission: {
    body: string;
    eyebrow: string;
    lede: string;
    proposalButton: string;
    proposalEyebrow: string;
    proposalText: string;
    proposalTitle: string;
    title: string;
  };
  who: {
    bio: string;
    eyebrow: string;
    lede: string;
    monogram: string;
    name: string;
    role: string;
    title: string;
  };
  inquiry: {
    cautionText: string;
    cautionTitle: string;
    eyebrow: string;
    lede: string;
    philosophyText: string;
    philosophyTitle: string;
    title: string;
  };
  supports: Support[];
  claims: InquiryClaim[];
  connections: ClaimConnection[];
  exhibits: {
    eyebrow: string;
    items: Exhibit[];
    lede: string;
    title: string;
  };
  qa: {
    eyebrow: string;
    items: FaqItem[];
    lede: string;
    title: string;
  };
  contact: {
    eyebrow: string;
    lede: string;
    privacyText: string;
    privacyTitle: string;
    proposeText: string;
    proposeTitle: string;
    respondText: string;
    respondTitle: string;
    title: string;
  };
};

export const defaultCmsDocument: CmsDocument = {
  schemaVersion: 1,
  site: {
    brandName: "AllegoryNow",
    footerLeft: "© 2026 AllegoryNow",
    footerRight: "Research and public education only.",
  },
  home: {
    goalLabel: "A clearer path to accountability",
    headline: "Follow the evidence. See where it leads.",
    primaryButton: "Explore the Tree",
    secondaryButton: "Read our mission",
  },
  mission: {
    eyebrow: "Our mission",
    title: "Mission statement coming soon.",
    lede: "This space is reserved for the project’s final mission, background, and goals.",
    body: "[Your mission statement will be added here.]",
    proposalEyebrow: "Reform proposal",
    proposalTitle: "Family Court reform proposal",
    proposalText: "A detailed proposal for improving the Family Court system will be added here when it is ready for publication.",
    proposalButton: "Coming soon",
  },
  who: {
    eyebrow: "Who we are",
    title: "A student-led project built around civic inquiry.",
    lede: "Use this page as a clean template. Replace the bracketed text with your final biography, roles, and verified credentials before publishing.",
    monogram: "YN",
    name: "[Your full name]",
    role: "[Student researcher · School · Graduation year]",
    bio: "[Write 100–150 words explaining who you are and your relevant background. Keep the focus on the work and avoid private family details.]",
  },
  inquiry: {
    eyebrow: "Tree of Inquiry · Family Court",
    title: "Start at the outside. Test every step inward.",
    lede: "All claims use one numbering system. Connections between claims are intentionally blank until the project’s administrators add them.",
    cautionTitle: "Read claims as questions under investigation.",
    cautionText: "A listed claim is not automatically a proven fact.",
    philosophyTitle: "Connections are intentionally blank.",
    philosophyText: "The project’s administrators will add lines after deciding which claims support one another.",
  },
  supports: supports.map((support) => ({ ...support })),
  claims: inquiryClaims.map((claim) => ({
    ...claim,
    evidence: claim.evidence.map((item) => ({ ...item })),
    supportIds: [...claim.supportIds],
  })),
  connections: [],
  exhibits: {
    eyebrow: "Exhibits + evidence",
    title: "Family Court exhibits.",
    lede: "This collection is separate from the research paper. Exhibit #1 is a placeholder template for future entries.",
    items: [{
      no: "1",
      title: "[Exhibit title]",
      description: "[Briefly describe the exhibit and explain how it supports or challenges a claim.]",
      href: "",
    }],
  },
  qa: {
    eyebrow: "Q&A",
    title: "Questions and discussion rules.",
    lede: "The rules appear as the first question so they are easy to find and link to directly.",
    items: [
      { question: "What are the rules for discussion?", answer: "Use evidence. Address one claim at a time. Protect children and private information. Do not share sealed records. Do not harass or target people. Separate facts from interpretations, represent opposing positions fairly, correct the record when credible evidence changes the analysis, and keep the discussion focused on understanding and reform." },
      { question: "Is AllegoryNow arguing that every Family Court decision is wrong?", answer: "No. The project studies structural risks and recurring questions. Individual judges, attorneys, and cases differ, and evidence should not be stretched beyond what it shows." },
      { question: "Does appearing in the Tree of Inquiry mean a claim is proven?", answer: "No. The tree includes questions at different stages. Each claim should show its status, supports, counterarguments, and limits." },
      { question: "What counts as evidence?", answer: "Court opinions, statutes, rules, official reports, academic research, reliable data, and carefully labeled first-person accounts. Each type has different strengths and limits." },
      { question: "Why include personal accounts at all?", answer: "Accounts can reveal questions that institutional records miss. They are labeled and corroborated where possible; one account is not treated as proof of a system-wide pattern." },
      { question: "Can I submit a disagreement?", answer: "Yes. A specific counterargument with reasons or sources is one of the most useful contributions you can make." },
      { question: "Is this legal advice?", answer: "No. The site is for research and public education. Anyone facing a legal problem should speak with a qualified attorney or legal-services organization." },
      { question: "Why focus on attorneys for children first?", answer: "Independent representation is central when courts make decisions that affect a child's relationships, stability, and rights. It is also a focused question that can be studied through rules, cases, and scholarship." },
      { question: "How are corrections handled?", answer: "Corrections should identify the exact statement, explain the issue, and provide a source when possible. Material changes will be reflected in the relevant claim or exhibit." },
    ],
  },
  contact: {
    eyebrow: "Contact + contributions",
    title: "Contribute to a specific claim.",
    lede: "Support or refute an existing numbered claim with evidence, or propose a new claim for administrator review. Every contribution requires evidence.",
    respondTitle: "Respond to a claim",
    respondText: "Name the claim, choose support or refute, and provide evidence for your position.",
    proposeTitle: "Propose a claim",
    proposeText: "State one specific new claim and provide evidence that administrators can review.",
    privacyTitle: "Protect private information",
    privacyText: "Do not submit names of children, home addresses, medical details, sealed records, or other identifying case information.",
  },
};
