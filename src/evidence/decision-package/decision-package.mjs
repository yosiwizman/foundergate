// RunGrid Wave — Lane C: Evidence decision package / investor-demo export skeleton.
//
// Plain English: turn REAL evidence inputs (a verdict, labelled claims, limitations,
// and an evidence-pack SHA) into (1) a plain-English decision summary a founder can read,
// and (2) a neutral export skeleton for an investor demo. It NEVER invents: a missing
// field is UNKNOWN, it NEVER certifies "green"/production/commercial readiness, and every
// claim keeps its own status label (OBSERVED / PROVEN / NOT_PROVEN / UNKNOWN).
//
// Pure + deterministic: no I/O, no clock, no randomness, no network.
export const UNKNOWN = "UNKNOWN";

// Claim statuses we accept verbatim; anything else is coerced to UNKNOWN (never upgraded).
const CLAIM_STATUSES = new Set(["OBSERVED", "PROVEN", "NOT_PROVEN", "HELD", "REFUSED", "UNKNOWN"]);
// Words that would over-claim readiness — never emitted by this module.
const BANNED_CLAIMS = /production[- ]ready|commercial|customer[- ]ready|guaranteed|certified green/i;

function normStatus(s) {
  const v = typeof s === "string" ? s.toUpperCase() : "";
  return CLAIM_STATUSES.has(v) ? v : UNKNOWN;
}

// Build the decision package from real evidence. Missing -> UNKNOWN; never fabricated.
export function buildDecisionPackage({ verdict, claims, limitations, evidence_sha256, run_id } = {}) {
  const v = typeof verdict === "string" && verdict.length > 0 ? verdict : UNKNOWN;
  const claimList = Object.freeze(
    (Array.isArray(claims) ? claims : []).map((c) =>
      Object.freeze({ name: c && c.name != null ? String(c.name) : UNKNOWN, status: normStatus(c && c.status) })
    )
  );
  const lims = Object.freeze((Array.isArray(limitations) ? limitations : []).map(String));
  const sha = typeof evidence_sha256 === "string" && /^[0-9a-f]{64}$/i.test(evidence_sha256) ? evidence_sha256 : UNKNOWN;

  const proven = claimList.filter((c) => c.status === "PROVEN").length;
  const observed = claimList.filter((c) => c.status === "OBSERVED").length;
  const notProven = claimList.filter((c) => c.status === "NOT_PROVEN").length;
  // Readiness is DELIBERATELY conservative and never "production/commercial".
  const readiness = claimList.length === 0 ? UNKNOWN
    : (sha === UNKNOWN ? "UNVERIFIED_EVIDENCE"
      : (notProven === 0 && proven > 0 ? "EVIDENCE_BACKED_WITH_LIMITS" : "PARTIAL_EVIDENCE_WITH_LIMITS"));

  return Object.freeze({
    title: "Evidence Decision Package",
    run_id: run_id != null ? String(run_id) : UNKNOWN,
    verdict: v,
    evidence_sha256: sha,
    claims: claimList,
    claim_counts: Object.freeze({ proven, observed, not_proven: notProven, total: claimList.length }),
    limitations: lims,
    readiness,                       // never production/commercial; UNKNOWN when unproven
    certifies_green: false,
    certifies_production: false,
  });
}

// A neutral investor-demo export skeleton (structure only; real values passed through, UNKNOWN otherwise).
export function buildInvestorExportSkeleton(pkg) {
  return Object.freeze({
    export_kind: "investor_demo_skeleton",
    disclaimer: "Evidence-backed demo material with explicit limitations. NOT a production/commercial readiness claim.",
    run_id: pkg.run_id,
    headline_verdict: pkg.verdict,
    evidence_sha256: pkg.evidence_sha256,
    what_is_proven: pkg.claims.filter((c) => c.status === "PROVEN" || c.status === "OBSERVED"),
    what_is_not_proven: pkg.claims.filter((c) => c.status === "NOT_PROVEN" || c.status === UNKNOWN),
    limitations: pkg.limitations,
    readiness: pkg.readiness,
  });
}

export function renderDecisionText(pkg) {
  const c = pkg.claim_counts;
  const lines = [
    `${pkg.title} — run ${pkg.run_id}`,
    `verdict: ${pkg.verdict}`,
    `evidence_sha256: ${pkg.evidence_sha256}`,
    `claims: proven=${c.proven} observed=${c.observed} not_proven=${c.not_proven} (total ${c.total})`,
    `readiness: ${pkg.readiness}  [certifies_green=${pkg.certifies_green} certifies_production=${pkg.certifies_production}]`,
    `limitations:`,
    ...(pkg.limitations.length ? pkg.limitations.map((l) => `  - ${l}`) : ["  - (none recorded — treat as UNKNOWN)"]),
  ];
  return lines.join("\n");
}

// Guard over the fields THIS module generates (not founder passthrough): our readiness token
// must never be a production/commercial over-claim. Returns true if safe.
export function readinessIsHonest(pkg) {
  return !BANNED_CLAIMS.test(String(pkg.readiness)) && pkg.certifies_green === false && pkg.certifies_production === false;
}
