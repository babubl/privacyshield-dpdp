// localStorage shim for standalone deployment
if (!window.storage) {
  window.storage = {
    get: async (key) => { const v = localStorage.getItem(key); return v ? { key, value: v } : null; },
    set: async (key, value) => { localStorage.setItem(key, value); return { key, value }; },
    delete: async (key) => { localStorage.removeItem(key); return { key, deleted: true }; },
    list: async (prefix) => { const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix)); return { keys }; },
  };
}

import { useState, useEffect, useRef, useMemo } from "react";

const F = "'DM Sans',system-ui,sans-serif";
const M = "'JetBrains Mono',monospace";
const C = {
  bg: "#06090f", p1: "#0b0f19", p2: "#101727", p3: "#162035",
  bd: "#1a2744", bdL: "#253a5e",
  tx: "#e8ecf4", txM: "#94a3bb", txD: "#5d6f8a",
  g: "#10b981", gD: "#059669", gBg: "rgba(16,185,129,.07)", gBd: "rgba(16,185,129,.18)",
  y: "#eab308", yBg: "rgba(234,179,8,.07)", yBd: "rgba(234,179,8,.18)",
  r: "#ef4444", rBg: "rgba(239,68,68,.07)", rBd: "rgba(239,68,68,.18)",
  b: "#3b82f6", bBg: "rgba(59,130,246,.07)", bBd: "rgba(59,130,246,.18)",
  v: "#8b5cf6", vBg: "rgba(139,92,246,.07)",
};

const DEADLINE = new Date("2027-05-13");
const daysLeft = () => Math.ceil((DEADLINE - new Date()) / 86400000);

const ACT = [
  { ch: "II", title: "Obligations of Data Fiduciaries", items: [
    { s: "S.4", n: "Grounds for Processing", law: "Personal data shall be processed only for a lawful purpose for which the Data Principal has given consent, or for certain legitimate uses.", bank: "Map every processing activity to its legal ground. Marketing, cross-selling, credit scoring, analytics REQUIRE explicit consent. KYC (PMLA), regulatory reporting (RBI/SEBI), fraud prevention can rely on legal obligation.", prio: "critical", controls: [
      { id: "S4-1", q: "Have you mapped all data processing activities to their legal basis (consent vs legitimate use)?", area: "consent" },
      { id: "S4-2", q: "Are marketing and cross-selling activities dependent on explicit, granular consent?", area: "consent" },
      { id: "S4-3", q: "Have you documented justification for each legitimate-use processing claim?", area: "governance" },
    ]},
    { s: "S.5", n: "Notice Requirements", law: "Before or at the time of collecting personal data, the Data Fiduciary must give a clear notice describing what data is collected, the purpose, how to exercise rights, and how to file complaints.", bank: "Every account opening, loan application, mobile app onboarding, internet banking registration, and call center interaction needs a DPDP-compliant notice in a language the customer understands.", prio: "critical", controls: [
      { id: "S5-1", q: "Do your account opening forms include DPDP-compliant privacy notices?", area: "notice" },
      { id: "S5-2", q: "Are privacy notices available in regional languages (Hindi, Tamil, Bengali, etc.)?", area: "notice" },
      { id: "S5-3", q: "Does your mobile app display purpose-wise notices before collecting data?", area: "notice" },
      { id: "S5-4", q: "Have branch staff been trained on verbal notice requirements?", area: "training" },
    ]},
    { s: "S.6", n: "Consent Requirements", law: "Consent must be free, specific, informed, unconditional, and unambiguous. Given for a specified purpose. Can be withdrawn at any time with the same ease as giving it.", bank: "The current broad T&C checkbox does NOT meet this standard. Each purpose needs separate opt-in. Customers must withdraw marketing consent as easily as they gave it.", prio: "critical", controls: [
      { id: "S6-1", q: "Do you collect consent per purpose (not a single 'I agree to all' checkbox)?", area: "consent" },
      { id: "S6-2", q: "Can customers withdraw specific consent types via app/internet banking (one-click)?", area: "consent" },
      { id: "S6-3", q: "Do you generate and store consent receipts with timestamp, purpose, channel, and hash?", area: "consent" },
      { id: "S6-4", q: "Does consent withdrawal propagate to all downstream systems (CRM, SMS gateway, email)?", area: "consent" },
    ]},
    { s: "S.7", n: "Consent for Children", law: "Processing data of children (under 18) requires verifiable parental/guardian consent. Tracking and targeted advertising directed at children is prohibited.", bank: "Minor savings accounts, education loans involving minors, and any app gamification targeting young users must have verifiable parental consent and zero behavioral tracking.", prio: "high", controls: [
      { id: "S7-1", q: "Have you identified all products/services used by minors (minor accounts, education loans)?", area: "consent" },
      { id: "S7-2", q: "Is there a verified parental consent mechanism for minor accounts?", area: "consent" },
    ]},
    { s: "S.8", n: "Security Safeguards & Breach Notification", law: "Data Fiduciary must implement reasonable security safeguards. In case of breach, must notify the Data Protection Board and affected Data Principals within the prescribed timeline.", bank: "Encryption at rest and in transit for ALL PII, access controls, audit logging, a 72-hour breach notification protocol, and SIEM integration for PII access monitoring.", prio: "critical", controls: [
      { id: "S8-1", q: "Is all personal data encrypted at rest (AES-256) across CBS, CRM, data warehouse?", area: "security" },
      { id: "S8-2", q: "Are all internal and external data transfers encrypted (TLS 1.3)?", area: "security" },
      { id: "S8-3", q: "Are audit logs enabled on all systems processing personal data?", area: "security" },
      { id: "S8-4", q: "Do you have a documented 72-hour breach notification workflow?", area: "breach" },
      { id: "S8-5", q: "Are DPB notification templates pre-drafted and approved by legal?", area: "breach" },
      { id: "S8-6", q: "Can you notify affected customers individually in their preferred language?", area: "breach" },
      { id: "S8-7", q: "Is your SIEM configured to detect abnormal PII access patterns?", area: "breach" },
      { id: "S8-8", q: "Do you conduct quarterly breach simulation drills?", area: "breach" },
    ]},
    { s: "S.9", n: "Data Retention & Erasure", law: "Personal data must be erased once the purpose is fulfilled and retention is no longer necessary, unless required by law.", bank: "Closed accounts, rejected loan applications, inactive customers data must be erased after retention period. RBI requires 10-year transaction retention, but marketing preferences and session logs have no such protection.", prio: "high", controls: [
      { id: "S9-1", q: "Have you mapped retention periods for each data category against RBI requirements?", area: "retention" },
      { id: "S9-2", q: "Is there automated erasure for expired consent and closed account non-regulatory data?", area: "retention" },
      { id: "S9-3", q: "Do you have a quarterly data minimization review process?", area: "retention" },
    ]},
  ]},
  { ch: "III", title: "Rights of Data Principals", items: [
    { s: "S.11", n: "Right to Access", law: "Data Principals have the right to obtain a summary of their personal data being processed, including processing activities and identities of all Data Processors.", bank: "When a customer asks what data do you have about me, you must answer comprehensively, searching across CBS, CRM, call recordings, email archives, and all third-party integrations.", prio: "high", controls: [
      { id: "S11-1", q: "Can you search all systems for a customer's personal data within 48 hours?", area: "dsar" },
      { id: "S11-2", q: "Do you maintain a register of all third-party data sharing arrangements?", area: "dsar" },
    ]},
    { s: "S.12", n: "Right to Correction & Erasure", law: "Data Principals can request correction of inaccurate data, completion of incomplete data, updating of outdated data, and erasure of data no longer necessary.", bank: "Data correction must be available through all channels, not just branch visits. Erasure requests for marketing data must propagate to ALL downstream systems.", prio: "high", controls: [
      { id: "S12-1", q: "Can customers request data correction through digital channels (app/web)?", area: "dsar" },
      { id: "S12-2", q: "Does an erasure request propagate across all systems holding that customer's data?", area: "dsar" },
    ]},
  ]},
  { ch: "IV", title: "Significant Data Fiduciary Obligations", items: [
    { s: "S.10", n: "Significant Data Fiduciary (SDF)", law: "Government may designate Data Fiduciaries as Significant based on volume/sensitivity of data. SDFs must appoint a DPO in India, appoint an independent data auditor, conduct DPIAs.", bank: "With 3+ crore customers and sensitive financial data, the bank will almost certainly be designated as an SDF. Start preparing NOW.", prio: "critical", controls: [
      { id: "S10-1", q: "Has a Data Protection Officer been appointed (India-based, senior management)?", area: "governance" },
      { id: "S10-2", q: "Has an independent data auditor been engaged (CERT-In empaneled preferred)?", area: "governance" },
      { id: "S10-3", q: "Are Data Protection Impact Assessments conducted for high-risk processing?", area: "governance" },
      { id: "S10-4", q: "Is privacy-by-design mandated for all new product development?", area: "governance" },
    ]},
  ]},
  { ch: "V", title: "Penalties", items: [
    { s: "S.33", n: "Penalty Framework", law: "Penalties up to Rs.250 crore per violation. Up to Rs.200Cr for child data violations, up to Rs.250Cr for breach notification failures. Penalties are per instance.", bank: "One breach with failed notification = up to Rs.250Cr. One minor data processed without parental consent = Rs.200Cr. These are existential penalties.", prio: "critical", controls: [
      { id: "S33-1", q: "Has financial exposure per DPDP violation category been quantified and reported to the Board?", area: "governance" },
      { id: "S33-2", q: "Does your cyber insurance policy cover DPDP-specific penalties?", area: "governance" },
    ]},
  ]},
  { ch: "Rules", title: "DPDP Rules 2025 - Operational Requirements", items: [
    { s: "R.6", n: "Security Safeguard Rules", law: "Mandates encryption, obfuscation, masking, tokenization, and access control. Technical measures must protect data throughout its lifecycle.", bank: "Defense-in-depth: encrypt at rest and in transit, tokenize PII in non-production environments, mask data in customer service screens, implement row-level access controls.", prio: "critical", controls: [
      { id: "R6-1", q: "Is PII tokenized in test/UAT/analytics environments?", area: "security" },
      { id: "R6-2", q: "Is data masking implemented in call center and branch applications?", area: "security" },
      { id: "R6-3", q: "Are row-level security policies enforced in databases holding PII?", area: "security" },
    ]},
    { s: "R.7", n: "Breach Notification Rules", law: "Notify each affected Data Principal individually. Report to DPB within 72 hours with nature of breach, data categories, number affected, consequences, and mitigation.", bank: "Build automated notification pipeline: detect, classify, quantify, DPB (72hr), customers (individual, in their language). Pre-draft templates. Drill quarterly.", prio: "critical", controls: [
      { id: "R7-1", q: "Can you identify all affected customers within 24 hours of breach detection?", area: "breach" },
      { id: "R7-2", q: "Are customer notification templates available in 7+ regional languages?", area: "breach" },
    ]},
    { s: "R.8", n: "Data Principal Rights Procedures", law: "Data Fiduciary must acknowledge DSAR receipt, verify identity, and provide information/take action within prescribed timeline.", bank: "Build a DSAR management workflow: acknowledgment, identity verification (Aadhaar/PAN), cross-system search, legal review, compilation, delivery, audit trail.", prio: "high", controls: [
      { id: "R8-1", q: "Do you have a formal DSAR management system with workflow and SLA tracking?", area: "dsar" },
      { id: "R8-2", q: "Is identity verification (Aadhaar/PAN) integrated into the DSAR intake process?", area: "dsar" },
      { id: "R8-3", q: "Are customer-facing staff trained on how to handle DSAR requests?", area: "training" },
    ]},
  ]},
];

const ALL_Q = ACT.flatMap(ch => ch.items.flatMap(item => item.controls.map(c => ({ ...c, section: item.s, sName: item.n, prio: item.prio, ch: ch.title }))));
const AREAS = { consent: "Consent Management", security: "Data Security", breach: "Breach Response", dsar: "Data Principal Rights", notice: "Privacy Notices", retention: "Data Retention", governance: "Governance & DPO", training: "Training" };

const SYS_PROMPT = "You are PrivacyShield's DPDP Compliance Advisor for Indian banks/NBFCs. Specialized EXCLUSIVELY in DPDP Act 2023 and DPDP Rules 2025 for BFSI. ONLY answer DPDP/data privacy/banking compliance questions. Always cite specific sections. Be specific to Indian banking: reference Finacle, BaNCS, UPI, NACH, CKYC, Account Aggregator. Keep responses concise, max 200 words. Include penalty amounts for non-compliance risks.";

const Stat = ({ label, value, color, sub }) => (<div style={{ background: C.p2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "14px 16px" }}><div style={{ fontSize: 9, fontWeight: 700, color: C.txD, letterSpacing: .6, textTransform: "uppercase", marginBottom: 4 }}>{label}</div><div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: M }}>{value}</div>{sub && <div style={{ fontSize: 10, color: C.txD, marginTop: 2 }}>{sub}</div>}</div>);
const PrioTag = ({ p }) => { const m = { critical: [C.r, C.rBg], high: [C.y, C.yBg], medium: [C.b, C.bBg] }; const [c, bg] = m[p] || [C.txD, C.p3]; return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: bg, color: c, letterSpacing: .3, textTransform: "uppercase" }}>{p}</span>; };
const ScanBadge = ({ s }) => { const m = { yes: ["COMPLIANT", C.g, C.gBg], partial: ["PARTIAL", C.y, C.yBg], no: ["GAP", C.r, C.rBg] }; const [l, c, bg] = m[s] || ["-", C.txD, C.p3]; return <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: bg, color: c }}>{l}</span>; };

// ==================== MAIN APP ====================
export default function App() {
  const [tab, setTab] = useState("act");
  const [answers, setAnswers] = useState({});
  const [scanDone, setScanDone] = useState(false);
  const [jiraData, setJiraData] = useState(null);

  useEffect(() => { (async () => {
    try { const a = await window.storage.get("ps2_answers"); if (a) { setAnswers(JSON.parse(a.value)); setScanDone(true); } } catch {}
    try { const j = await window.storage.get("ps2_jira"); if (j) setJiraData(JSON.parse(j.value)); } catch {}
  })(); }, []);

  const saveAnswers = async (a) => { setAnswers(a); try { await window.storage.set("ps2_answers", JSON.stringify(a)); } catch {} };
  const saveJira = async (d) => { setJiraData(d); try { await window.storage.set("ps2_jira", JSON.stringify(d)); } catch {} };

  const score = useMemo(() => { const a = Object.keys(answers); if (!a.length) return null; return Math.round((a.reduce((s, id) => s + (answers[id]==="yes"?1:answers[id]==="partial"?.5:0), 0) / ALL_Q.length) * 100); }, [answers]);
  const gaps = useMemo(() => ALL_Q.filter(q => answers[q.id] === "no"), [answers]);
  const partials = useMemo(() => ALL_Q.filter(q => answers[q.id] === "partial"), [answers]);
  const compliant = useMemo(() => ALL_Q.filter(q => answers[q.id] === "yes"), [answers]);

  const TABS = [
    { k: "act", l: "DPDP Act", s: "Knowledge Base", i: "\u{1F4DC}" },
    { k: "scan", l: "Gap Assessment", s: `${Object.keys(answers).length}/${ALL_Q.length} assessed`, i: "\u{1F50D}" },
    { k: "report", l: "Compliance Report", s: score !== null ? `Score: ${score}/100` : "Run assessment first", i: "\u{1F4CA}" },
    { k: "roadmap", l: "Implementation", s: "Roadmap & Stories", i: "\u{1F5FA}" },
    { k: "bot", l: "AI Advisor", s: "Ask DPDP Questions", i: "\u{1F916}" },
  ];

  return (<div style={{ fontFamily: F, background: C.bg, color: C.tx, minHeight: "100vh" }}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <div style={{ background: C.p1, borderBottom: `1px solid ${C.bd}`, padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg,${C.g},${C.gD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#000" }}>P</div>
        <div><span style={{ fontSize: 15, fontWeight: 800 }}>PrivacyShield</span><span style={{ fontSize: 10, color: C.txD, marginLeft: 8 }}>DPDP Compliance Platform</span></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {score !== null && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, color: C.txD }}>Score</span><span style={{ fontSize: 14, fontWeight: 800, color: score >= 70 ? C.g : score >= 40 ? C.y : C.r, fontFamily: M }}>{score}/100</span></div>}
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: C.rBg, padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.rBd}` }}><span style={{ fontSize: 12, fontWeight: 800, color: C.r, fontFamily: M }}>{daysLeft()}</span><span style={{ fontSize: 9, color: C.txD }}>days to deadline</span></div>
      </div>
    </div>
    <div style={{ background: C.p1, borderBottom: `1px solid ${C.bd}`, padding: "0 24px", display: "flex", gap: 2, overflowX: "auto" }}>
      {TABS.map(t => (<button key={t.k} onClick={() => setTab(t.k)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", border: "none", borderBottom: `2px solid ${tab === t.k ? C.g : "transparent"}`, background: "transparent", cursor: "pointer", fontFamily: F, whiteSpace: "nowrap" }}><span style={{ fontSize: 15 }}>{t.i}</span><div style={{ textAlign: "left" }}><div style={{ fontSize: 12, fontWeight: 700, color: tab === t.k ? C.g : C.tx }}>{t.l}</div><div style={{ fontSize: 9, color: C.txD }}>{t.s}</div></div></button>))}
    </div>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      {tab === "act" && <ActTab />}
      {tab === "scan" && <ScanTab answers={answers} save={saveAnswers} onDone={() => { setScanDone(true); setTab("report"); }} />}
      {tab === "report" && <ReportTab answers={answers} score={score} gaps={gaps} partials={partials} compliant={compliant} scanDone={scanDone} />}
      {tab === "roadmap" && <RoadmapTab gaps={gaps} partials={partials} jiraData={jiraData} saveJira={saveJira} scanDone={scanDone} />}
      {tab === "bot" && <BotTab />}
    </div>
  </div>);
}

// ==================== ACT TAB ====================
function ActTab() {
  const [open, setOpen] = useState(null);
  return <div>
    <div style={{ marginBottom: 16 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>DPDP Act 2023 & Rules 2025 - Bank Compliance Guide</h2><p style={{ margin: 0, fontSize: 12, color: C.txD }}>Every provision that applies to banking operations, explained in plain language with specific action items</p></div>
    {ACT.map(ch => (<div key={ch.ch} style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.g, letterSpacing: .8, textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><span style={{ padding: "2px 8px", borderRadius: 4, background: C.gBg, fontFamily: M }}>{ch.ch}</span> {ch.title}</div>
      {ch.items.map(item => { const isOpen = open === item.s; return <div key={item.s} style={{ background: C.p2, border: `1px solid ${isOpen ? C.bdL : C.bd}`, borderRadius: 8, marginBottom: 6, overflow: "hidden" }}>
        <div onClick={() => setOpen(isOpen ? null : item.s)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.g, fontFamily: M, minWidth: 50 }}>{item.s}</span>
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{item.n}</span><PrioTag p={item.prio} />
          <span style={{ fontSize: 10, color: C.txD }}>{item.controls.length} controls</span>
          <span style={{ fontSize: 11, color: C.txD, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>{"\u25BE"}</span>
        </div>
        {isOpen && <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.bd}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div><div style={{ fontSize: 9, fontWeight: 700, color: C.txD, letterSpacing: .4, textTransform: "uppercase", marginBottom: 4 }}>What the Law Says</div><div style={{ fontSize: 12, color: C.txM, lineHeight: 1.6 }}>{item.law}</div></div>
            <div style={{ background: C.gBg, borderRadius: 6, padding: 10, border: `1px solid ${C.gBd}` }}><div style={{ fontSize: 9, fontWeight: 700, color: C.g, letterSpacing: .4, textTransform: "uppercase", marginBottom: 4 }}>What This Means for Your Bank</div><div style={{ fontSize: 12, color: C.tx, lineHeight: 1.6 }}>{item.bank}</div></div>
          </div>
          <div style={{ marginTop: 10 }}><div style={{ fontSize: 9, fontWeight: 700, color: C.txD, textTransform: "uppercase", marginBottom: 6 }}>Compliance Controls ({item.controls.length})</div>
            {item.controls.map(c => (<div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 5, background: C.p3, marginBottom: 3, fontSize: 12, color: C.txM }}><span style={{ color: C.txD, fontFamily: M, fontSize: 9, flexShrink: 0 }}>{c.id}</span><span style={{ flex: 1 }}>{c.q}</span><span style={{ fontSize: 8, color: C.txD, padding: "1px 5px", borderRadius: 3, background: C.p2 }}>{AREAS[c.area]}</span></div>))}
          </div>
        </div>}
      </div>; })}
    </div>))}
  </div>;
}

// ==================== SCAN TAB ====================
function ScanTab({ answers, save, onDone }) {
  const [af, setAf] = useState("all");
  const areas = [...new Set(ALL_Q.map(q => q.area))];
  const filtered = af === "all" ? ALL_Q : ALL_Q.filter(q => q.area === af);
  const ans = Object.keys(answers).length;
  const pct = Math.round((ans / ALL_Q.length) * 100);

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>DPDP Gap Assessment</h2><p style={{ margin: 0, fontSize: 12, color: C.txD }}>Answer each control question - your responses drive the compliance score and remediation plan</p></div>
      <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 800, color: pct === 100 ? C.g : C.y, fontFamily: M }}>{ans}/{ALL_Q.length}</div><div style={{ fontSize: 10, color: C.txD }}>controls assessed</div></div>
    </div>
    <div style={{ height: 6, borderRadius: 3, background: C.bd, overflow: "hidden", marginBottom: 14 }}><div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: pct === 100 ? C.g : C.g, transition: "width .3s" }} /></div>
    <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
      <button onClick={() => setAf("all")} style={{ padding: "4px 10px", borderRadius: 14, border: `1px solid ${af==="all"?C.gBd:C.bd}`, background: af==="all"?C.gBg:"transparent", color: af==="all"?C.g:C.txM, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F }}>All ({ALL_Q.length})</button>
      {areas.map(a => { const cnt = ALL_Q.filter(q => q.area===a).length; const done = ALL_Q.filter(q => q.area===a && answers[q.id]).length; return <button key={a} onClick={() => setAf(a)} style={{ padding: "4px 10px", borderRadius: 14, border: `1px solid ${af===a?C.gBd:C.bd}`, background: af===a?C.gBg:"transparent", color: af===a?C.g:C.txM, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F }}>{AREAS[a]} ({done}/{cnt})</button>; })}
    </div>
    <div style={{ display: "grid", gap: 6 }}>
      {filtered.map(q => (<div key={q.id} style={{ background: C.p2, border: `1px solid ${answers[q.id]==="no"?C.rBd:answers[q.id]==="partial"?C.yBd:answers[q.id]==="yes"?C.gBd:C.bd}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.g, fontFamily: M, minWidth: 44, flexShrink: 0 }}>{q.section}</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: C.tx, lineHeight: 1.4 }}>{q.q}</div><div style={{ display: "flex", gap: 4, marginTop: 2 }}><PrioTag p={q.prio} /><span style={{ fontSize: 8, color: C.txD, padding: "2px 5px", borderRadius: 3, background: C.p3 }}>{AREAS[q.area]}</span></div></div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {[["yes","Yes",C.g,C.gBg,C.gBd],["partial","Partial",C.y,C.yBg,C.yBd],["no","No",C.r,C.rBg,C.rBd]].map(([v,l,c,bg,bd]) => (<button key={v} onClick={() => save({...answers,[q.id]:v})} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${answers[q.id]===v?bd:C.bd}`, background: answers[q.id]===v?bg:"transparent", color: answers[q.id]===v?c:C.txD, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F }}>{l}</button>))}
        </div>
      </div>))}
    </div>
    {ans >= ALL_Q.length * 0.5 && <div style={{ position: "sticky", bottom: 16, marginTop: 16, textAlign: "center" }}><button onClick={onDone} style={{ padding: "12px 28px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${C.g},${C.gD})`, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: F, boxShadow: "0 4px 20px rgba(16,185,129,.3)" }}>View Compliance Report ({ans}/{ALL_Q.length} assessed)</button></div>}
  </div>;
}

// ==================== REPORT TAB ====================
function ReportTab({ answers, score, gaps, partials, compliant, scanDone }) {
  if (!scanDone) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}><div style={{ fontSize: 40 }}>{"\u{1F4CA}"}</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>Complete the Gap Assessment first</div></div>;
  const sc = score >= 70 ? C.g : score >= 40 ? C.y : C.r;
  const ans = Object.keys(answers).length;
  const areaScores = Object.entries(AREAS).map(([k, n]) => { const qs = ALL_Q.filter(q => q.area===k); if (!qs.length) return null; const p = qs.reduce((s,q) => s+(answers[q.id]==="yes"?1:answers[q.id]==="partial"?.5:0),0); return { k, n, s: Math.round((p/qs.length)*100) }; }).filter(Boolean).sort((a,b)=>a.s-b.s);

  return <div>
    <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 800 }}>DPDP Compliance Report</h2>
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", gap: 12, marginBottom: 18 }}>
      <div style={{ background: C.p2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width={120} height={120} style={{ transform: "rotate(-90deg)" }}><circle cx={60} cy={60} r={50} fill="none" stroke={C.bd} strokeWidth={7} /><circle cx={60} cy={60} r={50} fill="none" stroke={sc} strokeWidth={7} strokeDasharray={314} strokeDashoffset={314-(score/100)*314} strokeLinecap="round" style={{ transition: "all .8s" }} /></svg>
        <div style={{ marginTop: -78, fontSize: 32, fontWeight: 800, color: sc, fontFamily: M }}>{score}</div>
        <div style={{ marginTop: 30, fontSize: 9, fontWeight: 700, color: C.txD, textTransform: "uppercase" }}>DPDP Score</div>
        <div style={{ fontSize: 10, color: C.txD, marginTop: 2 }}>{ans} of {ALL_Q.length} assessed</div>
      </div>
      <div style={{ background: C.p2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Area Breakdown</div>
        {areaScores.map(a => (<div key={a.k} style={{ display: "grid", gridTemplateColumns: "130px 36px 1fr", gap: 6, alignItems: "center", marginBottom: 5 }}><span style={{ fontSize: 11, color: C.txM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.n}</span><span style={{ fontSize: 11, fontWeight: 800, color: a.s>=70?C.g:a.s>=40?C.y:C.r, fontFamily: M, textAlign: "right" }}>{a.s}%</span><div style={{ height: 5, borderRadius: 3, background: C.bd, overflow: "hidden" }}><div style={{ width: `${a.s}%`, height: "100%", borderRadius: 3, background: a.s>=70?C.g:a.s>=40?C.y:C.r }} /></div></div>))}
      </div>
      <div style={{ background: C.rBg, border: `1px solid ${C.rBd}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.r, marginBottom: 8 }}>Risk Exposure</div>
        <div style={{ fontSize: 11, color: C.txM, lineHeight: 1.7 }}>
          <div><strong style={{ color: C.r }}>{gaps.filter(g=>g.prio==="critical").length}</strong> critical gaps - up to <strong style={{ color: C.r }}>Rs.250 Cr</strong> per violation</div>
          <div><strong style={{ color: C.y }}>{gaps.filter(g=>g.prio==="high").length}</strong> high priority gaps - action within 3 months</div>
          <div style={{ marginTop: 8, fontSize: 10, color: C.txD }}>Deadline: <strong style={{ color: C.r }}>{daysLeft()} days</strong></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
          {[[compliant.length,C.g,"Compliant"],[partials.length,C.y,"Partial"],[gaps.length,C.r,"Gaps"]].map(([v,c,l]) => <div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: c, fontFamily: M }}>{v}</div><div style={{ fontSize: 9, color: C.txD }}>{l}</div></div>)}
        </div>
      </div>
    </div>
    {[["no", "Compliance Gaps", gaps, C.r, C.rBg], ["partial", "Partial Implementations", partials, C.y, C.yBg]].map(([type, title, items, color]) => items.length > 0 && (
      <div key={type} style={{ background: C.p2, border: `1px solid ${C.bd}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "10px 14px", background: C.p3, fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${C.bd}` }}>{type==="no"?"\u{1F534}":"\u{1F7E1}"} {title} ({items.length})</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: C.p3 }}>{["Section","Control","Priority","Area"].map(h=><th key={h} style={{ padding: "6px 10px", fontSize: 9, fontWeight: 700, color: C.txD, textTransform: "uppercase", textAlign: "left", borderBottom: `1px solid ${C.bd}` }}>{h}</th>)}</tr></thead>
          <tbody>{items.map((g, i) => (<tr key={g.id} style={{ background: g.prio==="critical" && type==="no" ? "rgba(239,68,68,.03)" : i%2 ? "rgba(255,255,255,.01)" : "transparent" }}>
            <td style={{ padding: "6px 10px", fontSize: 11, fontFamily: M, color: C.g, fontWeight: 600, borderBottom: `1px solid ${C.bd}` }}>{g.section}</td>
            <td style={{ padding: "6px 10px", fontSize: 12, color: C.tx, borderBottom: `1px solid ${C.bd}`, lineHeight: 1.4 }}>{g.q}</td>
            <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.bd}` }}><PrioTag p={g.prio} /></td>
            <td style={{ padding: "6px 10px", fontSize: 10, color: C.txD, borderBottom: `1px solid ${C.bd}` }}>{AREAS[g.area]}</td>
          </tr>))}</tbody>
        </table>
      </div>
    ))}
  </div>;
}

// ==================== ROADMAP TAB ====================
function RoadmapTab({ gaps, partials, jiraData, saveJira, scanDone }) {
  const [generating, setGenerating] = useState(false);
  const [openEpic, setOpenEpic] = useState(null);
  const [openStory, setOpenStory] = useState(null);
  const [copied, setCopied] = useState(null);

  if (!scanDone) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}><div style={{ fontSize: 40 }}>{"\u{1F5FA}"}</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>Complete the Gap Assessment first</div></div>;

  const allItems = [...gaps, ...partials];
  const grouped = {};
  allItems.forEach(item => { const area = AREAS[item.area] || "Other"; if (!grouped[area]) grouped[area] = []; grouped[area].push(item); });

  const generate = async () => {
    setGenerating(true);
    const epics = Object.entries(grouped).map(([area, items], ei) => {
      const crit = items.filter(i => i.prio==="critical").length;
      const high = items.filter(i => i.prio==="high").length;
      const epicPrio = crit > 0 ? "Critical" : high > 0 ? "High" : "Medium";
      const stories = items.map((item, si) => {
        const roles = { consent:"DPO", security:"CISO", breach:"CISO", dsar:"Compliance Officer", notice:"Legal Head", retention:"DBA Lead", governance:"DPO", training:"HR Head" };
        const isGap = gaps.some(g => g.id === item.id);
        return {
          key: `DPDP-${ei+1}${String(si+1).padStart(2,"0")}`, title: item.q.replace(/\?$/,"").replace(/^(Do you |Have you |Is |Are |Can you |Does )/,"Implement: "),
          type: "Story", points: item.prio==="critical"?8:item.prio==="high"?5:3, status: isGap?"GAP":"PARTIAL",
          description: `As a ${roles[item.area]||"DPO"}, I need to ensure that ${item.q.toLowerCase().replace(/\?$/,"")} so that the bank complies with DPDP ${item.section} and avoids penalties up to Rs.250 crore.`,
          acceptanceCriteria: [
            `GIVEN the bank's ${AREAS[item.area]} infrastructure WHEN a DPDP audit is conducted THEN ${item.q.toLowerCase().replace(/\?$/,"")} is verified as compliant`,
            `GIVEN this control is implemented WHEN tested against DPDP ${item.section} requirements THEN it passes all compliance checks`,
            `GIVEN the implementation WHEN reviewed by the DPO THEN evidence of compliance is documented in the audit trail`,
          ],
          testCases: [
            { id: `TC-${ei+1}${String(si+1).padStart(2,"0")}-1`, scenario: `Verify ${AREAS[item.area]} compliance for ${item.section}`, steps: `1. Review current state 2. Execute implementation 3. Validate against DPDP ${item.section} 4. Document evidence`, expected: `Control passes DPDP ${item.section} compliance check. Evidence logged.` },
            { id: `TC-${ei+1}${String(si+1).padStart(2,"0")}-2`, scenario: `Regression test for ${item.section}`, steps: `1. Verify persistence after restart 2. Test edge cases 3. Confirm audit entries`, expected: `Implementation stable. No regression. Actions logged.` },
          ],
          dpdpSection: item.section, labels: [item.area, item.prio, isGap?"gap":"partial"],
        };
      });
      return { key: `DPDP-E${ei+1}`, title: `${area} - DPDP Compliance`, priority: epicPrio, summary: `Implement ${items.length} controls for ${area} covering DPDP sections ${[...new Set(items.map(i=>i.section))].join(", ")}. ${crit} critical, ${high} high priority.`, stories, sprints: Math.ceil(stories.reduce((s,st) => s+st.points,0)/20) };
    }).sort((a,b) => (a.priority==="Critical"?0:a.priority==="High"?1:2) - (b.priority==="Critical"?0:b.priority==="High"?1:2));

    // Try AI enhancement silently
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: "Enhance Jira stories for Indian banking DPDP compliance. Respond ONLY with valid JSON.", messages: [{ role: "user", content: `Enhance AC for these: ${JSON.stringify(epics.slice(0,3).map(e=>({t:e.title,s:e.stories.slice(0,2).map(s=>({t:s.title,sec:s.dpdpSection,a:s.labels[0]}))})))}. Respond: {"enhanced":[{"ei":0,"se":[{"si":0,"ac":["GIVEN...WHEN...THEN..."]}]}]}` }] }),
      });
      const d = await res.json(); const t = (d.content||[]).map(c=>c.text||"").join("").replace(/```json\s*/g,"").replace(/```/g,"").trim();
      try { const e = JSON.parse(t); if (e?.enhanced) e.enhanced.forEach(x => { if (epics[x.ei]) (x.se||[]).forEach(s => { if (epics[x.ei].stories[s.si] && s.ac?.length) epics[x.ei].stories[s.si].acceptanceCriteria = s.ac; }); }); } catch {}
    } catch {}

    await saveJira({ epics, generatedAt: new Date().toISOString(), totalStories: epics.reduce((a,e)=>a+e.stories.length,0), totalPoints: epics.reduce((a,e)=>a+e.stories.reduce((b,s)=>b+s.points,0),0) });
    setGenerating(false);
  };

  const copyStory = (ep, st) => { navigator.clipboard?.writeText(`EPIC: ${ep.key} - ${ep.title}\nSTORY: ${st.key} - ${st.title}\nPoints: ${st.points} | DPDP: ${st.dpdpSection}\n\n${st.description}\n\nAC:\n${st.acceptanceCriteria.map((a,i)=>`${i+1}. ${a}`).join("\n")}\n\nTEST CASES:\n${st.testCases.map(t=>`[${t.id}] ${t.scenario}\nSteps: ${t.steps}\nExpected: ${t.expected}`).join("\n\n")}`); setCopied(st.key); setTimeout(()=>setCopied(null),2000); };
  const copyAll = () => { if (!jiraData) return; navigator.clipboard?.writeText(jiraData.epics.map(e=>`EPIC: ${e.key} - ${e.title}\n${e.summary}\n\n${e.stories.map(s=>`STORY: ${s.key} - ${s.title}\n${s.description}\n\nAC:\n${s.acceptanceCriteria.map((a,i)=>`  ${i+1}. ${a}`).join("\n")}\n\nTESTS:\n${s.testCases.map(t=>`  [${t.id}] ${t.scenario}\n  ${t.steps}\n  Expected: ${t.expected}`).join("\n\n")}`).join("\n---\n")}`).join("\n\n===\n\n")); setCopied("all"); setTimeout(()=>setCopied(null),2000); };

  if (generating) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}><div style={{ fontSize: 36, animation: "spin 2s linear infinite" }}>{"\u2699\uFE0F"}</div><div style={{ fontSize: 16, fontWeight: 700 }}>Generating Implementation Roadmap...</div><style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style></div>;

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Implementation Roadmap</h2><p style={{ margin: 0, fontSize: 12, color: C.txD }}>{allItems.length} items - {gaps.length} gaps + {partials.length} partial</p></div>
      <div style={{ display: "flex", gap: 8 }}>
        {jiraData && <button onClick={copyAll} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.gBd}`, background: C.gBg, color: C.g, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F }}>{copied==="all"?"Copied!":"Copy All"}</button>}
        <button onClick={generate} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: `linear-gradient(135deg,${C.g},${C.gD})`, color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: F }}>{jiraData?"Regenerate":"Generate Epics & Stories"}</button>
      </div>
    </div>
    {!jiraData ? <div style={{ background: C.p2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 32, textAlign: "center" }}><div style={{ fontSize: 36 }}>{"\u{1F3AB}"}</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Generate Jira-Ready Backlog</div><div style={{ fontSize: 12, color: C.txM, marginTop: 6, maxWidth: 500, margin: "6px auto", lineHeight: 1.6 }}>Create Epics with User Stories, GIVEN/WHEN/THEN Acceptance Criteria, and Test Cases from your {gaps.length} gaps and {partials.length} partial implementations.</div><button onClick={generate} style={{ marginTop: 16, padding: "12px 28px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${C.g},${C.gD})`, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: F }}>Generate Epics & Stories</button></div>
    : <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        <Stat label="Epics" value={jiraData.epics.length} color={C.v} />
        <Stat label="Stories" value={jiraData.totalStories} color={C.b} />
        <Stat label="Story Points" value={jiraData.totalPoints} color={C.g} />
        <Stat label="Est. Sprints" value={jiraData.epics.reduce((a,e)=>a+e.sprints,0)} color={C.y} sub="@ 2 weeks each" />
      </div>
      {jiraData.epics.map(epic => { const isOpen = openEpic===epic.key; const pc = epic.priority==="Critical"?C.r:epic.priority==="High"?C.y:C.b; const pts = epic.stories.reduce((a,s)=>a+s.points,0);
        return <div key={epic.key} style={{ marginBottom: 8, background: C.p2, border: `1px solid ${isOpen?C.bdL:C.bd}`, borderRadius: 8, overflow: "hidden" }}>
          <div onClick={() => setOpenEpic(isOpen?null:epic.key)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.v, fontFamily: M }}>{epic.key}</span>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: C.v }} />
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{epic.title}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: pc===C.r?C.rBg:pc===C.y?C.yBg:C.bBg, color: pc }}>{epic.priority}</span>
            <span style={{ fontSize: 10, color: C.txD, fontFamily: M }}>{epic.stories.length} stories {"\u2022"} {pts} pts</span>
            <span style={{ fontSize: 11, color: C.txD, transform: isOpen?"rotate(180deg)":"none", transition: "transform .15s" }}>{"\u25BE"}</span>
          </div>
          {isOpen && <div style={{ borderTop: `1px solid ${C.bd}` }}>
            <div style={{ padding: "8px 14px", background: C.p3, fontSize: 11, color: C.txM }}>{epic.summary}</div>
            {epic.stories.map(story => { const sO = openStory===story.key;
              return <div key={story.key} style={{ borderTop: `1px solid ${C.bd}` }}>
                <div onClick={() => setOpenStory(sO?null:story.key)} style={{ padding: "8px 14px 8px 32px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 1, background: C.g }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.g, fontFamily: M, minWidth: 70 }}>{story.key}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{story.title}</span>
                  <ScanBadge s={story.status==="GAP"?"no":"partial"} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.g, fontFamily: M }}>{story.points} pts</span>
                  <button onClick={e => { e.stopPropagation(); copyStory(epic,story); }} style={{ padding: "2px 6px", borderRadius: 3, border: `1px solid ${C.bd}`, background: "transparent", color: C.txD, fontSize: 9, cursor: "pointer" }}>{copied===story.key?"OK":"Copy"}</button>
                  <span style={{ fontSize: 10, color: C.txD, transform: sO?"rotate(180deg)":"none", transition: "transform .15s" }}>{"\u25BE"}</span>
                </div>
                {sO && <div style={{ padding: "0 14px 12px 32px" }}>
                  <div style={{ padding: "8px 12px", borderRadius: 6, background: C.p3, marginBottom: 8, fontSize: 12, color: C.txM, lineHeight: 1.5, borderLeft: `3px solid ${C.g}`, fontStyle: "italic" }}>{story.description}</div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.g, textTransform: "uppercase", marginBottom: 4 }}>Acceptance Criteria ({story.acceptanceCriteria.length})</div>
                    {story.acceptanceCriteria.map((ac,i) => (<div key={i} style={{ padding: "5px 8px", marginBottom: 2, borderRadius: 4, background: C.gBg, fontSize: 11, color: C.tx, lineHeight: 1.5 }}><span style={{ color: C.gD, fontFamily: M, fontSize: 9, fontWeight: 700, marginRight: 6 }}>AC-{i+1}</span>{ac.split(/(GIVEN|WHEN|THEN)/).map((p,j) => ["GIVEN","WHEN","THEN"].includes(p) ? <strong key={j} style={{ color: C.g }}>{p} </strong> : p)}</div>))}
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.y, textTransform: "uppercase", marginBottom: 4 }}>Test Cases ({story.testCases.length})</div>
                    {story.testCases.map(tc => (<div key={tc.id} style={{ padding: "6px 8px", marginBottom: 2, borderRadius: 4, background: C.yBg, fontSize: 11, lineHeight: 1.5 }}><div style={{ fontWeight: 700, color: C.y, fontFamily: M, fontSize: 9 }}>{tc.id} - {tc.scenario}</div><div style={{ color: C.txM, marginTop: 2 }}><span style={{ fontWeight: 700, fontSize: 9, color: C.txD }}>STEPS: </span>{tc.steps}</div><div style={{ color: C.g, marginTop: 1 }}><span style={{ fontWeight: 700, fontSize: 9, color: C.txD }}>EXPECTED: </span>{tc.expected}</div></div>))}
                  </div>
                </div>}
              </div>; })}
          </div>}
        </div>; })}
    </div>}
  </div>;
}

// ==================== BOT TAB ====================
function BotTab() {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "I'm your **DPDP Compliance Advisor** for Indian banks.\n\nI can help with:\n\u2022 Specific DPDP section interpretations\n\u2022 How DPDP interacts with RBI regulations\n\u2022 Consent, breach notification, DSAR procedures\n\u2022 Implementation for Finacle, BaNCS, UPI systems\n\n**Ask me anything about DPDP compliance.**" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const QUICK = ["What penalties for breach notification failures?","How does DPDP affect UPI data?","Consent changes for marketing?","72-hour breach notification explained","DPDP vs RBI KYC conflicts?","Are we a Significant Data Fiduciary?","DSAR for closed accounts?","Data retention after closure?"];

  const send = async (text) => {
    const msg = text || input.trim(); if (!msg || loading) return;
    const next = [...msgs, { role: "user", content: msg }]; setMsgs(next); setInput(""); setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYS_PROMPT, messages: next.filter(m=>m.role!=="system").map(m=>({role:m.role,content:m.content})) }) });
      const d = await res.json(); setMsgs([...next, { role: "assistant", content: d.content?.map(c=>c.text||"").join("\n") || "Please try again." }]);
    } catch { setMsgs([...next, { role: "assistant", content: "Connection issue. Please try again." }]); }
    setLoading(false);
  };

  const renderMd = (text) => text.split("\n").map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g).map((p,j) => j%2===1 ? <strong key={j} style={{ color: C.g, fontWeight: 700 }}>{p}</strong> : p);
    if (line.match(/^[\u2022\-\*]\s+/)) return <div key={i} style={{ display: "flex", gap: 6, padding: "1px 0", marginLeft: 6 }}><span style={{ color: C.txD }}>{"\u2022"}</span><span>{parts}</span></div>;
    return <div key={i} style={{ padding: line?"1px 0":"3px 0" }}>{parts}</div>;
  });

  return <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 155px)" }}>
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.txD, textTransform: "uppercase", marginBottom: 5 }}>Quick Questions</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{QUICK.map((q,i) => <button key={i} onClick={() => send(q)} disabled={loading} style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.bd}`, background: C.p2, color: C.txM, fontSize: 10, cursor: "pointer", fontFamily: F, opacity: loading?.5:1 }}>{q}</button>)}</div>
    </div>
    <div style={{ flex: 1, overflowY: "auto", background: C.p2, border: `1px solid ${C.bd}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
      {msgs.map((m,i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 12, flexDirection: m.role==="user"?"row-reverse":"row" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: m.role==="user"?C.bBg:C.gBg, border: `1px solid ${m.role==="user"?C.bBd:C.gBd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>{m.role==="user"?"\u{1F464}":"\u{1F916}"}</div>
        <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 8, background: m.role==="user"?C.bBg:C.p3, border: `1px solid ${m.role==="user"?C.bBd:C.bd}`, fontSize: 12, lineHeight: 1.6 }}>{renderMd(m.content)}</div>
      </div>)}
      {loading && <div style={{ display: "flex", gap: 8 }}><div style={{ width: 26, height: 26, borderRadius: "50%", background: C.gBg, border: `1px solid ${C.gBd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{"\u{1F916}"}</div><div style={{ padding: "8px 12px", borderRadius: 8, background: C.p3, border: `1px solid ${C.bd}`, fontSize: 12, color: C.txD }}><span style={{ animation: "pulse 1.5s infinite" }}>Analyzing...</span></div></div>}
      <div ref={endRef} />
    </div>
    <div style={{ display: "flex", gap: 6 }}>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && send()} placeholder="Ask about DPDP compliance..." disabled={loading} style={{ flex: 1, padding: "9px 12px", borderRadius: 7, border: `1px solid ${C.bd}`, background: C.p2, color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }} />
      <button onClick={() => send()} disabled={loading||!input.trim()} style={{ padding: "9px 16px", borderRadius: 7, border: "none", background: C.g, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F, opacity: loading||!input.trim()?.5:1 }}>Send</button>
    </div>
    <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
  </div>;
}
