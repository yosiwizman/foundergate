// FounderGate LRCQ — authenticated V4 lifecycle authority (FG-LRCQ-ACT-028). Closes the
// SIGNED_ROOT_JSON_PROVENANCE_GAP: a caller-written/copied JSON marker/claim inside the signed lifecycle
// root can no longer mint authority, because every lifecycle record is CRYPTOGRAPHICALLY SIGNED by a
// per-activation EPHEMERAL Ed25519 key generated inside the governed consume operation. The ephemeral
// PRIVATE key lives ONLY inside an opaque, module-private CONSUMED capability (never serialized, never on
// disk, never logged). Only the ephemeral PUBLIC key + fingerprint are written into the consumed marker.
// A copied record has no valid ephemeral signature over its canonical body -> refused.
//
// This module OWNS: signed lifecycle-root resolution, strict record schemas + paths, atomic wx creation,
// reread+verify, one-consumption + one-launch state, and the opaque CONSUMED / SUPERVISOR_EXECUTION
// capability transitions. It exposes only complete governed operations — no low-level mint/derive that
// accepts caller-created records.
import { generateKeyPairSync, sign as edSign, verify as edVerify, createHash, createPublicKey } from "node:crypto";
import { writeFileSync, readFileSync, existsSync, lstatSync, statSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, sep } from "node:path";
import { canonicalize } from "./canonical-json.mjs";
import { assertVerifiedCapability, observedStartIdentity } from "./activation-v4.mjs";

export const LIFECYCLE_CONTRACT_VERSION = "lrcq-lifecycle-v4-1";
export const CONSUMED_MARKER_SCHEMA = "lrcq-consumed-activation-v4-1";
export const LAUNCH_INTENT_SCHEMA = "lrcq-launch-intent-v4-1";
export const SUPERVISOR_CLAIM_SCHEMA = "lrcq-supervisor-claim-v4-1";

export const LC_CODES = {
  OK: "OK", FORGED: "FORGED", NO_SIGNED_ROOT: "NO_SIGNED_ROOT", ROOT_MISSING: "ROOT_MISSING",
  ROOT_SYMLINK: "ROOT_SYMLINK", ROOT_NOT_DIR: "ROOT_NOT_DIR", ROOT_ESCAPES_REPO: "ROOT_ESCAPES_REPO",
  RECORD_MISSING: "RECORD_MISSING", RECORD_SYMLINK: "RECORD_SYMLINK", RECORD_NOT_REGULAR: "RECORD_NOT_REGULAR",
  RECORD_PARSE: "RECORD_PARSE", SCHEMA_MISMATCH: "SCHEMA_MISMATCH", IDENTITY_MISMATCH: "IDENTITY_MISMATCH",
  REPO_BINDING_UNAVAILABLE: "REPO_BINDING_UNAVAILABLE", REPO_NOT_A_WORKTREE: "REPO_NOT_A_WORKTREE",
  GIT_COMMON_DIR_MISMATCH: "GIT_COMMON_DIR_MISMATCH", WORKTREE_TOPLEVEL_MISMATCH: "WORKTREE_TOPLEVEL_MISMATCH",
  EPHEMERAL_SIGNATURE_INVALID: "EPHEMERAL_SIGNATURE_INVALID", ALREADY_CONSUMED: "ALREADY_CONSUMED",
  ALREADY_LAUNCHED: "ALREADY_LAUNCHED", DUPLICATE_CLAIM: "DUPLICATE_CLAIM", PID_MISMATCH: "PID_MISMATCH",
  START_IDENTITY_MISMATCH: "START_IDENTITY_MISMATCH", TERMINAL: "TERMINAL", KEY_MISMATCH: "KEY_MISMATCH",
  BINDING_MISMATCH: "BINDING_MISMATCH",
};
const sha256hex = (b) => createHash("sha256").update(b).digest("hex");
const sha256 = (b) => "sha256:" + sha256hex(b);
function R(code, extra = {}) { return { ok: code === LC_CODES.OK, code, ...extra }; }

// ---- module-private opaque capability brands ------------------------------------------------------
const CONSUMED = new WeakSet(); const SUPEXEC = new WeakSet();
// The ephemeral PRIVATE key is held in a module-private WeakMap keyed by the CONSUMED capability — it is
// NOT a property of the capability object, so it never appears in JSON, Object.keys, logs, or structured
// clones. It leaves the process only over the inherited descriptor the launcher hands the supervisor.
const EPHKEY = new WeakMap();
export function isConsumedCapabilityV4(x) { return typeof x === "object" && x !== null && CONSUMED.has(x); }
export function isSupervisorExecutionCapabilityV4(x) { return typeof x === "object" && x !== null && SUPEXEC.has(x); }

// ---- signed repository binding (real git only) ----------------------------------------------------
// FG-LRCQ-ACT-028: bind the run to the EXACT checkout the founder signed. The signed capability carries
// repository_root (the worktree top level) AND repository_git_common_dir (the main .git common dir). We
// mechanically resolve both from REAL git against the signed repository_root and require an exact
// realpath match. A copied tree, a re-init'd repo, or an ALTERNATE worktree of the same repo resolves to
// a different top level / common dir and is refused. No caller-supplied git output is trusted.
function verifyRepositoryBinding(cap) {
  const repo = cap.repository_root, common = cap.repository_git_common_dir;
  if (typeof repo !== "string" || !repo || typeof common !== "string" || !common) return { err: LC_CODES.REPO_BINDING_UNAVAILABLE };
  let rrepo; try { rrepo = realpathSync(repo); } catch { return { err: LC_CODES.REPO_BINDING_UNAVAILABLE }; }
  const git = (args) => execFileSync("git", ["-C", rrepo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  let top, gcd;
  try { top = git(["rev-parse", "--show-toplevel"]); gcd = git(["rev-parse", "--git-common-dir"]); }
  catch { return { err: LC_CODES.REPO_NOT_A_WORKTREE }; }
  let rtop, rgcd, rcommon;
  try { rtop = realpathSync(top); } catch { return { err: LC_CODES.REPO_NOT_A_WORKTREE }; }
  // git-common-dir may be relative to rrepo; resolve then realpath.
  try { rgcd = realpathSync(gcd.startsWith(sep) ? gcd : join(rrepo, gcd)); } catch { return { err: LC_CODES.GIT_COMMON_DIR_MISMATCH }; }
  try { rcommon = realpathSync(common); } catch { return { err: LC_CODES.GIT_COMMON_DIR_MISMATCH }; }
  if (rtop !== rrepo) return { err: LC_CODES.WORKTREE_TOPLEVEL_MISMATCH };
  if (rgcd !== rcommon) return { err: LC_CODES.GIT_COMMON_DIR_MISMATCH };
  return { ok: true, repo: rrepo, common: rgcd };
}

// ---- signed lifecycle-root resolution (real fs only) ----------------------------------------------
function resolveSignedRoot(cap) {
  const rb = verifyRepositoryBinding(cap); if (rb.err) return { err: rb.err };
  const root = cap.lifecycle_root, repo = cap.repository_root;
  if (typeof root !== "string" || !root || typeof repo !== "string" || !repo) return { err: LC_CODES.NO_SIGNED_ROOT };
  if (!existsSync(root)) return { err: LC_CODES.ROOT_MISSING };
  let st; try { st = lstatSync(root); } catch { return { err: LC_CODES.ROOT_MISSING }; }
  if (st.isSymbolicLink()) return { err: LC_CODES.ROOT_SYMLINK };
  let rr, rrepo; try { rr = realpathSync(root); rrepo = realpathSync(repo); } catch { return { err: LC_CODES.ROOT_MISSING }; }
  if (!statSync(rr).isDirectory()) return { err: LC_CODES.ROOT_NOT_DIR };
  if (rr !== rrepo && !rr.startsWith(rrepo + sep)) return { err: LC_CODES.ROOT_ESCAPES_REPO };
  return { root: rr };
}
const idFile = (id) => id.replace(":", "_");
const markerPath = (root, id) => join(root, idFile(id) + ".consumed.json");
const intentPath = (root, id) => join(root, idFile(id) + ".launch-intent.json");
const claimPath = (root, id) => join(root, idFile(id) + ".supervisor-claim.json");

function readRecord(path, schema) {
  if (!existsSync(path)) return { err: LC_CODES.RECORD_MISSING };
  let st; try { st = lstatSync(path); } catch { return { err: LC_CODES.RECORD_MISSING }; }
  if (st.isSymbolicLink()) return { err: LC_CODES.RECORD_SYMLINK };
  if (!statSync(path).isFile()) return { err: LC_CODES.RECORD_NOT_REGULAR };
  let bytes, doc; try { bytes = readFileSync(path, "utf8"); doc = JSON.parse(bytes); } catch { return { err: LC_CODES.RECORD_PARSE }; }
  if (doc.schema !== schema) return { err: LC_CODES.SCHEMA_MISMATCH };
  return { bytes, doc, digest: sha256(Buffer.from(bytes)) };
}
// The signed body = the record minus its own ephemeral_signature; the ephemeral key signs canonical(body).
function bodyOf(doc) { const { ephemeral_signature, ...body } = doc; return body; }
function verifyEphemeral(doc, ephemeralPubKeyObj) {
  if (typeof doc.ephemeral_signature !== "string") return false;
  let sig; try { sig = Buffer.from(doc.ephemeral_signature, "base64"); } catch { return false; }
  if (sig.length !== 64) return false;
  try { return edVerify(null, Buffer.from(canonicalize(bodyOf(doc)), "utf8"), ephemeralPubKeyObj, sig); } catch { return false; }
}
function pubKeyFromB64(b64) { try { return createPublicKey({ key: Buffer.from(b64, "base64"), format: "der", type: "spki" }); } catch { return null; } }

// ---- PHASE 4: governed consumption -> opaque CONSUMED capability -----------------------------------
export function consumeActivationV4(verifiedCap, opts = {}) {
  assertVerifiedCapability(verifiedCap);
  const rr = resolveSignedRoot(verifiedCap); if (rr.err) return R(rr.err);
  const root = rr.root; const mPath = markerPath(root, verifiedCap.activation_identity);
  if (existsSync(mPath)) return R(LC_CODES.ALREADY_CONSUMED);
  // per-activation EPHEMERAL Ed25519 key — private key stays only in the opaque capability
  const eph = generateKeyPairSync("ed25519");
  const ephPubDer = createPublicKey(eph.privateKey).export({ format: "der", type: "spki" });
  const now = typeof opts.now === "number" ? opts.now : (opts.nowFn ? opts.nowFn() : 0);
  const nonce = sha256hex(ephPubDer).slice(0, 32); // deterministic-from-key nonce (no ambient randomness beyond the key)
  const body = {
    schema: CONSUMED_MARKER_SCHEMA, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION,
    activation_identity: verifiedCap.activation_identity, payload_digest: verifiedCap.payload_digest,
    signer_key_fingerprint: verifiedCap.signer_key_fingerprint, authorization_text_digest: verifiedCap.authorization_text_digest,
    run_id: verifiedCap.run_id, provider_identity: verifiedCap.provider_identity,
    lifecycle_root_digest: sha256(Buffer.from(root)), consumption_nonce: nonce, consumed_epoch: now,
    consumed_once: true, may_not_be_consumed_again: true, replay_protected: true,
    ephemeral_public_key_spki_b64: ephPubDer.toString("base64"), ephemeral_fingerprint: sha256(ephPubDer),
  };
  const sig = edSign(null, Buffer.from(canonicalize(body), "utf8"), eph.privateKey).toString("base64");
  const marker = { ...body, ephemeral_signature: sig };
  const bytes = JSON.stringify(marker, null, 2) + "\n";
  try { writeFileSync(mPath, bytes, { flag: "wx", mode: 0o600 }); }
  catch (e) { if (e && e.code === "EEXIST") return R(LC_CODES.ALREADY_CONSUMED); return R(LC_CODES.FORGED, { detail: "marker write: " + (e && e.message) }); }
  // reread + verify the exact bytes
  const rd = readRecord(mPath, CONSUMED_MARKER_SCHEMA); if (rd.err) return R(rd.err);
  const pub = pubKeyFromB64(rd.doc.ephemeral_public_key_spki_b64); if (!pub || !verifyEphemeral(rd.doc, pub)) return R(LC_CODES.EPHEMERAL_SIGNATURE_INVALID);
  if (rd.doc.activation_identity !== verifiedCap.activation_identity) return R(LC_CODES.IDENTITY_MISMATCH);
  // opaque CONSUMED capability — holds the ephemeral private key privately; launch state is mutable-in-module
  const state = { launched: false };
  const cap = Object.freeze({
    _stage: "CONSUMED", activation_identity: verifiedCap.activation_identity, payload_digest: verifiedCap.payload_digest,
    provider_identity: verifiedCap.provider_identity, run_id: verifiedCap.run_id, lifecycle_root: root,
    consumed_marker_path: mPath, consumed_marker_digest: rd.digest, ephemeral_fingerprint: rd.doc.ephemeral_fingerprint,
    __state: state, evaluated_candidate: verifiedCap.evaluated_candidate, evidence_candidate: verifiedCap.evidence_candidate,
  });
  EPHKEY.set(cap, eph.privateKey); // private key held OUTSIDE the object — never serialized
  CONSUMED.add(cap);
  return R(LC_CODES.OK, { capability: cap, marker_path: mPath });
}

// ---- PHASE 5: governed launch intent (signed by the ephemeral key) --------------------------------
export function createLaunchIntentV4(consumedCap, opts = {}) {
  if (!isConsumedCapabilityV4(consumedCap)) return R(LC_CODES.FORGED, { detail: "consumed capability required" });
  if (consumedCap.__state.launched) return R(LC_CODES.ALREADY_LAUNCHED);
  const root = consumedCap.lifecycle_root; const iPath = intentPath(root, consumedCap.activation_identity);
  if (existsSync(iPath)) return R(LC_CODES.ALREADY_LAUNCHED);
  const now = typeof opts.now === "number" ? opts.now : 0;
  const body = {
    schema: LAUNCH_INTENT_SCHEMA, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION,
    activation_identity: consumedCap.activation_identity, payload_digest: consumedCap.payload_digest,
    consumed_marker_digest: consumedCap.consumed_marker_digest, lifecycle_root_digest: sha256(Buffer.from(root)),
    run_id: consumedCap.run_id, provider_identity: consumedCap.provider_identity,
    supervisor_entrypoint_realpath: opts.supervisorEntrypointRealpath || null, supervisor_entrypoint_digest: opts.supervisorEntrypointDigest || null,
    launch_nonce: sha256hex(Buffer.from(consumedCap.ephemeral_fingerprint + ":intent")).slice(0, 32),
    creation_epoch: now, hard_deadline_epoch: opts.hardDeadlineEpoch || null, state: "UNCLAIMED",
    ephemeral_fingerprint: consumedCap.ephemeral_fingerprint,
  };
  const sig = edSign(null, Buffer.from(canonicalize(body), "utf8"), EPHKEY.get(consumedCap)).toString("base64");
  const bytes = JSON.stringify({ ...body, ephemeral_signature: sig }, null, 2) + "\n";
  try { writeFileSync(iPath, bytes, { flag: "wx", mode: 0o600 }); }
  catch (e) { if (e && e.code === "EEXIST") return R(LC_CODES.ALREADY_LAUNCHED); return R(LC_CODES.FORGED, { detail: "intent write: " + (e && e.message) }); }
  consumedCap.__state.launched = true;
  return R(LC_CODES.OK, { intent_path: iPath, launch_nonce: body.launch_nonce });
}

// ---- PHASE 7/8: governed supervisor attach -> opaque SUPERVISOR_EXECUTION --------------------------
// The supervisor supplies the ephemeral PRIVATE key it received over the inherited descriptor. This
// verifies (a) the marker + intent ephemeral signatures against the marker's recorded ephemeral pubkey,
// (b) that the supplied private key's public key matches that pubkey, (c) writes an ephemeral-signed claim
// atomically, and (d) that the claim is owned by THIS process (pid + observed start identity).
export function attachSupervisorV4(verifiedCap, ephemeralPrivateKey, opts = {}) {
  assertVerifiedCapability(verifiedCap);
  const rr = resolveSignedRoot(verifiedCap); if (rr.err) return R(rr.err);
  const root = rr.root; const id = verifiedCap.activation_identity;
  const m = readRecord(markerPath(root, id), CONSUMED_MARKER_SCHEMA); if (m.err) return R(m.err);
  if (m.doc.activation_identity !== id) return R(LC_CODES.IDENTITY_MISMATCH);
  const ephPub = pubKeyFromB64(m.doc.ephemeral_public_key_spki_b64); if (!ephPub || !verifyEphemeral(m.doc, ephPub)) return R(LC_CODES.EPHEMERAL_SIGNATURE_INVALID, { detail: "marker" });
  const it = readRecord(intentPath(root, id), LAUNCH_INTENT_SCHEMA); if (it.err) return R(it.err);
  if (it.doc.activation_identity !== id || !verifyEphemeral(it.doc, ephPub)) return R(LC_CODES.EPHEMERAL_SIGNATURE_INVALID, { detail: "intent" });
  if (it.doc.consumed_marker_digest !== m.digest) return R(LC_CODES.BINDING_MISMATCH, { detail: "intent->marker digest" });
  // prove the supplied ephemeral private key matches the marker's recorded public key
  let suppliedPubDer; try { suppliedPubDer = createPublicKey(ephemeralPrivateKey).export({ format: "der", type: "spki" }); } catch { return R(LC_CODES.KEY_MISMATCH, { detail: "not a key" }); }
  if (sha256(suppliedPubDer) !== m.doc.ephemeral_fingerprint) return R(LC_CODES.KEY_MISMATCH);
  const pid = process.pid; const observed = observedStartIdentity(pid);
  if (!observed) return R(LC_CODES.START_IDENTITY_MISMATCH, { detail: "unknown" });
  const cPath = claimPath(root, id);
  if (existsSync(cPath)) return R(LC_CODES.DUPLICATE_CLAIM);
  const body = {
    schema: SUPERVISOR_CLAIM_SCHEMA, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION, activation_identity: id,
    payload_digest: m.doc.payload_digest, consumed_marker_digest: m.digest, launch_intent_digest: it.digest,
    launch_nonce: it.doc.launch_nonce, supervisor_pid: pid, supervisor_start_identity: observed,
    supervisor_entrypoint_digest: it.doc.supervisor_entrypoint_digest, claim_epoch: typeof opts.now === "number" ? opts.now : 0,
    terminal: false, ephemeral_fingerprint: m.doc.ephemeral_fingerprint,
  };
  const sig = edSign(null, Buffer.from(canonicalize(body), "utf8"), ephemeralPrivateKey).toString("base64");
  const bytes = JSON.stringify({ ...body, ephemeral_signature: sig }, null, 2) + "\n";
  try { writeFileSync(cPath, bytes, { flag: "wx", mode: 0o600 }); }
  catch (e) { if (e && e.code === "EEXIST") return R(LC_CODES.DUPLICATE_CLAIM); return R(LC_CODES.FORGED, { detail: "claim write: " + (e && e.message) }); }
  const cd = readRecord(cPath, SUPERVISOR_CLAIM_SCHEMA); if (cd.err) return R(cd.err);
  if (!verifyEphemeral(cd.doc, ephPub)) return R(LC_CODES.EPHEMERAL_SIGNATURE_INVALID, { detail: "claim" });
  if (cd.doc.supervisor_pid !== pid || cd.doc.supervisor_start_identity !== observed) return R(LC_CODES.PID_MISMATCH);
  const cap = Object.freeze({
    _stage: "SUPERVISOR_EXECUTION", activation_identity: id, payload_digest: m.doc.payload_digest,
    evaluated_candidate: verifiedCap.evaluated_candidate, evidence_candidate: verifiedCap.evidence_candidate,
    provider_identity: m.doc.provider_identity, run_id: m.doc.run_id, limits: verifiedCap.limits,
    consumed_marker_digest: m.digest, launch_intent_digest: it.digest, supervisor_claim_digest: cd.digest,
    supervisor_pid: pid, supervisor_start_identity: observed,
  });
  SUPEXEC.add(cap);
  return R(LC_CODES.OK, { capability: cap, claim_path: cPath });
}

// Provider eligibility requires the SUPERVISOR_EXECUTION stage from this module.
export function providerEligibilityV4(cap, job, bindings = {}) {
  if (!isSupervisorExecutionCapabilityV4(cap)) return R(LC_CODES.FORGED, { detail: "supervisor-execution capability required" });
  if (bindings.providerIdentity !== undefined && bindings.providerIdentity !== cap.provider_identity) return R(LC_CODES.BINDING_MISMATCH, { detail: "provider_identity" });
  if (bindings.evaluatedCandidate !== undefined && bindings.evaluatedCandidate !== cap.evaluated_candidate) return R(LC_CODES.BINDING_MISMATCH, { detail: "evaluated_candidate" });
  if (job && job.risk_class !== undefined && job.risk_class !== "WIDE_SAFE") return R(LC_CODES.BINDING_MISMATCH, { detail: "job not WIDE_SAFE" });
  if (job && job.gate_trigger && job.gate_trigger !== "NONE") return R(LC_CODES.BINDING_MISMATCH, { detail: "job gated" });
  return R(LC_CODES.OK, { capability: cap });
}

// Test-only helper: export the ephemeral private key ONLY for the in-process test harness that simulates
// the inherited-descriptor transfer. Never used by production (the real transfer is the inherited FD).
export function __testEphemeralKeyOf(consumedCap) { if (!isConsumedCapabilityV4(consumedCap)) throw new Error("not a consumed cap"); return EPHKEY.get(consumedCap); }
