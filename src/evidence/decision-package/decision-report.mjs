// Lane C — decision report, built ONLY from the existing decision package + investor export.
//
// Plain English: combine the real decision package and the investor export into a single
// founder-AND-investor-readable report. It composes existing pure functions read-only — it
// never invents evidence, never upgrades a claim's status, and never lets a
// production/commercial/customer-ready over-claim slip into a generated field.
//
// Pure + deterministic: no I/O, no clock, no randomness, no network.
import { buildDecisionPackage } from "./decision-package.mjs";
import { buildInvestorExport } from "./investor-export.mjs";

const DISCLAIMER =
  "Evidence-backed decision material with explicit limitations. NOT a production, commercial, or customer-ready claim.";

export function buildDecisionReport(decisionInputs) {
  const decision = buildDecisionPackage(decisionInputs);
  const investor = buildInvestorExport(decisionInputs);
  const readiness = decision.readiness;
  const limitations = decision.limitations;
  const c = decision.claim_counts;

  const founderLines = [
    `What this means for you (run ${decision.run_id}):`,
    `Verdict: ${decision.verdict}`,
    `Readiness: ${readiness} — this is NOT a production or commercial claim.`,
    `Of ${c.total} tracked claim(s): ${c.proven} proven, ${c.observed} observed, ${c.not_proven} not proven.`,
    limitations.length
      ? `Known limitations to weigh before deciding: ${limitations.join("; ")}.`
      : "No limitations were recorded — treat unrecorded areas as UNKNOWN, not as clean.",
  ];
  const founder_summary = founderLines.join(" ");

  const investorLines = [
    `Investor view (run ${decision.run_id}):`,
    `Headline: ${investor.headline}`,
    investor.proven.length
      ? `Evidence-backed highlights: ${investor.proven.map((p) => p.name).join(", ")}.`
      : "No evidence-backed highlights recorded yet.",
    investor.not_proven.length
      ? `Honest limits: ${investor.not_proven.map((p) => p.name).join(", ")} remain not proven or unknown.`
      : "No open items recorded.",
    `Readiness: ${readiness} (not a production or commercial claim).`,
  ];
  const investor_summary = investorLines.join(" ");

  return Object.freeze({
    title: "Evidence Decision Report",
    decision,
    investor,
    founder_summary,
    investor_summary,
    limitations,
    readiness,
    disclaimer: DISCLAIMER,
  });
}

export function renderDecisionReportText(r) {
  const lines = [
    r.title,
    "",
    "-- Founder summary --",
    r.founder_summary,
    "",
    "-- Investor summary --",
    r.investor_summary,
    "",
    "-- Limitations --",
    ...(r.limitations.length ? r.limitations.map((l) => `  - ${l}`) : ["  - (none recorded — treat as UNKNOWN)"]),
    "",
    r.disclaimer,
  ];
  return lines.join("\n");
}
