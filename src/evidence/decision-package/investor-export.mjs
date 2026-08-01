// RunGrid Wave — Lane B2: Investor-demo export skeleton with ONLY truthful labels.
//
// Plain English: take a REAL evidence decision package (see ./decision-package.mjs) and
// shape it into a neutral investor-demo export. It never over-claims: a missing value is
// UNKNOWN, and an internal guard refuses any output that ASSERTS a marketing over-claim
// ("production-ready", "secure", "SOC2", ...). A NEGATED honesty phrase ("not production-ready",
// "no compliance claim") is allowed — that is the truthful thing to say.
//
// Pure + deterministic: no I/O, no clock, no randomness, no network.
import { buildInvestorExportSkeleton } from "./decision-package.mjs";

export const UNKNOWN = "UNKNOWN";

// Marketing over-claims this export must never ASSERT about itself. Matched case-insensitively;
// spaces and hyphens are treated interchangeably (so "final beta" also catches "final-beta").
export const FORBIDDEN_CLAIMS = Object.freeze([
  "production-ready",
  "customer-ready",
  "commercial-ready",
  "secure",
  "compliant",
  "certified",
  "final beta",
  "enterprise-grade",
  "bank-grade",
  "guaranteed",
  "SOC2",
  "HIPAA",
  "GDPR-compliant",
]);

// Words that flip a forbidden phrase from an assertion into an honest denial.
// "this is NOT production-ready" / "no compliance claim" are allowed; a bare assertion is not.
const NEGATION = /\b(not|no|never|without|non|neither|nor|isn't|aren't|wasn't|weren't|excludes?|exclud(?:ing|ed))\b/i;

// Build a case-insensitive matcher for a phrase, treating runs of spaces/hyphens as one separator.
function phraseRegex(phrase) {
  const tokens = phrase.split(/[\s-]+/).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b${tokens.join("[\\s-]+")}\\b`, "ig");
}

// Walk every string value in a nested object/array, calling visit(str, path) for each.
function walkStrings(obj, visit, path = "$") {
  if (typeof obj === "string") { visit(obj, path); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walkStrings(v, visit, `${path}[${i}]`)); return; }
  if (obj && typeof obj === "object") { for (const k of Object.keys(obj)) walkStrings(obj[k], visit, `${path}.${k}`); return; }
}

// Throw naming the offending phrase if any deep string field ASSERTS a forbidden over-claim.
// A phrase is allowed only when its own sentence negates it before it appears. Returns true if clean.
export function assertNoForbiddenClaims(obj) {
  walkStrings(obj, (str, path) => {
    for (const phrase of FORBIDDEN_CLAIMS) {
      const re = phraseRegex(phrase);
      let m;
      while ((m = re.exec(str)) !== null) {
        const idx = m.index;
        // Start of the sentence containing this match (denials only count within the same clause).
        let start = 0;
        for (let i = idx - 1; i >= 0; i--) {
          const ch = str[i];
          if (ch === "." || ch === ";" || ch === "\n") { start = i + 1; break; }
        }
        const before = str.slice(start, idx);
        if (!NEGATION.test(before)) {
          throw new Error(`Forbidden over-claim "${phrase}" asserted at ${path}: ${JSON.stringify(str)}`);
        }
      }
    }
  });
  return true;
}

const HONEST_DISCLAIMER =
  "This is an investor DEMO skeleton carrying truthful labels only — it is NOT a production-ready, " +
  "customer-ready, commercial-ready, secure, compliant, certified, or final-beta claim.";

// Build the investor-demo export. Derives from buildInvestorExportSkeleton(decisionPackage) when a
// package is given; when the package is missing/UNKNOWN, returns a valid skeleton whose labels are all
// UNKNOWN plus a limitation saying no evidence was supplied. ALWAYS validates its own output.
export function buildInvestorExport({ decisionPackage, runId, generatedLabel } = {}) {
  const hasPkg = decisionPackage && decisionPackage !== UNKNOWN && typeof decisionPackage === "object";
  const skel = hasPkg ? buildInvestorExportSkeleton(decisionPackage) : null;

  const limitations = [];
  let truthful_labels;
  let run_id;
  let offline_verification;

  if (skel) {
    run_id = runId != null ? String(runId) : (skel.run_id != null ? String(skel.run_id) : UNKNOWN);
    const provenCount = Array.isArray(skel.what_is_proven) ? skel.what_is_proven.length : 0;
    const openCount = Array.isArray(skel.what_is_not_proven) ? skel.what_is_not_proven.length : 0;
    const sha = skel.evidence_sha256 != null ? String(skel.evidence_sha256) : UNKNOWN;
    truthful_labels = Object.freeze({
      headline_verdict: skel.headline_verdict != null ? String(skel.headline_verdict) : UNKNOWN,
      readiness: skel.readiness != null ? String(skel.readiness) : UNKNOWN,
      evidence_sha256: sha,
      proven_or_observed_count: String(provenCount),
      not_proven_or_unknown_count: String(openCount),
      certifies_green: "false",
      certifies_production: "false",
    });
    for (const l of (Array.isArray(skel.limitations) ? skel.limitations : [])) limitations.push(String(l));
    if (limitations.length === 0) {
      limitations.push("No limitations were recorded in the evidence package; treat coverage as UNKNOWN.");
    }
    offline_verification = sha !== UNKNOWN
      ? `Recompute the evidence-pack SHA-256 and compare it to ${sha} to verify these labels offline.`
      : "No evidence SHA-256 was supplied; offline verification is UNKNOWN.";
  } else {
    run_id = runId != null ? String(runId) : UNKNOWN;
    truthful_labels = Object.freeze({
      headline_verdict: UNKNOWN,
      readiness: UNKNOWN,
      evidence_sha256: UNKNOWN,
      proven_or_observed_count: UNKNOWN,
      not_proven_or_unknown_count: UNKNOWN,
      certifies_green: "false",
      certifies_production: "false",
    });
    limitations.push("No evidence decision package was supplied; every label is UNKNOWN and nothing here is verified.");
    offline_verification = "No evidence package or SHA-256 was supplied; offline verification is UNKNOWN.";
  }

  const exp = Object.freeze({
    title: "Investor Demo Export (Skeleton)",
    run_id,
    generated_label: generatedLabel != null ? String(generatedLabel) : UNKNOWN,
    what_this_is:
      "A structural investor-demo export carrying only truthful, evidence-derived labels. " +
      "Every unproven or missing value is shown as UNKNOWN; no value is upgraded past its evidence.",
    truthful_labels,
    limitations: Object.freeze(limitations),
    offline_verification,
    disclaimer: HONEST_DISCLAIMER,
  });

  // Contract (c): never emit an export that asserts an over-claim — let the guard throw if violated.
  assertNoForbiddenClaims(exp);
  return exp;
}

// Deterministic plain-text rendering of the export.
export function renderInvestorExportText(exp) {
  const t = exp.truthful_labels || {};
  const lines = [
    `${exp.title} — run ${exp.run_id}`,
    `generated: ${exp.generated_label}`,
    `what this is: ${exp.what_this_is}`,
    `truthful labels:`,
    ...Object.keys(t).map((k) => `  - ${k}: ${t[k]}`),
    `limitations:`,
    ...(exp.limitations.length ? exp.limitations.map((l) => `  - ${l}`) : ["  - (none recorded — treat as UNKNOWN)"]),
    `offline verification: ${exp.offline_verification}`,
    `disclaimer: ${exp.disclaimer}`,
  ];
  return lines.join("\n");
}
