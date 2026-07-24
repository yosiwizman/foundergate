// FounderGate LRCQ — Ed25519 signed activation V4 + non-forgeable verified capability (FG-LRCQ-ACT-028).
// Resolves the V3 presence-only defect: V3 checked only that founder_signature was non-empty. V4 binds the
// EXACT founder-authorization bytes + the COMPLETE canonical activation payload under a governed Ed25519
// public key. V3 is refused for all new execution (evidence-only). The verified capability is a frozen,
// module-private-branded object — a plain { verified:true } is never accepted anywhere.
import { createHash, verify as edVerify, sign as edSign } from "node:crypto";
import { canonicalize, signedMessage } from "./canonical-json.mjs";
import { resolveVerifierKey, fingerprintOfSpkiDer } from "./founder-key-authority.mjs";

export const ACTIVATION_V4_SCHEMA = "lrcq-activation-4";
export const V4_SIGNATURE_PAYLOAD_VERSION = "lrcq-activation-v4-signature-payload-1";

export const V4_CODES = {
  OK: "OK",
  NOT_V4: "NOT_V4",
  V3_REFUSED_FOR_EXECUTION: "V3_REFUSED_FOR_EXECUTION",
  MISSING_FIELD: "MISSING_FIELD",
  BAD_ALGORITHM: "BAD_ALGORITHM",
  BAD_SIGNATURE_ENCODING: "BAD_SIGNATURE_ENCODING",
  EMPTY_SIGNATURE: "EMPTY_SIGNATURE",
  UNKNOWN_OR_REVOKED_KEY: "UNKNOWN_OR_REVOKED_KEY",
  SIGNATURE_INVALID: "SIGNATURE_INVALID",
  AUTHORIZATION_DIGEST_MISMATCH: "AUTHORIZATION_DIGEST_MISMATCH",
  BINDING_MISMATCH: "BINDING_MISMATCH",
  EXPIRED: "EXPIRED",
  DEADLINE_ELAPSED: "DEADLINE_ELAPSED",
  NOT_YET_ISSUED: "NOT_YET_ISSUED",
  LIMIT_VIOLATION: "LIMIT_VIOLATION",
  EXCLUSION_VIOLATION: "EXCLUSION_VIOLATION",
  FORGED_CAPABILITY: "FORGED_CAPABILITY",
};

// The authority-bearing fields covered by the signature (everything except the signature itself + derived
// receipts + derived identity). This exact ordering is documented; canonicalization sorts keys anyway.
export const V4_PAYLOAD_FIELDS = [
  "schema", "signature_payload_version", "founder_signature_algorithm", "signer_key_fingerprint",
  "authorization_text_digest", "activation_nonce",
  "evidence_commit_sha", "evidence_commit_tree", "reviewed_runtime_sha", "reviewed_runtime_tree",
  "run_id", "backlog_digest",
  "provider_executable_path", "resolved_provider_target", "provider_version", "provider_executable_identity",
  "capability_lease_digest", "blast_radius_budget_digest",
  "issued_epoch", "expiry_epoch", "hard_deadline_epoch",
  "max_budget_usd", "run_duration_s", "per_job_timeout_s", "max_parallel_width", "max_output_bytes", "termination_grace_s",
  "no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized", "no_m1", "no_akior",
  "no_customer_data", "no_live_action", "no_permission_bypass", "no_deploy", "no_external_comms",
];

// Extract the canonical signed payload (excludes founder_signature + any derived fields).
export function extractPayload(activation) {
  const p = {};
  for (const f of V4_PAYLOAD_FIELDS) p[f] = activation[f];
  return p;
}

export function sha256hex(buf) { return createHash("sha256").update(buf).digest("hex"); }
export function authorizationTextDigest(bytes) { return "sha256:" + sha256hex(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)); }

// ---- signing (used by the founder-sign tool + tests with disposable keys) --------------------------
// privateKeyObject: a node KeyObject (ed25519). Returns the signed activation (payload + base64 signature).
export function signActivation(payload, privateKeyObject) {
  if (payload.schema !== ACTIVATION_V4_SCHEMA) throw new Error("signActivation: not V4");
  if (payload.signature_payload_version !== V4_SIGNATURE_PAYLOAD_VERSION) throw new Error("signActivation: wrong payload version");
  const msg = signedMessage(canonicalize(payload));
  const sig = edSign(null, msg, privateKeyObject); // ed25519: algorithm must be null
  return { ...payload, founder_signature: sig.toString("base64") };
}

// ---- three-stage non-forgeable capabilities (FG-LRCQ-ACT-028 Phase 1 A/B/C) -------------------------
// A. VERIFIED — created only after full Ed25519 + payload + binding verification; NOT provider authority.
// B. CONSUMED — created only after atomic one-time consumption of a genuine VERIFIED capability.
// C. SUPERVISOR-EXECUTION — created only inside the detached supervisor after independent reverification +
//    matching consumed marker + one-launch claim. The real provider requires THIS stage, not merely VERIFIED.
// Each stage is a distinct module-private WeakSet brand; a plain object is never accepted at any stage.
const CAP_BRAND = new WeakSet();          // A: verified
const CONSUMED_BRAND = new WeakSet();     // B: consumed
const SUPEXEC_BRAND = new WeakSet();      // C: supervisor-execution
function makeCapability(fields) { const cap = Object.freeze({ ...fields, _stage: "VERIFIED" }); CAP_BRAND.add(cap); return cap; }
export function isVerifiedCapability(x) { return typeof x === "object" && x !== null && CAP_BRAND.has(x); }
export function assertVerifiedCapability(x) { if (!isVerifiedCapability(x)) { const e = new Error("verified capability required"); e.code = V4_CODES.FORGED_CAPABILITY; throw e; } return x; }

// B: mint a CONSUMED capability — only from a genuine VERIFIED capability + the durable marker facts.
export function mintConsumedCapability(verifiedCap, markerFacts) {
  assertVerifiedCapability(verifiedCap);
  const cap = Object.freeze({ _stage: "CONSUMED", activation_identity: verifiedCap.activation_identity, payload_digest: verifiedCap.payload_digest, signer_key_fingerprint: verifiedCap.signer_key_fingerprint, evaluated_candidate: verifiedCap.evaluated_candidate, evidence_candidate: verifiedCap.evidence_candidate, provider_identity: verifiedCap.provider_identity, run_id: verifiedCap.run_id, limits: verifiedCap.limits, consumed_marker_path: markerFacts.markerPath, consumed_marker_digest: markerFacts.markerDigest });
  CONSUMED_BRAND.add(cap); return cap;
}
export function isConsumedCapability(x) { return typeof x === "object" && x !== null && CONSUMED_BRAND.has(x); }

// C: mint a SUPERVISOR-EXECUTION capability — only from a genuine VERIFIED (reverified in-process) capability
// PLUS proof of the matching consumed marker + one-launch claim + supervisor start identity.
export function mintSupervisorExecutionCapability(reverifiedCap, proof) {
  assertVerifiedCapability(reverifiedCap);
  if (!proof || proof.consumedMarkerPresent !== true || proof.markerMatchesIdentity !== true || proof.launchClaimOwned !== true || !proof.supervisorStartIdentity) { const e = new Error("supervisor-execution proof incomplete"); e.code = V4_CODES.FORGED_CAPABILITY; throw e; }
  const cap = Object.freeze({ _stage: "SUPERVISOR_EXECUTION", activation_identity: reverifiedCap.activation_identity, evaluated_candidate: reverifiedCap.evaluated_candidate, evidence_candidate: reverifiedCap.evidence_candidate, provider_identity: reverifiedCap.provider_identity, run_id: reverifiedCap.run_id, limits: reverifiedCap.limits, supervisor_start_identity: proof.supervisorStartIdentity, consumed_marker_path: proof.consumedMarkerPath });
  SUPEXEC_BRAND.add(cap); return cap;
}
export function isSupervisorExecutionCapability(x) { return typeof x === "object" && x !== null && SUPEXEC_BRAND.has(x); }

// Provider eligibility gate — the real provider spawn REQUIRES a genuine SUPERVISOR-EXECUTION capability
// (not verified-only, not consumed-only, not a forged object) + job membership in the signed limits.
export function providerEligibility(capability, job, bindings = {}) {
  if (!isSupervisorExecutionCapability(capability)) return R(V4_CODES.FORGED_CAPABILITY, { detail: "supervisor-execution capability required" });
  if (bindings.providerIdentity !== undefined && bindings.providerIdentity !== capability.provider_identity) return R(V4_CODES.BINDING_MISMATCH, { detail: "provider_identity" });
  if (bindings.evaluatedCandidate !== undefined && bindings.evaluatedCandidate !== capability.evaluated_candidate) return R(V4_CODES.BINDING_MISMATCH, { detail: "evaluated_candidate" });
  if (job && job.risk_class !== undefined && job.risk_class !== "WIDE_SAFE") return R(V4_CODES.EXCLUSION_VIOLATION, { detail: "job not WIDE_SAFE" });
  if (job && job.gate_trigger && job.gate_trigger !== "NONE") return R(V4_CODES.EXCLUSION_VIOLATION, { detail: "job gated" });
  return R(V4_CODES.OK, { capability });
}

function R(code, extra = {}) { return { ok: code === V4_CODES.OK, code, ...extra }; }

// bindings (optional, all cross-checked when present): { evidenceCommitSha, evidenceCommitTree,
// reviewedRuntimeSha, reviewedRuntimeTree, runId, backlogDigest, providerPath, resolvedProviderTarget,
// providerVersion, providerIdentity, capabilityLeaseDigest, blastBudgetDigest, nowEpoch,
// authorizationBytes (the exact founder-authorization file bytes) }
// deps: { keyDeps } forwarded to resolveVerifierKey (fixture authority in tests).
export function verifyActivation(activation, bindings = {}, deps = {}) {
  if (!activation || typeof activation !== "object") return R(V4_CODES.NOT_V4);
  if (activation.schema === "lrcq-activation-3") return R(V4_CODES.V3_REFUSED_FOR_EXECUTION);
  if (activation.schema !== ACTIVATION_V4_SCHEMA) return R(V4_CODES.NOT_V4);
  if (activation.signature_payload_version !== V4_SIGNATURE_PAYLOAD_VERSION) return R(V4_CODES.NOT_V4, { detail: "payload version" });
  if (activation.founder_signature_algorithm !== "ed25519") return R(V4_CODES.BAD_ALGORITHM);
  for (const f of V4_PAYLOAD_FIELDS) if (activation[f] === undefined || activation[f] === null || activation[f] === "") return R(V4_CODES.MISSING_FIELD, { detail: f });
  if (typeof activation.founder_signature !== "string" || activation.founder_signature === "") return R(V4_CODES.EMPTY_SIGNATURE);
  let sig; try { sig = Buffer.from(activation.founder_signature, "base64"); } catch { return R(V4_CODES.BAD_SIGNATURE_ENCODING); }
  if (sig.length !== 64) return R(V4_CODES.BAD_SIGNATURE_ENCODING, { detail: "ed25519 signature must be 64 bytes" });
  // resolve the governed key by fingerprint (must be current, known, non-revoked)
  const kr = resolveVerifierKey(activation.signer_key_fingerprint, deps.keyDeps || {});
  if (!kr.ok) return R(V4_CODES.UNKNOWN_OR_REVOKED_KEY, { detail: kr.code });
  // verify Ed25519 over the domain-separated canonical payload
  const payload = extractPayload(activation);
  const msg = signedMessage(canonicalize(payload));
  let good = false; try { good = edVerify(null, msg, kr.key.keyObject, sig); } catch { good = false; }
  if (!good) return R(V4_CODES.SIGNATURE_INVALID);
  // exact authorization-text binding (if the caller supplies the exact bytes)
  if (bindings.authorizationBytes !== undefined) {
    if (authorizationTextDigest(bindings.authorizationBytes) !== activation.authorization_text_digest) return R(V4_CODES.AUTHORIZATION_DIGEST_MISMATCH);
  }
  // candidate/provider/backlog/lease/budget bindings
  const B = [["evidenceCommitSha", "evidence_commit_sha"], ["evidenceCommitTree", "evidence_commit_tree"], ["reviewedRuntimeSha", "reviewed_runtime_sha"], ["reviewedRuntimeTree", "reviewed_runtime_tree"], ["runId", "run_id"], ["backlogDigest", "backlog_digest"], ["providerPath", "provider_executable_path"], ["resolvedProviderTarget", "resolved_provider_target"], ["providerVersion", "provider_version"], ["providerIdentity", "provider_executable_identity"], ["capabilityLeaseDigest", "capability_lease_digest"], ["blastBudgetDigest", "blast_radius_budget_digest"]];
  for (const [b, f] of B) if (bindings[b] !== undefined && bindings[b] !== activation[f]) return R(V4_CODES.BINDING_MISMATCH, { detail: f });
  // limits (upper-bounded)
  if (!(activation.max_budget_usd > 0 && activation.max_budget_usd <= 10)) return R(V4_CODES.LIMIT_VIOLATION, { detail: "max_budget_usd" });
  if (!(activation.run_duration_s > 0 && activation.run_duration_s <= 18000)) return R(V4_CODES.LIMIT_VIOLATION, { detail: "run_duration_s" });
  if (!(activation.per_job_timeout_s > 0 && activation.per_job_timeout_s <= 2700)) return R(V4_CODES.LIMIT_VIOLATION, { detail: "per_job_timeout_s" });
  if (!(activation.max_parallel_width >= 1 && activation.max_parallel_width <= 2)) return R(V4_CODES.LIMIT_VIOLATION, { detail: "max_parallel_width" });
  if (!(activation.max_output_bytes > 0 && activation.max_output_bytes <= 10485760)) return R(V4_CODES.LIMIT_VIOLATION, { detail: "max_output_bytes" });
  if (!(activation.termination_grace_s > 0 && activation.termination_grace_s <= 30)) return R(V4_CODES.LIMIT_VIOLATION, { detail: "termination_grace_s" });
  // exclusions
  for (const f of ["no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized", "no_m1", "no_akior", "no_customer_data", "no_live_action", "no_permission_bypass", "no_deploy", "no_external_comms"]) if (activation[f] !== true) return R(V4_CODES.EXCLUSION_VIOLATION, { detail: f });
  // temporal (only when nowEpoch supplied)
  if (typeof bindings.nowEpoch === "number") {
    if (activation.issued_epoch > bindings.nowEpoch) return R(V4_CODES.NOT_YET_ISSUED);
    if (activation.expiry_epoch <= bindings.nowEpoch) return R(V4_CODES.EXPIRED);
    if (activation.hard_deadline_epoch <= bindings.nowEpoch) return R(V4_CODES.DEADLINE_ELAPSED);
  }
  // derived: activation identity = sha256(payloadDigest || detached signature bytes)
  const payloadDigest = sha256hex(Buffer.from(canonicalize(payload), "utf8"));
  const activationIdentity = "sha256:" + sha256hex(Buffer.concat([Buffer.from(payloadDigest, "hex"), sig]));
  const cap = makeCapability({
    activation_bytes_digest: "sha256:" + sha256hex(Buffer.from(canonicalize(activation), "utf8")),
    payload_digest: "sha256:" + payloadDigest,
    authorization_text_digest: activation.authorization_text_digest,
    signer_key_fingerprint: activation.signer_key_fingerprint,
    activation_identity: activationIdentity,
    evaluated_candidate: activation.reviewed_runtime_sha,
    evidence_candidate: activation.evidence_commit_sha,
    provider_identity: activation.provider_executable_identity,
    run_id: activation.run_id,
    limits: { max_budget_usd: activation.max_budget_usd, run_duration_s: activation.run_duration_s, per_job_timeout_s: activation.per_job_timeout_s, max_parallel_width: activation.max_parallel_width, max_output_bytes: activation.max_output_bytes, termination_grace_s: activation.termination_grace_s },
    exclusions: { no_deploy: true, no_push_unless_authorized: true, no_live_action: true },
  });
  return R(V4_CODES.OK, { capability: cap, activation_identity: activationIdentity });
}
