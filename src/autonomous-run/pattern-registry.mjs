// ARE-1 Pattern Promotion Law.
// One successful run does NOT become permanent product behavior. A single run
// may produce OBSERVED or CANDIDATE patterns only — never ADOPTED automatically.
export const PATTERN_STATES = [
  "OBSERVED", "CANDIDATE", "REPRODUCED", "CHECKER_CLEAN",
  "PROMOTION_ELIGIBLE", "ADOPTED", "REJECTED", "RETIRED",
];

export const PROMOTION_PREDICATES = [
  "behavior_named", "blueprint_available", "manifest_available", "evidence_complete",
  "checker_clean", "no_hidden_founder_operation", "reproducible",
  "negative_cases_pass", "safety_boundaries_explicit", "rollback_proven",
];

// executions: number of independent successful executions.
// lowRiskDeterministic + policyAllowsOne: policy may permit one execution.
export function evaluatePromotion(pattern, opts = {}) {
  const p = pattern || {};
  const failed = PROMOTION_PREDICATES.filter((k) => p[k] !== true);
  const execs = Number(p.independent_successful_executions || 0);
  const needTwo = !(opts.lowRiskDeterministic && opts.policyAllowsOne);
  if (needTwo && execs < 2) failed.push("insufficient_independent_executions");
  if (!needTwo && execs < 1) failed.push("no_execution");
  const eligible = failed.length === 0;
  return { promotion_eligible: eligible, blocked_by: failed };
}

// A single run may only advance a pattern to OBSERVED or CANDIDATE.
export function classifyFromSingleRun(behaviorNamed) {
  return behaviorNamed ? "CANDIDATE" : "OBSERVED";
}

// Guard: refuse to mark ADOPTED without passing the full promotion law.
export function adopt(pattern, opts = {}) {
  const e = evaluatePromotion(pattern, opts);
  if (!e.promotion_eligible) {
    return { ok: false, state: pattern.state || "CANDIDATE", reason: "not PROMOTION_ELIGIBLE", blocked_by: e.blocked_by };
  }
  return { ok: true, state: "ADOPTED" };
}
