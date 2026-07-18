// ARE-1 Blueprint Validator (MOD-004 Product Intake Officer responsibility).
// A blueprint expresses product INTENT. It does NOT grant live authority.
// Reject/HOLD a blueprint that omits required risk and authority fields.
import { createHash } from "node:crypto";

export const REQUIRED_FIELDS = [
  "blueprint_id", "project_identity", "blueprint_version", "author", "source",
  "creation_time", "objective", "target_users", "user_journeys",
  "functional_requirements", "non_functional_requirements", "non_goals",
  "data_classes", "secret_classes", "private_customer_data_requirements",
  "integrations", "provider_needs", "external_actions", "irreversible_actions",
  "spending_limits", "deployment_target", "platform_targets",
  "accessibility_requirements", "acceptance_criteria",
  "human_perception_requirements", "legal_security_ip_expert_questions",
  "known_unknowns", "founder_decisions_made", "founder_decisions_required",
  "rollback_expectations", "evidence_expectations", "release_expectations",
];

// Fields whose omission is a HARD reject (risk + authority surface).
export const RISK_AUTHORITY_FIELDS = [
  "data_classes", "secret_classes", "private_customer_data_requirements",
  "external_actions", "irreversible_actions", "spending_limits",
  "provider_needs", "founder_decisions_required", "rollback_expectations",
];

export function canonicalize(bp) {
  // Deterministic key ordering for a stable digest.
  const sortValue = (v) => {
    if (Array.isArray(v)) return v.map(sortValue);
    if (v && typeof v === "object") {
      return Object.keys(v).sort().reduce((o, k) => { o[k] = sortValue(v[k]); return o; }, {});
    }
    return v;
  };
  return JSON.stringify(sortValue(bp));
}

export function blueprintDigest(bp) {
  return "sha256:" + createHash("sha256").update(canonicalize(bp)).digest("hex");
}

export function validateBlueprint(bp) {
  const problems = [];
  if (!bp || typeof bp !== "object") {
    return { state: "BLUEPRINT_INVALID", valid: false, missing: REQUIRED_FIELDS.slice(), problems: ["not an object"], digest: null };
  }
  const isAbsent = (v) => v === null || v === undefined;
  const missing = REQUIRED_FIELDS.filter((f) => !(f in bp) || isAbsent(bp[f]));
  // Risk/authority fields fail closed on an empty/whitespace STRING (not a valid
  // risk-surface statement). An empty ARRAY is a valid explicit "none" declaration
  // (e.g. external_actions: [] = "no external actions") and is allowed.
  const isEmptyString = (v) => typeof v === "string" && v.trim() === "";
  const missingRiskAuthority = RISK_AUTHORITY_FIELDS.filter(
    (f) => !(f in bp) || isAbsent(bp[f]) || isEmptyString(bp[f]));

  // A blueprint may never self-grant authority.
  if (bp.grants_live_authority === true || bp.authority_granted === true) {
    problems.push("blueprint attempts to self-grant live authority (forbidden)");
  }
  let state;
  if (missingRiskAuthority.length > 0 || problems.length > 0) {
    state = "BLUEPRINT_INVALID"; // hard reject on missing risk/authority or self-grant
  } else if (missing.length > 0) {
    state = "BLUEPRINT_HELD"; // non-risk fields missing -> hold for completion
  } else {
    state = "BLUEPRINT_ACCEPTED";
  }
  return {
    state,
    valid: state === "BLUEPRINT_ACCEPTED",
    missing,
    missing_risk_authority: missingRiskAuthority,
    problems,
    digest: state === "BLUEPRINT_INVALID" ? null : blueprintDigest(bp),
  };
}
