// FounderGate LRCQ — Ed25519 signed activation V4 + non-forgeable verified capability (FG-LRCQ-ACT-028).
// Resolves the V3 presence-only defect: V3 checked only that founder_signature was non-empty. V4 binds the
// EXACT founder-authorization bytes + the COMPLETE canonical activation payload under a governed Ed25519
// public key. V3 is refused for all new execution (evidence-only). The verified capability is a frozen,
// module-private-branded object — a plain { verified:true } is never accepted anywhere.
import { createHash, verify as edVerify, sign as edSign } from "node:crypto";
import { fixedPs } from "./fixed-executables.mjs";
import { canonicalize, signedMessage } from "./canonical-json.mjs";
import { resolveVerifierKey } from "./founder-key-authority.mjs";
import { deepFreezeAuthority } from "./deep-freeze-authority.mjs";

// Mechanically OBSERVED process-start identity for a PID — read from the OS (ps lstart), never caller-
// supplied. UNKNOWN/unreadable fails closed (returns null). Used to prove a launch-claim's recorded
// supervisor identity belongs to the ACTUAL current process (catches stale-PID reuse).
export function observedStartIdentity(pid) {
  // FG-CHK-197-02: `ps` runs through the FIXED ABSOLUTE executable (/bin/ps), verified regular+non-symlink+
  // executable immediately before use, in a minimal environment. A bare "ps" was PATH-resolvable, so a hostile
  // script named `ps` could have forged the process-start identity that stale-PID / PID-reuse detection rests on.
  try { const out = fixedPs(["-o", "lstart=", "-p", String(pid)]); return out ? "pid:" + pid + "|lstart:" + out : null; } catch { return null; }
}

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
export const LIFECYCLE_CONTRACT_VERSION = "lrcq-lifecycle-v4-1";
export const V4_PAYLOAD_FIELDS = [
  "schema", "signature_payload_version", "founder_signature_algorithm", "signer_key_fingerprint",
  "authorization_text_digest", "activation_nonce",
  // FG-LRCQ-ACT-028: the repository + lifecycle roots are SIGNED, so authority can be read ONLY from the
  // exact signed lifecycle root (a caller cannot substitute an arbitrary directory of forged records).
  // repository_git_common_dir_realpath binds the run to a SPECIFIC checkout under a SPECIFIC main repo:
  // a copied tree / alternate worktree / re-init'd repo resolves to a different common dir -> refused.
  "repository_root_realpath", "repository_git_common_dir_realpath", "lifecycle_root_realpath", "lifecycle_contract_version",
  "evidence_commit_sha", "evidence_commit_tree", "reviewed_runtime_sha", "reviewed_runtime_tree",
  // FG-LRCQ-ACT-029: the run MANIFEST and the full candidate stack are SIGNED. Without these the V4 record
  // bound no manifest, so the non-authoritative legacy projection would have had to source execution
  // boundaries (repository/branch/worktree/evidence roots, tool sets, timeouts) from an unsigned file, and
  // the legacy candidate-stack fields would have been launcher-supplied rather than founder-signed.
  "run_manifest_path", "run_manifest_digest",
  "lrcq_base_sha", "lrcq_base_tree", "provider_candidate_sha", "provider_candidate_tree",
  "run_id", "backlog_digest",
  "provider_executable_path", "resolved_provider_target", "provider_version", "provider_executable_identity",
  "capability_lease_digest", "blast_radius_budget_digest",
  "issued_epoch", "expiry_epoch", "hard_deadline_epoch",
  "max_budget_usd", "run_duration_s", "per_job_timeout_s", "max_parallel_width", "max_output_bytes", "termination_grace_s",
  "no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized", "no_m1", "no_akior",
  "no_customer_data", "no_live_action", "no_permission_bypass", "no_deploy", "no_external_comms",
];

// ---- the MECHANICAL enumeration of the V4 contract's signed authority values ------------------------
// FG-FCHK-197-B/C: these two tables are the SINGLE source of truth for "which numbers and which exclusions
// the founder signature covers". The verifier bounds the signed payload with them, the capability projects
// exactly these keys into its nested authority objects, and the provider spawn boundary re-derives its
// ceilings from them — so a limit or exclusion can never be enforced in one place and forgotten in another.
//
//   kind: "positive_finite"  -> finite number, > 0
//         "positive_integer" -> integer, >= min
//   max:  the founder-contract ceiling the SIGNED payload may never exceed.
export const V4_SIGNED_LIMITS = Object.freeze([
  Object.freeze({ field: "max_budget_usd", kind: "positive_finite", min: 0, max: 10 }),
  Object.freeze({ field: "run_duration_s", kind: "positive_finite", min: 0, max: 18000 }),
  Object.freeze({ field: "per_job_timeout_s", kind: "positive_finite", min: 0, max: 2700 }),
  Object.freeze({ field: "max_parallel_width", kind: "positive_integer", min: 1, max: 2 }),
  Object.freeze({ field: "max_output_bytes", kind: "positive_finite", min: 0, max: 10485760 }),
  Object.freeze({ field: "termination_grace_s", kind: "positive_finite", min: 0, max: 30 }),
]);
export const V4_SIGNED_LIMIT_FIELDS = Object.freeze(V4_SIGNED_LIMITS.map((l) => l.field));

// Every exclusion the founder signature covers. ALL of them must be exactly `true` in the signed payload,
// and ALL of them must survive to the provider spawn boundary as exactly `true`.
export const V4_SIGNED_EXCLUSIONS = Object.freeze([
  "no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized", "no_m1", "no_akior",
  "no_customer_data", "no_live_action", "no_permission_bypass", "no_deploy", "no_external_comms",
]);

// Is a candidate value valid for a signed limit's declared kind? (Rejects NaN/Infinity/0/negative/missing.)
export function signedLimitValueValid(spec, v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return false;
  if (spec.kind === "positive_integer") return Number.isInteger(v) && v >= (spec.min ?? 1);
  return v > (spec.min ?? 0);
}

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

// ---- VERIFIED capability (FG-LRCQ-ACT-028 Stage A) --------------------------------------------------
// A. VERIFIED — created only after full Ed25519 + payload + binding verification; NOT provider authority.
// The downstream lifecycle stages (B CONSUMED, C SUPERVISOR-EXECUTION) are owned EXCLUSIVELY by
// lifecycle-authority-v4.mjs, which mints them via ephemeral-key-signed durable records — a copied JSON
// marker/claim can no longer reconstruct authority. This module owns ONLY Stage A + the shared
// observedStartIdentity probe; it deliberately no longer exports any derive-from-plain-JSON helper.
const CAP_BRAND = new WeakSet();          // A: verified
// FG-FCHK-197-C: the capability is a FROZEN DEEP COPY. Object.freeze alone is shallow, so `limits` and
// `exclusions` — the founder-signed cost ceiling, duration, width, output cap, grace period and every
// signed exclusion — were writable through any capability reference. deepFreezeAuthority builds an
// authority-owned copy of every nested object and freezes it recursively, so the capability shares no
// mutable structure with the parsed activation document its fields were read from.
function makeCapability(fields) { const cap = deepFreezeAuthority({ ...fields, _stage: "VERIFIED" }); CAP_BRAND.add(cap); return cap; }
export function isVerifiedCapability(x) { return typeof x === "object" && x !== null && CAP_BRAND.has(x); }
export function assertVerifiedCapability(x) { if (!isVerifiedCapability(x)) { const e = new Error("verified capability required"); e.code = V4_CODES.FORGED_CAPABILITY; throw e; } return x; }

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
  const B = [["evidenceCommitSha", "evidence_commit_sha"], ["evidenceCommitTree", "evidence_commit_tree"], ["reviewedRuntimeSha", "reviewed_runtime_sha"], ["reviewedRuntimeTree", "reviewed_runtime_tree"], ["runId", "run_id"], ["backlogDigest", "backlog_digest"], ["providerPath", "provider_executable_path"], ["resolvedProviderTarget", "resolved_provider_target"], ["providerVersion", "provider_version"], ["providerIdentity", "provider_executable_identity"], ["capabilityLeaseDigest", "capability_lease_digest"], ["blastBudgetDigest", "blast_radius_budget_digest"], ["runManifestPath", "run_manifest_path"], ["runManifestDigest", "run_manifest_digest"], ["lrcqBaseSha", "lrcq_base_sha"], ["lrcqBaseTree", "lrcq_base_tree"], ["providerCandidateSha", "provider_candidate_sha"], ["providerCandidateTree", "provider_candidate_tree"]];
  for (const [b, f] of B) if (bindings[b] !== undefined && bindings[b] !== activation[f]) return R(V4_CODES.BINDING_MISMATCH, { detail: f });
  // limits (upper-bounded) — enumerated MECHANICALLY from the contract table, so a limit can never be
  // added to the signed payload and silently left unbounded here.
  for (const spec of V4_SIGNED_LIMITS) {
    const v = activation[spec.field];
    if (!signedLimitValueValid(spec, v) || v > spec.max) return R(V4_CODES.LIMIT_VIOLATION, { detail: spec.field });
  }
  // exclusions — every signed exclusion must be exactly true
  for (const f of V4_SIGNED_EXCLUSIONS) if (activation[f] !== true) return R(V4_CODES.EXCLUSION_VIOLATION, { detail: f });
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
    repository_root: activation.repository_root_realpath,   // SIGNED
    repository_git_common_dir: activation.repository_git_common_dir_realpath, // SIGNED — binds the exact checkout
    lifecycle_root: activation.lifecycle_root_realpath,     // SIGNED — the only place authority is read
    evaluated_candidate: activation.reviewed_runtime_sha,
    evaluated_candidate_tree: activation.reviewed_runtime_tree,
    evidence_candidate: activation.evidence_commit_sha,
    evidence_candidate_tree: activation.evidence_commit_tree,
    provider_identity: activation.provider_executable_identity,
    provider_executable_path: activation.provider_executable_path,
    resolved_provider_target: activation.resolved_provider_target,
    provider_version: activation.provider_version,
    // SIGNED manifest + candidate-stack binding — the ONLY source the non-authoritative legacy projection
    // may read these from (see run-harness/v4-legacy-projection.mjs).
    run_manifest_path: activation.run_manifest_path,
    run_manifest_digest: activation.run_manifest_digest,
    lrcq_base_sha: activation.lrcq_base_sha, lrcq_base_tree: activation.lrcq_base_tree,
    provider_candidate_sha: activation.provider_candidate_sha, provider_candidate_tree: activation.provider_candidate_tree,
    backlog_digest: activation.backlog_digest,
    capability_lease_digest: activation.capability_lease_digest,
    blast_radius_budget_digest: activation.blast_radius_budget_digest,
    issued_epoch: activation.issued_epoch, expiry_epoch: activation.expiry_epoch,
    hard_deadline_epoch: activation.hard_deadline_epoch,
    run_id: activation.run_id,
    // FG-FCHK-197-B/C: both nested authority objects are PROJECTED MECHANICALLY from the signed payload —
    // every limit the contract enumerates and ALL TEN signed exclusions. `exclusions` was previously a
    // hardcoded three-field constant, i.e. a redundant copy of signed authority that no longer tracked the
    // payload; it now derives from the payload the signature covers, and the loop above has already refused
    // any activation whose exclusion is not exactly true.
    limits: Object.fromEntries(V4_SIGNED_LIMIT_FIELDS.map((f) => [f, activation[f]])),
    exclusions: Object.fromEntries(V4_SIGNED_EXCLUSIONS.map((f) => [f, activation[f] === true])),
  });
  return R(V4_CODES.OK, { capability: cap, activation_identity: activationIdentity });
}
