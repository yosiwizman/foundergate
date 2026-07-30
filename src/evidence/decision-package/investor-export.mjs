// Lane C — investor-demo export hardening, built ONLY from the existing decision package.
//
// Plain English: take the real decision package + its neutral skeleton and produce a single,
// investor-facing object with a plain-English narrative attached. It composes existing pure
// functions read-only — it never invents evidence, never upgrades a claim's status, and never
// lets a production/commercial/customer-ready over-claim slip into a generated field.
//
// Pure + deterministic: no I/O, no clock, no randomness, no network.
import { buildDecisionPackage, buildInvestorExportSkeleton, UNKNOWN } from "./decision-package.mjs";

const DISCLAIMER =
  "Evidence-backed demo material with explicit limitations. NOT a production, commercial, or customer-ready claim.";

// Words that would over-claim readiness — never emitted by this module's generated fields.
const BANNED_CLAIMS = /production[- ]ready|commercial|customer[- ]ready|guaranteed|certified green/i;

// Coerce any generated token that reads as an over-claim back to UNKNOWN; never upgrade.
function sanitizeToken(token) {
  return BANNED_CLAIMS.test(String(token)) ? UNKNOWN : token;
}

export function buildInvestorExport(decisionInputs) {
  const pkg = buildDecisionPackage(decisionInputs);
  const skeleton = buildInvestorExportSkeleton(pkg);

  const verdict = pkg.verdict === UNKNOWN ? UNKNOWN : sanitizeToken(pkg.verdict);
  const readiness = sanitizeToken(pkg.readiness);
  const headline = `Verdict: ${verdict}`;

  const proven = Object.freeze(skeleton.what_is_proven.slice());
  const notProven = Object.freeze(skeleton.what_is_not_proven.slice());
  const limitations = pkg.limitations;

  const plainLines = [
    `Investor Demo Summary — run ${pkg.run_id}`,
    `Headline: ${headline}`,
    `Proven / observed: ${proven.length ? proven.map((c) => c.name).join(", ") : "(none recorded — treat as UNKNOWN)"}`,
    `Not proven / unknown: ${notProven.length ? notProven.map((c) => c.name).join(", ") : "(none recorded)"}`,
    `Readiness: ${readiness} (not a production or commercial claim)`,
    "Limitations:",
    ...(limitations.length ? limitations.map((l) => `  - ${l}`) : ["  - (none recorded — treat as UNKNOWN)"]),
    DISCLAIMER,
  ];

  return Object.freeze({
    export_kind: "investor_demo",
    generated_from: pkg,
    headline,
    proven,
    not_proven: notProven,
    limitations,
    readiness,
    disclaimer: DISCLAIMER,
    plain_english: plainLines.join("\n"),
  });
}

export function renderInvestorExportText(x) {
  return x.plain_english;
}
