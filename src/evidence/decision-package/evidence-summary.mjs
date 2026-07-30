// Level-3B Lane C — one-line founder evidence summary (pure, deterministic, real-evidence only, no overclaim).
import { buildDecisionPackage } from "./decision-package.mjs";
export function buildEvidenceSummary(decisionInputs){
  const d = buildDecisionPackage(decisionInputs);
  const c = d.claim_counts;
  return Object.freeze({
    verdict:d.verdict, readiness:d.readiness,
    line:`Verdict ${d.verdict}; ${c.proven}/${c.total} proven, ${c.not_proven} not proven; readiness ${d.readiness} (not a production/commercial claim).`,
    certifies_green:false, certifies_production:false,
  });
}
