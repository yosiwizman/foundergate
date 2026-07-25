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
import { generateKeyPairSync, sign as edSign, verify as edVerify, createHash, createPublicKey, createPrivateKey } from "node:crypto";
import { writeFileSync, readFileSync, existsSync, lstatSync, statSync, realpathSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
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
  // FG-LRCQ-ACT-029 lifecycle-key containment
  INTENT_MISSING: "INTENT_MISSING", ALREADY_TRANSFERRED: "ALREADY_TRANSFERRED", KEY_RELEASED: "KEY_RELEASED",
  ENTRYPOINT_INVALID: "ENTRYPOINT_INVALID", ENTRYPOINT_DIGEST_MISMATCH: "ENTRYPOINT_DIGEST_MISMATCH",
  DESCRIPTOR_UNAVAILABLE: "DESCRIPTOR_UNAVAILABLE", TRANSFER_WRITE_FAILED: "TRANSFER_WRITE_FAILED",
  FD_UNREADABLE: "FD_UNREADABLE", KEY_FRAME_EMPTY: "KEY_FRAME_EMPTY", KEY_FRAME_TOO_SHORT: "KEY_FRAME_TOO_SHORT",
  KEY_FRAME_MAGIC: "KEY_FRAME_MAGIC", KEY_FRAME_OVERSIZED: "KEY_FRAME_OVERSIZED",
  KEY_FRAME_TRUNCATED: "KEY_FRAME_TRUNCATED", KEY_FRAME_DIGEST: "KEY_FRAME_DIGEST",
  KEY_FRAME_NOT_ED25519: "KEY_FRAME_NOT_ED25519",
};
export const TRANSFER_STATES = { NOT_TRANSFERRED: "NOT_TRANSFERRED", SPENT: "TRANSFERRED_SPENT" };
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
  const state = { launched: false, transfer: TRANSFER_STATES.NOT_TRANSFERRED };
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
  // FG-LRCQ-ACT-029: the supervisor entrypoint is resolved and DIGESTED HERE from the real file — a caller
  // can no longer record an entrypoint digest that does not match a real, non-symlink, regular file. The
  // governed transfer then launches exactly this path and the supervisor proves it IS this program.
  let entryReal = null, entryDigest = null;
  if (opts.supervisorEntrypoint !== undefined && opts.supervisorEntrypoint !== null) {
    const p = opts.supervisorEntrypoint;
    if (typeof p !== "string" || !p) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a path" });
    let lst; try { lst = lstatSync(p); } catch { return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "missing" }); }
    if (lst.isSymbolicLink()) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "symlink" });
    if (!lst.isFile()) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a regular file" });
    try { entryReal = realpathSync(p); } catch { return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "unresolvable" }); }
    if (entryReal !== p) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a realpath" });
    entryDigest = sha256(readFileSync(entryReal));
  }
  const body = {
    schema: LAUNCH_INTENT_SCHEMA, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION,
    activation_identity: consumedCap.activation_identity, payload_digest: consumedCap.payload_digest,
    consumed_marker_digest: consumedCap.consumed_marker_digest, lifecycle_root_digest: sha256(Buffer.from(root)),
    run_id: consumedCap.run_id, provider_identity: consumedCap.provider_identity,
    supervisor_entrypoint_realpath: entryReal, supervisor_entrypoint_digest: entryDigest,
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
// MODULE-PRIVATE. The supervisor never handles a KeyObject: the ONLY exported attach surface is
// attachSupervisorFromInheritedFdV4, which reads the governed key frame off the inherited descriptor,
// uses the reconstructed key here, and scrubs it. This verifies (a) the marker + intent ephemeral
// signatures against the marker's recorded ephemeral pubkey, (b) that the supplied private key's public
// key matches that pubkey, (c) writes an ephemeral-signed claim atomically, and (d) that the claim is
// owned by THIS process (pid + observed start identity).
function attachSupervisorWithKey(verifiedCap, ephemeralPrivateKey, opts = {}) {
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
  // FG-LRCQ-ACT-029: when the signed intent named a supervisor entrypoint, THIS process must actually BE
  // that program (same realpath, same content digest). A different program holding the transferred key
  // cannot mint a supervisor claim.
  if (it.doc.supervisor_entrypoint_realpath) {
    let self = null; try { self = realpathSync(process.argv[1] || ""); } catch { self = null; }
    if (self !== it.doc.supervisor_entrypoint_realpath) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "running program is not the intent's supervisor entrypoint" });
    let selfDigest = null; try { selfDigest = sha256(readFileSync(self)); } catch { selfDigest = null; }
    if (selfDigest !== it.doc.supervisor_entrypoint_digest) return R(LC_CODES.ENTRYPOINT_DIGEST_MISMATCH, { detail: "running program digest" });
  }
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

// ---- PHASE 6: one-use ephemeral-key transfer over an INHERITED ANONYMOUS descriptor ---------------
// FG-LRCQ-ACT-029 LIFECYCLE-PRIVATE-KEY CONTAINMENT. This module exports NO function that returns a
// lifecycle private KeyObject or its DER bytes — not for production, not for tests. The key leaves this
// process through exactly ONE governed operation (spawnGovernedSupervisorV4) which:
//   * requires a genuine opaque CONSUMED capability;
//   * requires an already-created, ephemeral-SIGNED launch intent bound to THIS marker + THIS key;
//   * requires transfer state NOT_TRANSFERRED;
//   * creates the inherited ANONYMOUS descriptor ITSELF (child_process pipe stdio) — a caller can never
//     supply the sink, so the key can never be written to a file, a socket, stdout/stderr, or a log;
//   * spawns exactly the supervisor entrypoint the signed intent recorded (non-symlink regular file whose
//     sha256 matches the intent digest);
//   * writes the framed key exactly once, zeroes every temporary buffer, closes the writer;
//   * deletes the private key from module-private storage;
//   * marks the consumed capability permanently TRANSFERRED_SPENT so a second transfer always fails.
// The key bytes exist only: (a) briefly in this process's memory, (b) in the kernel pipe buffer, (c) in the
// supervisor's memory inside attachSupervisorFromInheritedFdV4. Never argv, env, config JSON, disk, git,
// logs, receipts, stdout or stderr.

// Governed key frame: MAGIC || uint32be(derLen) || der || sha256(MAGIC||len||der). Framing makes an empty,
// malformed, truncated, or oversized supervisor-side descriptor input mechanically detectable.
const KEY_FRAME_MAGIC = Buffer.from("FGV4KEY1", "utf8");
const KEY_FRAME_HEADER = KEY_FRAME_MAGIC.length + 4;
const KEY_FRAME_TAG = 32;
const KEY_FRAME_MIN = KEY_FRAME_HEADER + 16 + KEY_FRAME_TAG;
const KEY_DER_MAX = 256;                       // an ed25519 pkcs8 DER is 48 bytes; 256 is a generous ceiling
const KEY_FRAME_MAX = KEY_FRAME_HEADER + KEY_DER_MAX + KEY_FRAME_TAG;

function encodeKeyFrame(der) {
  const len = Buffer.alloc(4); len.writeUInt32BE(der.length, 0);
  const head = Buffer.concat([KEY_FRAME_MAGIC, len, der]);
  const tag = createHash("sha256").update(head).digest();
  const frame = Buffer.concat([head, tag]);
  head.fill(0); tag.fill(0);
  return frame;
}
// Returns { key } or { err }. NEVER exported.
function decodeKeyFrame(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return { err: LC_CODES.KEY_FRAME_EMPTY };
  if (buf.length > KEY_FRAME_MAX) return { err: LC_CODES.KEY_FRAME_OVERSIZED };
  if (buf.length < KEY_FRAME_MIN) return { err: LC_CODES.KEY_FRAME_TOO_SHORT };
  if (!buf.subarray(0, KEY_FRAME_MAGIC.length).equals(KEY_FRAME_MAGIC)) return { err: LC_CODES.KEY_FRAME_MAGIC };
  const derLen = buf.readUInt32BE(KEY_FRAME_MAGIC.length);
  if (derLen === 0 || derLen > KEY_DER_MAX) return { err: LC_CODES.KEY_FRAME_OVERSIZED };
  if (buf.length !== KEY_FRAME_HEADER + derLen + KEY_FRAME_TAG) return { err: LC_CODES.KEY_FRAME_TRUNCATED };
  const head = buf.subarray(0, KEY_FRAME_HEADER + derLen);
  const tag = buf.subarray(KEY_FRAME_HEADER + derLen);
  if (!createHash("sha256").update(head).digest().equals(tag)) return { err: LC_CODES.KEY_FRAME_DIGEST };
  const der = Buffer.from(buf.subarray(KEY_FRAME_HEADER, KEY_FRAME_HEADER + derLen));
  try {
    const key = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
    if (key.asymmetricKeyType !== "ed25519") return { err: LC_CODES.KEY_FRAME_NOT_ED25519 };
    return { key };
  } catch { return { err: LC_CODES.KEY_FRAME_DIGEST, detail: "der import" }; }
  finally { der.fill(0); }
}

// Re-read + re-verify the durable marker + intent for a CONSUMED capability. Returns { marker, intent } or
// { err }. This is what makes "a verified signed launch intent must already exist" mechanical rather than
// an in-memory flag: the intent record must be on disk, ephemeral-signed, and bound to THIS marker.
function verifiedIntentFor(consumedCap) {
  const root = consumedCap.lifecycle_root, id = consumedCap.activation_identity;
  const m = readRecord(markerPath(root, id), CONSUMED_MARKER_SCHEMA); if (m.err) return { err: m.err };
  if (m.digest !== consumedCap.consumed_marker_digest) return { err: LC_CODES.BINDING_MISMATCH, detail: "marker digest" };
  const ephPub = pubKeyFromB64(m.doc.ephemeral_public_key_spki_b64);
  if (!ephPub || !verifyEphemeral(m.doc, ephPub)) return { err: LC_CODES.EPHEMERAL_SIGNATURE_INVALID, detail: "marker" };
  const iPath = intentPath(root, id);
  if (!existsSync(iPath)) return { err: LC_CODES.INTENT_MISSING };
  const it = readRecord(iPath, LAUNCH_INTENT_SCHEMA); if (it.err) return { err: it.err };
  if (!verifyEphemeral(it.doc, ephPub)) return { err: LC_CODES.EPHEMERAL_SIGNATURE_INVALID, detail: "intent" };
  if (it.doc.activation_identity !== id) return { err: LC_CODES.IDENTITY_MISMATCH, detail: "intent" };
  if (it.doc.consumed_marker_digest !== m.digest) return { err: LC_CODES.BINDING_MISMATCH, detail: "intent->marker digest" };
  if (it.doc.ephemeral_fingerprint !== consumedCap.ephemeral_fingerprint) return { err: LC_CODES.BINDING_MISMATCH, detail: "intent->ephemeral fingerprint" };
  return { marker: m, intent: it };
}

// The GOVERNED launch: this module creates the inherited anonymous descriptor and performs the single
// one-use key transfer. opts:
//   { args = [], stdoutFd, stderrFd, env, cwd, keyFd = 3, detached = true }
// Returns a Promise of { ok, code, child, supervisor_pid, key_fd, entrypoint, transfer }.
export async function spawnGovernedSupervisorV4(consumedCap, opts = {}) {
  if (!isConsumedCapabilityV4(consumedCap)) return R(LC_CODES.FORGED, { detail: "consumed capability required" });
  const st = consumedCap.__state;
  if (st.transfer !== TRANSFER_STATES.NOT_TRANSFERRED) return R(LC_CODES.ALREADY_TRANSFERRED, { transfer: st.transfer });
  const vi = verifiedIntentFor(consumedCap); if (vi.err) return R(vi.err, { detail: vi.detail });
  // the signed intent names the ONE supervisor entrypoint this transfer may launch
  const entry = vi.intent.doc.supervisor_entrypoint_realpath;
  if (typeof entry !== "string" || !entry) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "intent records no supervisor entrypoint" });
  let est; try { est = lstatSync(entry); } catch { return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "missing" }); }
  if (est.isSymbolicLink()) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "symlink" });
  if (!est.isFile()) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a regular file" });
  if (realpathSync(entry) !== entry) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a realpath" });
  const eDigest = sha256(readFileSync(entry));
  if (vi.intent.doc.supervisor_entrypoint_digest !== eDigest) return R(LC_CODES.ENTRYPOINT_DIGEST_MISMATCH, { expected: vi.intent.doc.supervisor_entrypoint_digest, actual: eDigest });
  const key = EPHKEY.get(consumedCap);
  if (!key) return R(LC_CODES.KEY_RELEASED, { detail: "ephemeral key no longer held" });

  const keyFd = Number.isInteger(opts.keyFd) && opts.keyFd >= 3 ? opts.keyFd : 3;
  const stdio = ["ignore", opts.stdoutFd ?? "ignore", opts.stderrFd ?? "ignore"];
  while (stdio.length < keyFd) stdio.push("ignore");
  stdio[keyFd] = "pipe";                                  // the inherited ANONYMOUS descriptor — created HERE
  let child;
  try {
    child = spawn(process.execPath, [entry, ...(opts.args || [])], {
      detached: opts.detached !== false, stdio,
      env: opts.env || { PATH: process.env.PATH, HOME: process.env.HOME },
      ...(opts.cwd ? { cwd: opts.cwd } : {}),
    });
  } catch (e) { return R(LC_CODES.TRANSFER_WRITE_FAILED, { detail: "spawn: " + (e && e.message) }); }
  const writer = child.stdio[keyFd];
  if (!writer || typeof writer.write !== "function" || writer.writable !== true) {
    try { child.kill("SIGKILL"); } catch { /* */ }
    return R(LC_CODES.DESCRIPTOR_UNAVAILABLE, { detail: "governed inherited descriptor not established" });
  }
  // Materialize, frame, write ONCE, scrub, close. Then release the key from module storage and spend the
  // capability — irrespective of write success, so a failed transfer can never be retried with the key.
  const der = key.export({ format: "der", type: "pkcs8" });
  const frame = encodeKeyFrame(der);
  der.fill(0);
  const sent = await new Promise((resolve) => {
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; resolve(r); } };
    writer.on("error", (e) => done({ ok: false, detail: e && e.message }));
    try { writer.write(frame, (e) => { if (e) return done({ ok: false, detail: e.message }); writer.end(() => done({ ok: true })); }); }
    catch (e) { done({ ok: false, detail: e && e.message }); }
  });
  frame.fill(0);
  EPHKEY.delete(consumedCap);
  st.transfer = TRANSFER_STATES.SPENT;
  if (!sent.ok) { try { child.kill("SIGKILL"); } catch { /* */ } return R(LC_CODES.TRANSFER_WRITE_FAILED, { detail: sent.detail, transfer: st.transfer }); }
  if (opts.detached !== false && typeof child.unref === "function") child.unref();
  return R(LC_CODES.OK, { child, supervisor_pid: child.pid, key_fd: keyFd, entrypoint: entry, entrypoint_digest: eDigest, transfer: st.transfer });
}

// SUPERVISOR SIDE — the ONLY exported attach surface. It reads the governed frame off the inherited
// anonymous descriptor, validates it (empty / malformed / truncated / oversized / wrong-algorithm all
// fail closed), attaches with the reconstructed key, and scrubs every buffer. The private key is never
// returned to the caller, so no supervisor-side code can re-export or re-transmit it.
export function attachSupervisorFromInheritedFdV4(verifiedCap, fd, opts = {}) {
  if (!Number.isInteger(fd) || fd < 0) return R(LC_CODES.FD_UNREADABLE, { detail: "invalid descriptor" });
  let buf;
  try { buf = readFileSync(fd); } catch (e) { return R(LC_CODES.FD_UNREADABLE, { detail: e && e.message }); }
  try {
    const d = decodeKeyFrame(buf);
    if (d.err) return R(d.err, { detail: d.detail });
    return attachSupervisorWithKey(verifiedCap, d.key, opts);
  } finally { try { buf.fill(0); } catch { /* */ } }
}
