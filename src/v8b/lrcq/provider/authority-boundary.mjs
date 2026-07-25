// FounderGate LRCQ — the AUTHORITATIVE provider-spawn boundary validator (FG-FCHK-197-B).
//
// The provider spawn is the single place where founder-signed authority becomes a real, paid, model-driven
// process. Before this module the boundary bound a projection to a capability by BRAND and DIGEST only —
// authoritative:false, projection_schema, v4_supervisor_claim_digest, v4_activation_identity — and never by
// a single limit or exclusion. The V2 validator then checked that the record's numbers were positive and
// finite, but compared them to NOTHING. A spread copy of the honest projection with max_budget_usd widened
// 10 -> 1000 therefore reached the real Claude CLI as `--max-budget-usd 1000`; per_job_timeout_s became the
// kill timer, max_output_bytes the overflow ceiling, and two founder-signed exclusions could simply be set
// to false.
//
// This validator receives:
//   * `cap`        — the GENUINE module-branded SUPERVISOR_EXECUTION capability (the only authority);
//   * `projection` — the proposed NON-AUTHORITATIVE V2-shaped record (never trusted);
//   * `job`        — the job about to run;
//   * `bindings`   — the fixed runtime bindings.
//
// It derives the ceilings from the capability's IMMUTABLE (deep-frozen, FG-FCHK-197-C) signed authority and
// enforces them immediately before process spawn. It NEVER trusts a hand-written V2-shaped projection, a
// projection merely because its claim digest matches, a mutable capability property, or a validator that
// only checks "positive and finite".
//
// Both halves are mechanically enumerated from the V4 contract tables, so a limit or an exclusion cannot be
// added to the signed payload and silently left unenforced here.
import { isSupervisorExecutionCapabilityV4 } from "../assurance/lifecycle-authority-v4.mjs";
import { V4_SIGNED_LIMITS, V4_SIGNED_EXCLUSIONS, signedLimitValueValid } from "../assurance/activation-v4.mjs";
import { PROJECTION_SCHEMA, NON_AUTHORITATIVE_SIGNATURE } from "../run-harness/v4-legacy-projection.mjs";

export const BOUNDARY_CODES = {
  OK: "OK",
  CAPABILITY_REQUIRED: "V4_SUPERVISOR_EXECUTION_CAPABILITY_REQUIRED",
  AUTHORITY_MUTABLE: "V4_AUTHORITY_NOT_IMMUTABLE",
  SIGNED_LIMIT_ABSENT: "V4_SIGNED_LIMIT_ABSENT",
  LIMIT_INVALID: "V4_PROJECTED_LIMIT_INVALID",
  LIMIT_WIDENED: "V4_PROJECTED_LIMIT_WIDENS_SIGNED_CEILING",
  EXCLUSION_NOT_SIGNED_TRUE: "V4_SIGNED_EXCLUSION_NOT_TRUE",
  EXCLUSION_NOT_PRESERVED: "V4_PROJECTED_EXCLUSION_NOT_PRESERVED",
  DEADLINE_WIDENED: "V4_PROJECTED_DEADLINE_WIDENS_SIGNED_AUTHORITY",
  IDENTITY_MISMATCH: "V4_PROJECTED_IDENTITY_DIFFERS_FROM_SIGNED",
  PROVENANCE_INVALID: "V4_PROJECTION_PROVENANCE_INVALID",
  UNKNOWN_AUTHORITY_FIELD: "V4_UNKNOWN_AUTHORITY_FIELD",
};

// The projection field each signed limit governs. Same key on both sides today; the table is explicit so a
// rename on either side is a mechanical edit here rather than a silently unenforced ceiling.
const LIMIT_PROJECTION_FIELD = {
  max_budget_usd: "max_budget_usd",
  per_job_timeout_s: "per_job_timeout_s",
  max_parallel_width: "max_parallel_width",
  max_output_bytes: "max_output_bytes",
  termination_grace_s: "termination_grace_s",
  // run_duration_s bounds the run as a whole, not one job; it is enforced as a DURATION ceiling below.
  run_duration_s: null,
};

// The signed identity facts a projection may restate but never alter. Each maps projection field ->
// capability field.
const SIGNED_IDENTITY_FIELDS = [
  ["v4_activation_identity", "activation_identity"],
  ["v4_payload_digest", "payload_digest"],
  ["v4_consumed_marker_digest", "consumed_marker_digest"],
  ["v4_launch_intent_digest", "launch_intent_digest"],
  ["v4_supervisor_claim_digest", "supervisor_claim_digest"],
  ["provider_executable_identity", "provider_identity"],
  ["provider_executable_path", "provider_executable_path"],
  ["provider_version", "provider_version"],
  ["run_id", "run_id"],
  ["backlog_digest", "backlog_digest"],
  ["lrcq_base_sha", "lrcq_base_sha"],
  ["lrcq_base_tree", "lrcq_base_tree"],
  ["provider_candidate_sha", "provider_candidate_sha"],
  ["provider_candidate_tree", "provider_candidate_tree"],
  ["issued_epoch", "issued_epoch"],
];

// Every `v4_*` provenance key a legitimate projection is allowed to carry. Anything else claiming to be V4
// authority is an unknown authority-bearing field and is refused rather than ignored.
const ALLOWED_V4_KEYS = new Set([
  "v4_activation_identity", "v4_payload_digest", "v4_consumed_marker_digest",
  "v4_launch_intent_digest", "v4_supervisor_claim_digest", "v4_supervisor_pid",
]);

// Enforce the founder-signed ceilings and exclusions. Returns { ok, refusals: [...] }.
// `opts.requireProvenance` (default true) additionally requires the non-authoritative projection provenance.
export function enforceSignedAuthorityBoundary(cap, projection, job, bindings = {}, opts = {}) {
  const refusals = [];
  const refuse = (code, detail) => refusals.push(code + ": " + detail);

  // ---- 1. only the genuine branded capability is authority ----
  if (!isSupervisorExecutionCapabilityV4(cap)) {
    return { ok: false, refusals: [BOUNDARY_CODES.CAPABILITY_REQUIRED + ": genuine SUPERVISOR_EXECUTION capability required"] };
  }
  if (!projection || typeof projection !== "object") {
    return { ok: false, refusals: [BOUNDARY_CODES.PROVENANCE_INVALID + ": projection absent/not-an-object"] };
  }

  // ---- 2. the authority we are about to derive ceilings from must itself be IMMUTABLE ----
  // A mutable reference would let a caller widen the "signed" ceiling and then satisfy the comparison
  // against it (FG-FCHK-197-C). Deriving from a writable object is not enforcement.
  const limits = cap.limits, exclusions = cap.exclusions;
  if (!limits || typeof limits !== "object" || !Object.isFrozen(limits)) refuse(BOUNDARY_CODES.AUTHORITY_MUTABLE, "cap.limits is absent or not frozen");
  if (!exclusions || typeof exclusions !== "object" || !Object.isFrozen(exclusions)) refuse(BOUNDARY_CODES.AUTHORITY_MUTABLE, "cap.exclusions is absent or not frozen");
  if (!Object.isFrozen(cap)) refuse(BOUNDARY_CODES.AUTHORITY_MUTABLE, "capability is not frozen");
  if (refusals.length) return { ok: false, refusals };

  // ---- 3. every signed NUMERICAL limit, enumerated mechanically ----
  for (const spec of V4_SIGNED_LIMITS) {
    const signed = limits[spec.field];
    // The capability must itself carry a valid signed ceiling; a missing/invalid one is fail-closed.
    if (!signedLimitValueValid(spec, signed) || signed > spec.max) {
      refuse(BOUNDARY_CODES.SIGNED_LIMIT_ABSENT, spec.field + " is not a valid signed ceiling on the capability");
      continue;
    }
    const pf = LIMIT_PROJECTION_FIELD[spec.field];
    if (pf === null) continue;             // enforced as a duration ceiling below
    const projected = projection[pf];
    // Missing, zero, negative, NaN, Infinity and wrong-typed values all fail — "positive and finite" alone
    // was the gap that let a widened value through.
    if (!signedLimitValueValid(spec, projected)) {
      refuse(BOUNDARY_CODES.LIMIT_INVALID, pf + " = " + String(projected) + " (must be finite and valid for " + spec.kind + ")");
      continue;
    }
    // Narrowing is legitimate; widening is refused BEFORE spawn.
    if (projected > signed) refuse(BOUNDARY_CODES.LIMIT_WIDENED, pf + " = " + projected + " exceeds the founder-signed " + signed);
  }

  // ---- 4. deadlines and any duration ceiling ----
  const num = (v) => typeof v === "number" && Number.isFinite(v);
  if (!num(projection.hard_deadline_epoch) || !num(projection.expiry_epoch) || !num(projection.issued_epoch)) {
    refuse(BOUNDARY_CODES.LIMIT_INVALID, "issued/expiry/hard_deadline epochs must all be finite numbers");
  } else {
    // The run deadline and the expiry are themselves founder-signed values: a projection may bring them
    // FORWARD (narrow the window) but may never push either one out.
    if (projection.hard_deadline_epoch > cap.hard_deadline_epoch) refuse(BOUNDARY_CODES.DEADLINE_WIDENED, "hard_deadline_epoch " + projection.hard_deadline_epoch + " exceeds the signed " + cap.hard_deadline_epoch);
    if (projection.expiry_epoch > cap.expiry_epoch) refuse(BOUNDARY_CODES.DEADLINE_WIDENED, "expiry_epoch " + projection.expiry_epoch + " exceeds the signed " + cap.expiry_epoch);
  }
  // run_duration_s is a SEPARATE signed ceiling, not a consistency constraint between the signed epochs:
  // the founder signs the hard deadline and the duration independently and the verifier never required one
  // to bound the other, so deriving a duration from the epochs and refusing on it would reject legitimately
  // signed activations. It is enforced here as what it is — a ceiling a record may never widen — whenever
  // the record carries it at all.
  if (projection.run_duration_s !== undefined) {
    const signedDuration = limits.run_duration_s;
    if (!num(projection.run_duration_s) || projection.run_duration_s <= 0) refuse(BOUNDARY_CODES.LIMIT_INVALID, "run_duration_s = " + String(projection.run_duration_s));
    else if (num(signedDuration) && projection.run_duration_s > signedDuration) refuse(BOUNDARY_CODES.LIMIT_WIDENED, "run_duration_s = " + projection.run_duration_s + " exceeds the founder-signed " + signedDuration);
  }

  // ---- 5. every signed EXCLUSION, enumerated mechanically ----
  // This is signed-exclusion enforcement, NOT a deny-list presence test: each exclusion must be exactly
  // `true` in the signed authority AND exactly `true` in the projection. Missing, false, null, a truthy
  // non-true substitute, or a differently named field all fail before spawn.
  for (const f of V4_SIGNED_EXCLUSIONS) {
    if (exclusions[f] !== true) { refuse(BOUNDARY_CODES.EXCLUSION_NOT_SIGNED_TRUE, f + " is not exactly true in the signed authority"); continue; }
    if (projection[f] !== true) refuse(BOUNDARY_CODES.EXCLUSION_NOT_PRESERVED, f + " = " + String(projection[f]) + " (the founder signed it true)");
  }

  // ---- 6. signed identity facts may be restated, never altered ----
  for (const [pf, cf] of SIGNED_IDENTITY_FIELDS) {
    if (cap[cf] === undefined) continue;
    if (projection[pf] !== cap[cf]) refuse(BOUNDARY_CODES.IDENTITY_MISMATCH, pf + " = " + String(projection[pf]) + " but the signed authority says " + String(cap[cf]));
  }
  // The immutable reviewed versioned target is what actually gets executed.
  const signedTarget = cap.resolved_provider_target || cap.provider_executable_path;
  if (projection.provider_resolved_target !== signedTarget) refuse(BOUNDARY_CODES.IDENTITY_MISMATCH, "provider_resolved_target = " + String(projection.provider_resolved_target) + " but the signed authority says " + String(signedTarget));
  if (bindings && bindings.run_harness_candidate_sha !== undefined && bindings.run_harness_candidate_sha !== cap.evaluated_candidate) {
    refuse(BOUNDARY_CODES.IDENTITY_MISMATCH, "bindings.run_harness_candidate_sha differs from the signed evaluated candidate");
  }

  // ---- 7. provenance: a projection must never present itself as authority ----
  if (opts.requireProvenance !== false) {
    if (projection.authoritative !== false) refuse(BOUNDARY_CODES.PROVENANCE_INVALID, "authoritative must be exactly false");
    if (projection.projection_schema !== PROJECTION_SCHEMA) refuse(BOUNDARY_CODES.PROVENANCE_INVALID, "projection_schema must be " + PROJECTION_SCHEMA);
    if (projection.founder_signature !== NON_AUTHORITATIVE_SIGNATURE) refuse(BOUNDARY_CODES.PROVENANCE_INVALID, "founder_signature must be the literal " + NON_AUTHORITATIVE_SIGNATURE);
  }
  // An unknown `v4_*` field is an authority-bearing claim this boundary does not understand -> refuse.
  for (const k of Object.keys(projection)) {
    if (k.startsWith("v4_") && !ALLOWED_V4_KEYS.has(k)) refuse(BOUNDARY_CODES.UNKNOWN_AUTHORITY_FIELD, k);
  }

  return { ok: refusals.length === 0, refusals };
}
