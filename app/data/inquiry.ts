export type Support = {
  id: string;
  title: string;
  description: string;
};

export type InquiryClaim = {
  id: string;
  level: "Central" | "Broader" | "Focused" | "Specific";
  title: string;
  statement: string;
  argument: string;
  supportIds: string[];
  evidence: { label: string; href: string }[];
  limitation: string;
};

export const supports: Support[] = [
  { id: "S01", title: "Law and procedure", description: "Statutes, court rules, and official procedures establish what the system is supposed to do." },
  { id: "S02", title: "Orders and opinions", description: "Published decisions and available orders show how legal standards are applied in particular cases." },
  { id: "S03", title: "Court system data", description: "Caseload, timing, disposition, and demographic data can reveal patterns that no single case can establish." },
  { id: "S04", title: "Oversight reports", description: "Audits, commission reports, and government reviews provide institutional findings and recommendations." },
  { id: "S05", title: "Scholarship", description: "Legal and social-science research helps test explanations, consequences, and competing interpretations." },
  { id: "S06", title: "Labeled accounts", description: "Carefully labeled testimony and personal accounts identify experiences that should be tested against other evidence." },
];

export const inquiryClaims: InquiryClaim[] = [
  {
    id: "1",
    level: "Central",
    title: "Family Court should be protective, explainable, and open to correction.",
    statement: "This is the central proposition being tested by the Tree of Inquiry.",
    argument: "The project will test whether the system protects children while explaining major decisions and allowing meaningful review and correction.",
    supportIds: [], evidence: [],
    limitation: "This is a direction for inquiry, not a claim that every case or professional fails this standard.",
  },
  {
    id: "2",
    level: "Broader",
    title: "Decision quality",
    statement: "Reliable outcomes depend on a sufficiently complete record and enough time for individualized review.",
    argument: "This broader claim will be evaluated through narrower claims about information, time, and decision-making.",
    supportIds: [], evidence: [],
    limitation: "The claims and connections supporting this conclusion are still being developed.",
  },
  {
    id: "3",
    level: "Broader",
    title: "Meaningful participation",
    statement: "Children and families need a real opportunity to understand, participate in, and respond to the process.",
    argument: "This broader claim will be evaluated through narrower claims about notice, access, voice, and representation.",
    supportIds: [], evidence: [],
    limitation: "The claims and connections supporting this conclusion are still being developed.",
  },
  {
    id: "4",
    level: "Broader",
    title: "Public accountability",
    statement: "A system improves when its reasoning, performance, and correction mechanisms can be evaluated responsibly.",
    argument: "This broader claim will be evaluated through narrower claims about transparency, oversight, data, and review.",
    supportIds: [], evidence: [],
    limitation: "The claims and connections supporting this conclusion are still being developed.",
  },
  {
    id: "5",
    level: "Focused",
    title: "Incomplete records",
    statement: "Life-shaping orders may sometimes be made without enough reliable information about the child and family.",
    argument: "When a court lacks important facts, the risk of an inaccurate or poorly tailored order increases. The inquiry asks what information was available, what was missing, and whether the gap mattered.",
    supportIds: ["S01", "S02", "S06"], evidence: [],
    limitation: "Published opinions often omit facts that were available to the trial court. Silence in an opinion does not prove that no investigation occurred.",
  },
  {
    id: "6",
    level: "Focused",
    title: "Conflict escalation",
    statement: "Adversarial procedures may deepen family conflict when the original problem could be resolved safely another way.",
    argument: "The inquiry compares the protective value of formal litigation with its possible effect on communication, trust, cost, and family relationships.",
    supportIds: ["S04", "S05", "S06"], evidence: [],
    limitation: "Less adversarial processes are not appropriate where violence, coercion, or a serious power imbalance makes informal resolution unsafe.",
  },
  {
    id: "7",
    level: "Focused",
    title: "Limited scrutiny",
    statement: "Confidentiality protects families, but limited public visibility may also make independent scrutiny and system learning harder.",
    argument: "The inquiry tests whether anonymized decisions, aggregate data, and protected review can improve oversight without exposing families.",
    supportIds: ["S01", "S03", "S04"], evidence: [],
    limitation: "Greater disclosure can harm children and families. Any transparency proposal must preserve meaningful privacy protections.",
  },
  {
    id: "8",
    level: "Focused",
    title: "Temporary becomes lasting",
    statement: "Temporary arrangements may influence later outcomes because they become the child’s new status quo.",
    argument: "The inquiry asks when stability is a valid consideration and when delay turns an interim choice into a self-reinforcing result.",
    supportIds: ["S02", "S05", "S06"], evidence: [],
    limitation: "Maintaining stability can protect a child. The concern is whether avoidable delay or an incomplete interim record created it.",
  },
  {
    id: "9",
    level: "Specific",
    title: "Difficult correction",
    statement: "Families may face practical barriers when trying to correct a harmful mistake after an order is entered.",
    argument: "Appeal deadlines, standards of review, cost, missing records, and the passage of time can affect whether an alleged error receives meaningful review.",
    supportIds: ["S01", "S02", "S04"], evidence: [],
    limitation: "Finality and stability are legitimate goals. A correction system must discourage repetitive litigation while preserving review of serious errors.",
  },
  {
    id: "10",
    level: "Specific",
    title: "Unequal participation",
    statement: "Language, disability, age, and unfamiliarity with procedure may prevent some people from participating on equal terms.",
    argument: "The inquiry looks for understandable notice, interpretation, disability accommodations, and an opportunity to communicate a position.",
    supportIds: ["S03", "S04", "S05", "S06"], evidence: [],
    limitation: "An unfavorable result does not establish that participation was unequal. The claim requires evidence about the process itself.",
  },
  {
    id: "11",
    level: "Specific",
    title: "Pressure for speed",
    statement: "Heavy caseloads and delay may create pressure to resolve cases faster than individualized review permits.",
    argument: "The inquiry examines whether institutional pressure changes the depth of review or explanation.",
    supportIds: ["S03", "S04", "S05"], evidence: [],
    limitation: "Efficiency is not inherently opposed to fairness. Better case management can reduce delay while preserving individualized review.",
  },
  {
    id: "12",
    level: "Specific",
    title: "Missing public data",
    statement: "The public may lack consistent, anonymized data needed to evaluate whether Family Court outcomes improve children’s well-being.",
    argument: "Without comparable measures of timing, outcomes, reversals, access, and follow-up, broad claims about system performance are difficult to test.",
    supportIds: ["S03", "S04", "S05"], evidence: [],
    limitation: "Administrative data cannot capture every relevant human outcome, and poorly designed metrics can distort institutional behavior.",
  },
];

export const centralClaim = inquiryClaims.find((claim) => claim.level === "Central")!;
export const broaderClaims = inquiryClaims.filter((claim) => claim.level === "Broader");
export const focusedClaims = inquiryClaims.filter((claim) => claim.level === "Focused");
export const specificClaims = inquiryClaims.filter((claim) => claim.level === "Specific");
