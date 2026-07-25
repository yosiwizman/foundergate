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
import { spawn } from "node:child_process";
import { join, sep } from "node:path";
import { canonicalize } from "./canonical-json.mjs";
import { assertVerifiedCapability, observedStartIdentity } from "./activation-v4.mjs";
import { fixedGit } from "./fixed-executables.mjs";
import { assertAuthorityObject, FS_CLASS, objectIdOf } from "./fs-authority-guards.mjs";
import { deepFreezeAuthority } from "./deep-freeze-authority.mjs";

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
  // FG-FCHK-197-A: an asynchronous ChildProcess 'error' (bad cwd, unreachable executable) is a governed,
  // fail-closed SPAWN failure — never an unhandled event that terminates the launcher.
  SUPERVISOR_SPAWN_FAILED: "SUPERVISOR_SPAWN_FAILED",
  // FG-FFIN-197-F1: a governed transfer reports OK only after the EXACT spawned supervisor has proven, with a
  // verified ephemeral-signed claim, that it received and used the key. These are the three ways that proof
  // can fail to arrive.
  SUPERVISOR_TERMINATED_BEFORE_CLAIM: "SUPERVISOR_TERMINATED_BEFORE_CLAIM",
  SUPERVISOR_CLAIM_TIMEOUT: "SUPERVISOR_CLAIM_TIMEOUT",
  SUPERVISOR_CLAIM_INVALID: "SUPERVISOR_CLAIM_INVALID",
  // FG-CHK-197-04 / FG-CHK-197-05 filesystem authority guards
  ROOT_UNSAFE_OWNER: "ROOT_UNSAFE_OWNER", ROOT_UNSAFE_MODE: "ROOT_UNSAFE_MODE",
  RECORD_UNSAFE_OWNER: "RECORD_UNSAFE_OWNER", RECORD_UNSAFE_MODE: "RECORD_UNSAFE_MODE",
  ROOT_OBJECT_IDENTITY_MISMATCH: "ROOT_OBJECT_IDENTITY_MISMATCH",
  FD_UNREADABLE: "FD_UNREADABLE", KEY_FRAME_EMPTY: "KEY_FRAME_EMPTY", KEY_FRAME_TOO_SHORT: "KEY_FRAME_TOO_SHORT",
  KEY_FRAME_MAGIC: "KEY_FRAME_MAGIC", KEY_FRAME_OVERSIZED: "KEY_FRAME_OVERSIZED",
  KEY_FRAME_TRUNCATED: "KEY_FRAME_TRUNCATED", KEY_FRAME_DIGEST: "KEY_FRAME_DIGEST",
  KEY_FRAME_NOT_ED25519: "KEY_FRAME_NOT_ED25519",
};
// FG-CHK-197-01: TRANSFERRING is an IN-FLIGHT sentinel. It is set SYNCHRONOUSLY after the one-use guard and
// before any child creation, spawn, key export, pipe write, or asynchronous yield, so a concurrent caller
// entering the function observes a non-NOT_TRANSFERRED state and is refused ALREADY_TRANSFERRED before spawn.
export const TRANSFER_STATES = { NOT_TRANSFERRED: "NOT_TRANSFERRED", TRANSFERRING: "TRANSFERRING", SPENT: "TRANSFERRED_SPENT" };
const sha256hex = (b) => createHash("sha256").update(b).digest("hex");
const sha256 = (b) => "sha256:" + sha256hex(b);
function R(code, extra = {}) { return { ok: code === LC_CODES.OK, code, ...extra }; }

// ---- module-private opaque capability brands ------------------------------------------------------
const CONSUMED = new WeakSet(); const SUPEXEC = new WeakSet();
// The ephemeral PRIVATE key is held in a module-private WeakMap keyed by the CONSUMED capability — it is
// NOT a property of the capability object, so it never appears in JSON, Object.keys, logs, or structured
// clones. It leaves the process only over the inherited descriptor the launcher hands the supervisor.
const EPHKEY = new WeakMap();
// FG-CHK-197-06: mutable lifecycle state (launch + transfer) lives in a module-private WeakMap keyed by the
// capability — NOT as an enumerable `__state` property of the frozen object. Object.freeze is shallow, so a
// nested state object placed on the capability escaped the freeze: any holder could write to it and
// JSON.stringify exposed it. Nothing mutable is reachable from the returned capability now.
const CAPSTATE = new WeakMap();
export function isConsumedCapabilityV4(x) { return typeof x === "object" && x !== null && CONSUMED.has(x); }
export function isSupervisorExecutionCapabilityV4(x) { return typeof x === "object" && x !== null && SUPEXEC.has(x); }
// READ-ONLY snapshot of a consumed capability's lifecycle state, for tests and evidence. Returns a frozen
// copy: there is no setter, and mutating the returned object cannot affect module state.
export function lifecycleStateV4(consumedCap) {
  if (!isConsumedCapabilityV4(consumedCap)) return null;
  const st = CAPSTATE.get(consumedCap);
  return st ? Object.freeze({ launched: st.launched, transfer: st.transfer }) : null;
}

// ---- signed repository binding (real git only) ----------------------------------------------------
// FG-LRCQ-ACT-028: bind the run to the EXACT checkout the founder signed. The signed capability carries
// repository_root (the worktree top level) AND repository_git_common_dir (the main .git common dir). We
// mechanically resolve both from REAL git against the signed repository_root and require an exact
// realpath match. A copied tree, a re-init'd repo, or an ALTERNATE worktree of the same repo resolves to
// a different top level and is refused. No caller-supplied git output is trusted.
//
// FG-CHK-197-02: `git` is invoked through the FIXED ABSOLUTE executable (/usr/bin/git), verified to be a
// regular non-symlink executable immediately before use, in a MINIMAL environment. Previously this used a bare
// `execFileSync("git", ...)`, so the identity of git itself was caller-selectable: a hostile script named
// `git` first on PATH answered --show-toplevel with an attacker-chosen directory and the ephemeral-signed
// consumed marker was written there. The minimal environment additionally drops GIT_DIR / GIT_WORK_TREE /
// GIT_COMMON_DIR / GIT_CONFIG_*, any of which could otherwise redirect what git reports.
//
// NOTE ON ALTERNATE WORKTREES (Checker correction): an alternate worktree of the same repository SHARES the
// common dir, so the common-dir comparison alone does not distinguish it. The binding holds via the TOPLEVEL
// check: git -C <SIGNED repository_root> rev-parse --show-toplevel must equal the signed root exactly.
function verifyRepositoryBinding(cap) {
  const repo = cap.repository_root, common = cap.repository_git_common_dir;
  if (typeof repo !== "string" || !repo || typeof common !== "string" || !common) return { err: LC_CODES.REPO_BINDING_UNAVAILABLE };
  let rrepo; try { rrepo = realpathSync(repo); } catch { return { err: LC_CODES.REPO_BINDING_UNAVAILABLE }; }
  const git = (args) => fixedGit(["-C", rrepo, ...args]);
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
// FG-CHK-197-04: the root must additionally be owned by the running user and must not be group/other
// WRITABLE (a directory must stay traversable, so 0755 inside the repository is accepted).
// FG-CHK-197-05: the root's authority identity is its canonical filesystem OBJECT identity (device + inode),
// not the signed byte-string. Two spellings of the same directory are the SAME authority root and derive the
// SAME digest; a different filesystem object is refused even when the path string looks similar.
// FG-FCHK-197-D: `expectObjectId` is the identity captured when the activation was governed-consumed. Every
// authority operation AFTER consumption passes it, so a DIFFERENT filesystem object at the signed path — the
// rename-aside-and-recreate attack, with valid-looking records copied in at safe modes — is refused here,
// BEFORE any record is parsed and long before the ephemeral key is compared. Passing it is no longer
// optional on any production route: the refusal code is reachable, not dead.
function resolveSignedRoot(cap, expectObjectId) {
  const rb = verifyRepositoryBinding(cap); if (rb.err) return { err: rb.err };
  const root = cap.lifecycle_root, repo = cap.repository_root;
  if (typeof root !== "string" || !root || typeof repo !== "string" || !repo) return { err: LC_CODES.NO_SIGNED_ROOT };
  if (!existsSync(root)) return { err: LC_CODES.ROOT_MISSING };
  let st; try { st = lstatSync(root); } catch { return { err: LC_CODES.ROOT_MISSING }; }
  if (st.isSymbolicLink()) return { err: LC_CODES.ROOT_SYMLINK };
  let rr, rrepo; try { rr = realpathSync(root); rrepo = realpathSync(repo); } catch { return { err: LC_CODES.ROOT_MISSING }; }
  let dst; try { dst = statSync(rr); } catch { return { err: LC_CODES.ROOT_MISSING }; }
  if (!dst.isDirectory()) return { err: LC_CODES.ROOT_NOT_DIR };
  if (rr !== rrepo && !rr.startsWith(rrepo + sep)) return { err: LC_CODES.ROOT_ESCAPES_REPO };
  const g = assertAuthorityObject(rr, FS_CLASS.DIRECTORY, { expectObjectId: expectObjectId ?? null });
  if (!g.ok) {
    if (g.code === "FS_OBJECT_IDENTITY_MISMATCH") return { err: LC_CODES.ROOT_OBJECT_IDENTITY_MISMATCH, detail: "root is " + g.object_id + ", authority expects " + g.expected_object_id };
    return { err: g.code === "FS_UNSAFE_OWNER" ? LC_CODES.ROOT_UNSAFE_OWNER : LC_CODES.ROOT_UNSAFE_MODE, detail: g.code + " " + (g.mode || "") };
  }
  return { root: rr, objectId: g.objectId, objectIdDigest: g.objectIdDigest };
}
const idFile = (id) => id.replace(":", "_");
const markerPath = (root, id) => join(root, idFile(id) + ".consumed.json");
const intentPath = (root, id) => join(root, idFile(id) + ".launch-intent.json");
const claimPath = (root, id) => join(root, idFile(id) + ".supervisor-claim.json");

// FG-CHK-197-04: every authority-record READ enforces owner + mode, not only symlink + regular-file.
// Lifecycle records are SECRET_OR_MUTABLE: FounderGate creates them 0600 and refuses ANY group/other
// permission on read, so a permissive directory cannot let another local account stage lifecycle records.
// FG-FCHK-197-D: `opts.expectRootObjectId` additionally requires the record to have been written for the
// SAME lifecycle-root filesystem object the authority is bound to. Every authority-bearing record — marker,
// intent AND claim — carries lifecycle_root_object_id, so a record copied into a replacement directory is
// refused on object identity even though its bytes and its ephemeral signature are internally valid.
function readRecord(path, schema, opts = {}) {
  if (!existsSync(path)) return { err: LC_CODES.RECORD_MISSING };
  let st; try { st = lstatSync(path); } catch { return { err: LC_CODES.RECORD_MISSING }; }
  if (st.isSymbolicLink()) return { err: LC_CODES.RECORD_SYMLINK };
  if (!statSync(path).isFile()) return { err: LC_CODES.RECORD_NOT_REGULAR };
  const g = assertAuthorityObject(path, FS_CLASS.SECRET_OR_MUTABLE);
  if (!g.ok) {
    if (g.code === "FS_UNSAFE_OWNER") return { err: LC_CODES.RECORD_UNSAFE_OWNER, detail: "uid " + g.uid + " != " + g.expected_uid };
    if (g.code === "FS_UNSAFE_MODE") return { err: LC_CODES.RECORD_UNSAFE_MODE, detail: "mode " + g.mode };
    if (g.code === "FS_SYMLINK") return { err: LC_CODES.RECORD_SYMLINK };
    if (g.code === "FS_NOT_REGULAR_FILE") return { err: LC_CODES.RECORD_NOT_REGULAR };
    return { err: LC_CODES.RECORD_MISSING, detail: g.code };
  }
  let bytes, doc; try { bytes = readFileSync(path, "utf8"); doc = JSON.parse(bytes); } catch { return { err: LC_CODES.RECORD_PARSE }; }
  if (doc.schema !== schema) return { err: LC_CODES.SCHEMA_MISMATCH };
  const expectRoot = opts.expectRootObjectId;
  if (expectRoot !== undefined && expectRoot !== null && doc.lifecycle_root_object_id !== expectRoot) {
    return { err: LC_CODES.ROOT_OBJECT_IDENTITY_MISMATCH, detail: schema + " records " + doc.lifecycle_root_object_id + ", authority expects " + expectRoot };
  }
  return { bytes, doc, digest: sha256(Buffer.from(bytes)), objectId: g.objectId, mode: g.mode };
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
    // FG-CHK-197-05: the lifecycle-root digest is derived from the canonical filesystem OBJECT identity
    // (device + inode), so one physical directory has exactly one digest regardless of path spelling. The
    // object id itself is recorded so every later authority read can require the SAME filesystem object.
    lifecycle_root_digest: rr.objectIdDigest, lifecycle_root_object_id: rr.objectId,
    consumption_nonce: nonce, consumed_epoch: now,
    consumed_once: true, may_not_be_consumed_again: true, replay_protected: true,
    ephemeral_public_key_spki_b64: ephPubDer.toString("base64"), ephemeral_fingerprint: sha256(ephPubDer),
  };
  const sig = edSign(null, Buffer.from(canonicalize(body), "utf8"), eph.privateKey).toString("base64");
  const marker = { ...body, ephemeral_signature: sig };
  const bytes = JSON.stringify(marker, null, 2) + "\n";
  try { writeFileSync(mPath, bytes, { flag: "wx", mode: 0o600 }); }
  catch (e) { if (e && e.code === "EEXIST") return R(LC_CODES.ALREADY_CONSUMED); return R(LC_CODES.FORGED, { detail: "marker write: " + (e && e.message) }); }
  // reread + verify the exact bytes (and that the marker really recorded THIS root object)
  const rd = readRecord(mPath, CONSUMED_MARKER_SCHEMA, { expectRootObjectId: rr.objectId }); if (rd.err) return R(rd.err);
  const pub = pubKeyFromB64(rd.doc.ephemeral_public_key_spki_b64); if (!pub || !verifyEphemeral(rd.doc, pub)) return R(LC_CODES.EPHEMERAL_SIGNATURE_INVALID);
  if (rd.doc.activation_identity !== verifiedCap.activation_identity) return R(LC_CODES.IDENTITY_MISMATCH);
  // Opaque CONSUMED capability. FG-CHK-197-06: it carries NO mutable state — the ephemeral private key AND
  // the launch/transfer state both live in module-private WeakMaps, so Object.freeze is not defeated by a
  // nested object, JSON.stringify exposes no lifecycle state, and Reflect.ownKeys reveals nothing writable.
  // FG-FCHK-197-C: published as a frozen DEEP copy for the same reason the other two stages are.
  // FG-FCHK-197-D: the signed repository binding travels with the capability so every LATER authority
  // operation can RE-RESOLVE the signed lifecycle root rather than trusting a remembered path string.
  const cap = deepFreezeAuthority({
    _stage: "CONSUMED", activation_identity: verifiedCap.activation_identity, payload_digest: verifiedCap.payload_digest,
    provider_identity: verifiedCap.provider_identity, run_id: verifiedCap.run_id, lifecycle_root: root,
    lifecycle_root_object_id: rr.objectId,
    repository_root: verifiedCap.repository_root, repository_git_common_dir: verifiedCap.repository_git_common_dir,
    consumed_marker_path: mPath, consumed_marker_digest: rd.digest, ephemeral_fingerprint: rd.doc.ephemeral_fingerprint,
    evaluated_candidate: verifiedCap.evaluated_candidate, evidence_candidate: verifiedCap.evidence_candidate,
  });
  EPHKEY.set(cap, eph.privateKey); // private key held OUTSIDE the object — never serialized
  // FG-FCHK-197-D: the EXPECTED filesystem object identity of the signed lifecycle root is captured HERE,
  // at governed consumption, and kept in MODULE-PRIVATE state. Every later authority operation re-resolves
  // the root and requires this exact device/inode, so replacing the directory at the signed path with a new
  // filesystem object holding copied records is refused before any cryptographic key comparison.
  CAPSTATE.set(cap, { launched: false, transfer: TRANSFER_STATES.NOT_TRANSFERRED, rootObjectId: rr.objectId });
  CONSUMED.add(cap);
  return R(LC_CODES.OK, { capability: cap, marker_path: mPath });
}

// ---- PHASE 5: governed launch intent (signed by the ephemeral key) --------------------------------
export function createLaunchIntentV4(consumedCap, opts = {}) {
  if (!isConsumedCapabilityV4(consumedCap)) return R(LC_CODES.FORGED, { detail: "consumed capability required" });
  const cst = CAPSTATE.get(consumedCap);
  if (!cst) return R(LC_CODES.FORGED, { detail: "no module state for this capability" });
  if (cst.launched) return R(LC_CODES.ALREADY_LAUNCHED);
  // FG-FCHK-197-D: RE-RESOLVE the signed lifecycle root and require the SAME filesystem object captured at
  // governed consumption — a remembered path string is not an authority identity.
  const rr = resolveSignedRoot(consumedCap, cst.rootObjectId);
  if (rr.err) return R(rr.err, rr.detail ? { detail: rr.detail } : {});
  const root = rr.root; const iPath = intentPath(root, consumedCap.activation_identity);
  if (existsSync(iPath)) return R(LC_CODES.ALREADY_LAUNCHED);
  const now = typeof opts.now === "number" ? opts.now : 0;
  // FG-LRCQ-ACT-029: the supervisor entrypoint is resolved and DIGESTED HERE from the real file — a caller
  // can no longer record an entrypoint digest that does not match a real, non-symlink, regular file. The
  // governed transfer then launches exactly this path and the supervisor proves it IS this program.
  // FG-CHK-197-07: the supervisor entrypoint is MANDATORY. An intent without one would leave the
  // supervisor's "this program IS the entrypoint" self-proof unarmed, so any program holding the ephemeral
  // key could mint a claim. There is no longer a code path that produces an intent with a null entrypoint.
  const p = opts.supervisorEntrypoint;
  if (p === undefined || p === null) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "supervisorEntrypoint is mandatory" });
  if (typeof p !== "string" || !p) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a path" });
  let lst; try { lst = lstatSync(p); } catch { return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "missing" }); }
  if (lst.isSymbolicLink()) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "symlink" });
  if (!lst.isFile()) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a regular file" });
  let entryReal; try { entryReal = realpathSync(p); } catch { return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "unresolvable" }); }
  if (entryReal !== p) return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a realpath" });
  const entryDigest = sha256(readFileSync(entryReal));
  const body = {
    schema: LAUNCH_INTENT_SCHEMA, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION,
    activation_identity: consumedCap.activation_identity, payload_digest: consumedCap.payload_digest,
    consumed_marker_digest: consumedCap.consumed_marker_digest,
    // FG-CHK-197-05: object-identity digest, matching the consumed marker.
    lifecycle_root_digest: sha256(Buffer.from(consumedCap.lifecycle_root_object_id)),
    lifecycle_root_object_id: consumedCap.lifecycle_root_object_id,
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
  cst.launched = true;
  return R(LC_CODES.OK, { intent_path: iPath, launch_nonce: body.launch_nonce, supervisor_entrypoint: entryReal, supervisor_entrypoint_digest: entryDigest });
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
  // FG-FCHK-197-D: the supervisor has no in-process consumption state, so the EXPECTED root-object identity
  // is the one the governed consumption recorded in the marker. The LIVE signed root must still be that
  // exact filesystem object. This is checked BEFORE the ephemeral signature and BEFORE the key comparison,
  // so replacing the lifecycle directory at the signed path with a new object holding copied records is
  // refused on object identity and never falls through to KEY_MISMATCH.
  const expectRoot = m.doc.lifecycle_root_object_id;
  if (typeof expectRoot !== "string" || !expectRoot) return R(LC_CODES.ROOT_OBJECT_IDENTITY_MISMATCH, { detail: "marker records no lifecycle-root object identity" });
  if (rr.objectId !== expectRoot) return R(LC_CODES.ROOT_OBJECT_IDENTITY_MISMATCH, { detail: "root is " + rr.objectId + ", marker expects " + expectRoot });
  const expect = { expectRootObjectId: expectRoot };
  const ephPub = pubKeyFromB64(m.doc.ephemeral_public_key_spki_b64); if (!ephPub || !verifyEphemeral(m.doc, ephPub)) return R(LC_CODES.EPHEMERAL_SIGNATURE_INVALID, { detail: "marker" });
  const it = readRecord(intentPath(root, id), LAUNCH_INTENT_SCHEMA, expect); if (it.err) return R(it.err);
  if (it.doc.activation_identity !== id || !verifyEphemeral(it.doc, ephPub)) return R(LC_CODES.EPHEMERAL_SIGNATURE_INVALID, { detail: "intent" });
  if (it.doc.consumed_marker_digest !== m.digest) return R(LC_CODES.BINDING_MISMATCH, { detail: "intent->marker digest" });
  // prove the supplied ephemeral private key matches the marker's recorded public key
  let suppliedPubDer; try { suppliedPubDer = createPublicKey(ephemeralPrivateKey).export({ format: "der", type: "spki" }); } catch { return R(LC_CODES.KEY_MISMATCH, { detail: "not a key" }); }
  if (sha256(suppliedPubDer) !== m.doc.ephemeral_fingerprint) return R(LC_CODES.KEY_MISMATCH);
  // FG-LRCQ-ACT-029 + FG-CHK-197-07: THIS process must actually BE the program the signed intent names
  // (same realpath, same content digest). The proof is UNCONDITIONAL: an intent that records no entrypoint is
  // refused outright, so the proof can never be left unarmed by an intent that omitted one.
  if (!it.doc.supervisor_entrypoint_realpath || !it.doc.supervisor_entrypoint_digest) {
    return R(LC_CODES.ENTRYPOINT_INVALID, { detail: "intent records no supervisor entrypoint — self-proof cannot be armed" });
  }
  {
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
    // FG-FCHK-197-D: the claim records the canonical lifecycle-root OBJECT identity EXPLICITLY, so the
    // device/inode identity is consistent across marker, intent AND claim as a recorded property of each
    // record rather than only transitively through the digests the claim carries.
    lifecycle_root_object_id: expectRoot, lifecycle_root_digest: sha256(Buffer.from(expectRoot)),
    launch_nonce: it.doc.launch_nonce, supervisor_pid: pid, supervisor_start_identity: observed,
    supervisor_entrypoint_digest: it.doc.supervisor_entrypoint_digest, claim_epoch: typeof opts.now === "number" ? opts.now : 0,
    terminal: false, ephemeral_fingerprint: m.doc.ephemeral_fingerprint,
  };
  const sig = edSign(null, Buffer.from(canonicalize(body), "utf8"), ephemeralPrivateKey).toString("base64");
  const bytes = JSON.stringify({ ...body, ephemeral_signature: sig }, null, 2) + "\n";
  try { writeFileSync(cPath, bytes, { flag: "wx", mode: 0o600 }); }
  catch (e) { if (e && e.code === "EEXIST") return R(LC_CODES.DUPLICATE_CLAIM); return R(LC_CODES.FORGED, { detail: "claim write: " + (e && e.message) }); }
  const cd = readRecord(cPath, SUPERVISOR_CLAIM_SCHEMA, expect); if (cd.err) return R(cd.err);
  if (!verifyEphemeral(cd.doc, ephPub)) return R(LC_CODES.EPHEMERAL_SIGNATURE_INVALID, { detail: "claim" });
  if (cd.doc.supervisor_pid !== pid || cd.doc.supervisor_start_identity !== observed) return R(LC_CODES.PID_MISMATCH);
  // FG-FCHK-197-C: a frozen DEEP copy. `limits` was previously copied BY REFERENCE off the VERIFIED
  // capability, so the two stages shared one mutable nested object and a write through either widened the
  // founder-signed ceiling every downstream consumer reads. `exclusions` travels with it so the provider
  // spawn boundary can re-derive ALL TEN signed exclusions from the genuine capability.
  const cap = deepFreezeAuthority({
    _stage: "SUPERVISOR_EXECUTION", activation_identity: id, payload_digest: m.doc.payload_digest,
    evaluated_candidate: verifiedCap.evaluated_candidate, evidence_candidate: verifiedCap.evidence_candidate,
    evaluated_candidate_tree: verifiedCap.evaluated_candidate_tree, evidence_candidate_tree: verifiedCap.evidence_candidate_tree,
    provider_identity: m.doc.provider_identity, run_id: m.doc.run_id,
    limits: verifiedCap.limits, exclusions: verifiedCap.exclusions,
    // SIGNED facts the non-authoritative legacy projection is allowed to read (nothing else may).
    provider_executable_path: verifiedCap.provider_executable_path, resolved_provider_target: verifiedCap.resolved_provider_target,
    provider_version: verifiedCap.provider_version,
    run_manifest_path: verifiedCap.run_manifest_path, run_manifest_digest: verifiedCap.run_manifest_digest,
    lrcq_base_sha: verifiedCap.lrcq_base_sha, lrcq_base_tree: verifiedCap.lrcq_base_tree,
    provider_candidate_sha: verifiedCap.provider_candidate_sha, provider_candidate_tree: verifiedCap.provider_candidate_tree,
    backlog_digest: verifiedCap.backlog_digest, capability_lease_digest: verifiedCap.capability_lease_digest,
    blast_radius_budget_digest: verifiedCap.blast_radius_budget_digest,
    issued_epoch: verifiedCap.issued_epoch, expiry_epoch: verifiedCap.expiry_epoch,
    hard_deadline_epoch: verifiedCap.hard_deadline_epoch,
    repository_root: verifiedCap.repository_root, lifecycle_root: root,
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
  const id = consumedCap.activation_identity;
  const cst = CAPSTATE.get(consumedCap);
  // FG-FCHK-197-D: re-resolve the signed root and require the consumption-time filesystem object, then
  // require every record read below to have been written for that SAME object.
  const rr = resolveSignedRoot(consumedCap, cst && cst.rootObjectId);
  if (rr.err) return { err: rr.err, detail: rr.detail };
  const root = rr.root;
  const expect = { expectRootObjectId: (cst && cst.rootObjectId) || rr.objectId };
  const m = readRecord(markerPath(root, id), CONSUMED_MARKER_SCHEMA, expect); if (m.err) return { err: m.err };
  if (m.digest !== consumedCap.consumed_marker_digest) return { err: LC_CODES.BINDING_MISMATCH, detail: "marker digest" };
  const ephPub = pubKeyFromB64(m.doc.ephemeral_public_key_spki_b64);
  if (!ephPub || !verifyEphemeral(m.doc, ephPub)) return { err: LC_CODES.EPHEMERAL_SIGNATURE_INVALID, detail: "marker" };
  const iPath = intentPath(root, id);
  if (!existsSync(iPath)) return { err: LC_CODES.INTENT_MISSING };
  const it = readRecord(iPath, LAUNCH_INTENT_SCHEMA, expect); if (it.err) return { err: it.err };
  if (!verifyEphemeral(it.doc, ephPub)) return { err: LC_CODES.EPHEMERAL_SIGNATURE_INVALID, detail: "intent" };
  if (it.doc.activation_identity !== id) return { err: LC_CODES.IDENTITY_MISMATCH, detail: "intent" };
  if (it.doc.consumed_marker_digest !== m.digest) return { err: LC_CODES.BINDING_MISMATCH, detail: "intent->marker digest" };
  if (it.doc.ephemeral_fingerprint !== consumedCap.ephemeral_fingerprint) return { err: LC_CODES.BINDING_MISMATCH, detail: "intent->ephemeral fingerprint" };
  return { marker: m, intent: it, root, ephPub, expectRootObjectId: expect.expectRootObjectId };
}

// ---- FG-FFIN-197-F1: the DETERMINISTIC supervisor acknowledgment -----------------------------------
// The governed key frame is 92 bytes and the inherited descriptor is an ordinary kernel pipe with a 64 KiB
// buffer, so `writer.write`/`writer.end` ALWAYS complete into the buffer within microseconds. Pipe-write
// completion therefore proves only that the bytes entered the pipe — NOT that the supervisor read them. A
// child that exits immediately without reading fd 3 previously produced a full OK with a dead
// supervisor_pid (reproduced 6/6). No timer can fix this: any elapsed-time arm loses the race to the write
// callback deterministically, which is why the old 250 ms "premature termination" arm could never decide an
// outcome at all.
//
// The ONLY sound acknowledgment is the one the supervisor cannot fabricate: the ephemeral-SIGNED supervisor
// claim. Verifying it proves, in one artifact, that the exact spawned process (1) read and decoded the
// inherited key frame, (2) matched the ephemeral key to the consumed marker, (3) independently reverified
// the signed V4 activation, (4) proved its entrypoint identity, (5) minted a valid signed claim, and
// (6) bound that claim to the spawned PID and its OS-observed start identity.
//
// NONE of the following is accepted as proof: the pipe-write callback, the writer end callback, elapsed
// time, the existence of a child PID, or the child merely staying alive for some number of milliseconds.
const SUPERVISOR_CLAIM_WAIT_MS = 30000;   // fixed module constant — deliberately NOT caller-configurable
const CLAIM_POLL_MS = 15;

// Classify the claim record currently on disk. Returns { ok, doc } | { pending } | { invalid, code, detail }.
// A missing or half-written record is PENDING (the writer is not atomic against a concurrent reader); a
// COMPLETE record that fails any binding is INVALID immediately, because claims are created wx-once and can
// never become valid later.
function classifySupervisorClaim(cPath, ctx, childPid, observedStart) {
  if (!existsSync(cPath)) return { pending: true, reason: "no claim yet" };
  const cd = readRecord(cPath, SUPERVISOR_CLAIM_SCHEMA, { expectRootObjectId: ctx.expectRootObjectId });
  if (cd.err) {
    // Only a torn/absent read is retryable. Anything else (owner, mode, symlink, schema, root identity) is
    // a decided refusal.
    if (cd.err === LC_CODES.RECORD_PARSE || cd.err === LC_CODES.RECORD_MISSING) return { pending: true, reason: cd.err };
    return { invalid: true, code: LC_CODES.SUPERVISOR_CLAIM_INVALID, detail: cd.err + (cd.detail ? " (" + cd.detail + ")" : "") };
  }
  const d = cd.doc;
  const bad = (detail) => ({ invalid: true, code: LC_CODES.SUPERVISOR_CLAIM_INVALID, detail });
  // (5) a valid ephemeral SIGNATURE over the canonical body — only a process holding the transferred private
  // key can produce it, so a copied or hand-written claim fails here.
  if (!verifyEphemeral(d, ctx.ephPub)) return bad("claim ephemeral signature invalid");
  // (2) the key really is THIS activation's ephemeral key
  if (d.ephemeral_fingerprint !== ctx.ephemeralFingerprint) return bad("claim ephemeral fingerprint mismatch");
  // (3) the supervisor reverified THIS signed activation
  if (d.activation_identity !== ctx.activationIdentity) return bad("claim activation identity mismatch");
  if (d.payload_digest !== ctx.payloadDigest) return bad("claim payload digest mismatch");
  // the claim is bound to THIS marker and THIS launch intent
  if (d.consumed_marker_digest !== ctx.markerDigest) return bad("claim->marker digest mismatch");
  if (d.launch_intent_digest !== ctx.intentDigest) return bad("claim->intent digest mismatch");
  if (d.launch_nonce !== ctx.launchNonce) return bad("claim launch nonce mismatch");
  // (4) the supervisor proved it IS the entrypoint the signed intent names
  if (d.supervisor_entrypoint_digest !== ctx.entrypointDigest) return bad("claim entrypoint digest mismatch");
  // (6) the claim belongs to the process THIS transfer spawned, not some other live process
  if (d.supervisor_pid !== childPid) return bad("claim supervisor_pid " + d.supervisor_pid + " != spawned pid " + childPid);
  if (typeof d.supervisor_start_identity !== "string" || !d.supervisor_start_identity) return bad("claim records no process start identity");
  if (observedStart !== null && d.supervisor_start_identity !== observedStart) {
    return bad("claim start identity " + d.supervisor_start_identity + " != OS-observed " + observedStart);
  }
  return { ok: true, doc: d, digest: cd.digest, path: cPath, start_identity_independently_observed: observedStart !== null };
}

// Bounded deterministic wait for that claim. Exit-driven, not timing-driven: when the child is gone we do one
// FINAL classification and decide, so an immediately-dying supervisor is refused as fast as it dies rather
// than after any fixed delay.
async function awaitVerifiedSupervisorClaim(child, ctx) {
  const cPath = claimPath(ctx.root, ctx.activationIdentity);
  // Observe the spawned child's OS start identity while it is (normally) still alive, so the claim can be
  // checked against an INDEPENDENT observation rather than only against itself.
  let observedStart = null;
  try { observedStart = observedStartIdentity(child.pid); } catch { observedStart = null; }
  let exited = child.exitCode !== null || child.signalCode !== null;
  const markExited = () => { exited = true; };
  child.once("exit", markExited);
  child.once("close", markExited);
  const deadline = Date.now() + SUPERVISOR_CLAIM_WAIT_MS;
  for (;;) {
    const v = classifySupervisorClaim(cPath, ctx, child.pid, observedStart);
    if (v.ok) return v;
    if (v.invalid) return v;
    if (exited) {
      const final = classifySupervisorClaim(cPath, ctx, child.pid, observedStart);
      if (final.ok) return final;                 // a healthy short-lived supervisor may claim then exit
      if (final.invalid) return final;
      return { invalid: true, code: LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM, detail: "the spawned supervisor exited without producing a verified claim (exit " + child.exitCode + ", signal " + child.signalCode + ")" };
    }
    if (Date.now() >= deadline) {
      const final = classifySupervisorClaim(cPath, ctx, child.pid, observedStart);
      if (final.ok) return final;
      if (final.invalid) return final;
      return { invalid: true, code: LC_CODES.SUPERVISOR_CLAIM_TIMEOUT, detail: "no verified supervisor claim within " + SUPERVISOR_CLAIM_WAIT_MS + "ms" };
    }
    // NOT unref'd: this is an ACTIVE wait for authority evidence. An unref'd timer would let node consider
    // the loop empty and exit the launcher while the acknowledgment is still outstanding.
    await new Promise((r) => setTimeout(r, CLAIM_POLL_MS));
  }
}

// The GOVERNED launch: this module creates the inherited anonymous descriptor and performs the single
// one-use key transfer. opts:
//   { args = [], stdoutFd, stderrFd, env, cwd, keyFd = 3, detached = true }
// Returns a Promise of { ok, code, child, supervisor_pid, key_fd, entrypoint, transfer }.
export async function spawnGovernedSupervisorV4(consumedCap, opts = {}) {
  if (!isConsumedCapabilityV4(consumedCap)) return R(LC_CODES.FORGED, { detail: "consumed capability required" });
  const st = CAPSTATE.get(consumedCap);
  if (!st) return R(LC_CODES.FORGED, { detail: "no module state for this capability" });
  // ---- FG-CHK-197-01 ATOMIC ONE-USE GUARD ---------------------------------------------------------
  // The guard and the state transition must be indivisible. Previously the state moved to SPENT only AFTER
  // the awaited descriptor write, so a second call entering before that await resolved observed
  // NOT_TRANSFERRED, passed the guard, spawned a SECOND child and wrote the SAME key frame to it. The
  // transition to the TRANSFERRING sentinel below happens SYNCHRONOUSLY, in the same microtask as the
  // guard, before ANY child creation, spawn, key export, pipe write, or asynchronous yield. JavaScript runs
  // this synchronous region to completion, so a concurrent caller cannot interleave inside it.
  if (st.transfer !== TRANSFER_STATES.NOT_TRANSFERRED) return R(LC_CODES.ALREADY_TRANSFERRED, { transfer: st.transfer });
  st.transfer = TRANSFER_STATES.TRANSFERRING;
  // Input validation happens while TRANSFERRING. A refusal here has materialized NO key and spawned NO
  // child, so the capability returns to NOT_TRANSFERRED and the governing caller may correct and retry.
  const unspend = (code, extra) => { st.transfer = TRANSFER_STATES.NOT_TRANSFERRED; return R(code, extra); };
  const vi = verifiedIntentFor(consumedCap); if (vi.err) return unspend(vi.err, { detail: vi.detail });
  // the signed intent names the ONE supervisor entrypoint this transfer may launch
  const entry = vi.intent.doc.supervisor_entrypoint_realpath;
  if (typeof entry !== "string" || !entry) return unspend(LC_CODES.ENTRYPOINT_INVALID, { detail: "intent records no supervisor entrypoint" });
  let est; try { est = lstatSync(entry); } catch { return unspend(LC_CODES.ENTRYPOINT_INVALID, { detail: "missing" }); }
  if (est.isSymbolicLink()) return unspend(LC_CODES.ENTRYPOINT_INVALID, { detail: "symlink" });
  if (!est.isFile()) return unspend(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a regular file" });
  if (realpathSync(entry) !== entry) return unspend(LC_CODES.ENTRYPOINT_INVALID, { detail: "not a realpath" });
  const eDigest = sha256(readFileSync(entry));
  if (vi.intent.doc.supervisor_entrypoint_digest !== eDigest) return unspend(LC_CODES.ENTRYPOINT_DIGEST_MISMATCH, { expected: vi.intent.doc.supervisor_entrypoint_digest, actual: eDigest });
  const key = EPHKEY.get(consumedCap);
  if (!key) { st.transfer = TRANSFER_STATES.SPENT; return R(LC_CODES.KEY_RELEASED, { detail: "ephemeral key no longer held", transfer: st.transfer }); }

  // ---- POINT OF NO RETURN --------------------------------------------------------------------------
  // From here the key IS materialized and a child WILL be created, so the capability becomes permanently
  // spent and the key is removed from module storage BEFORE the first asynchronous yield. A failed or
  // ambiguous transfer can therefore never be retried with the same key.
  const keyFd = Number.isInteger(opts.keyFd) && opts.keyFd >= 3 ? opts.keyFd : 3;
  const stdio = ["ignore", opts.stdoutFd ?? "ignore", opts.stderrFd ?? "ignore"];
  while (stdio.length < keyFd) stdio.push("ignore");
  stdio[keyFd] = "pipe";                                  // the inherited ANONYMOUS descriptor — created HERE
  const der = key.export({ format: "der", type: "pkcs8" });
  const frame = encodeKeyFrame(der);
  der.fill(0);
  EPHKEY.delete(consumedCap);
  st.transfer = TRANSFER_STATES.SPENT;
  let child;
  try {
    child = spawn(process.execPath, [entry, ...(opts.args || [])], {
      detached: opts.detached !== false, stdio,
      env: opts.env || { PATH: process.env.PATH, HOME: process.env.HOME },
      ...(opts.cwd ? { cwd: opts.cwd } : {}),
    });
  } catch (e) { frame.fill(0); return R(LC_CODES.SUPERVISOR_SPAWN_FAILED, { detail: "spawn: " + (e && e.message), transfer: st.transfer }); }

  // ---- FG-FCHK-197-A GOVERNED SPAWN/WRITE RACE -----------------------------------------------------
  // child_process.spawn reports MOST failures ASYNCHRONOUSLY, by emitting 'error' on the returned
  // ChildProcess — a bad cwd or an unreachable node binary returns a ChildProcess with no pid and then
  // emits ENOENT. The try/catch above catches only synchronous argument-type throws, and the writer's
  // 'error' listener is on a DIFFERENT EventEmitter (the stdio stream), so that event previously had no
  // handler at all: it was raised as an unhandled 'error' AFTER the point of no return and killed the
  // launcher with a raw stack trace, so the caller's structured refusal, its evidence record and its
  // descriptor cleanup never ran.
  //
  // Every observer below is registered SYNCHRONOUSLY, in the same executor, BEFORE the frame is written and
  // BEFORE the first await, and they RACE:
  //   * child 'error'            -> SUPERVISOR_SPAWN_FAILED
  //   * descriptor write failure -> TRANSFER_WRITE_FAILED
  //   * write completion         -> proceed to the DETERMINISTIC claim wait below
  // Whatever the outcome, the authority is ALREADY TRANSFERRED_SPENT, the private key is ALREADY deleted
  // from module storage and every temporary buffer is zeroed, so no branch here can be retried with the
  // same key: a failure returns a structured fail-closed result, never an uncaught exception.
  //
  // FG-FFIN-197-F1: write completion is NOT success. It only means the frame entered the pipe buffer. There
  // is deliberately NO timing arm here: a "child died shortly after" timer loses the race to the write
  // callback every time and can never decide anything. Whether the supervisor actually RECEIVED the key is
  // decided further down, by awaitVerifiedSupervisorClaim, on cryptographic evidence.
  const sent = await new Promise((resolve) => {
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; resolve(r); } };
    child.once("error", (e) => done({ code: LC_CODES.SUPERVISOR_SPAWN_FAILED, detail: "child spawn error: " + ((e && e.message) || "unknown") }));
    const writer = child.stdio[keyFd];
    if (!writer || typeof writer.write !== "function" || writer.writable !== true) {
      return done({ code: LC_CODES.DESCRIPTOR_UNAVAILABLE, detail: "governed inherited descriptor not established" });
    }
    writer.on("error", (e) => done({ code: LC_CODES.TRANSFER_WRITE_FAILED, detail: (e && e.message) || "writer error" }));
    // Write ONCE, scrub, close.
    try { writer.write(frame, (e) => { if (e) return done({ code: LC_CODES.TRANSFER_WRITE_FAILED, detail: e.message }); writer.end(() => done({ ok: true })); }); }
    catch (e) { done({ code: LC_CODES.TRANSFER_WRITE_FAILED, detail: (e && e.message) || "write threw" }); }
  });
  frame.fill(0);
  if (!sent.ok) {
    // A partially created child is killed AND reaped, so no orphan holds a partial frame and no residual
    // process survives a failed transfer.
    await killAndReap(child);
    return R(sent.code, { detail: sent.detail, transfer: st.transfer });
  }

  // ---- FG-FFIN-197-F1 DETERMINISTIC SUPERVISOR ACKNOWLEDGMENT --------------------------------------
  // The frame is in the pipe. Now require the EXACT spawned process to prove it used the key, by minting a
  // verified ephemeral-signed claim bound to its own PID and OS-observed start identity. OK is returned only
  // after that verification succeeds.
  const ack = await awaitVerifiedSupervisorClaim(child, {
    root: vi.root,
    expectRootObjectId: vi.expectRootObjectId,
    ephPub: vi.ephPub,
    ephemeralFingerprint: consumedCap.ephemeral_fingerprint,
    activationIdentity: consumedCap.activation_identity,
    payloadDigest: consumedCap.payload_digest,
    markerDigest: vi.marker.digest,
    intentDigest: vi.intent.digest,
    launchNonce: vi.intent.doc.launch_nonce,
    entrypointDigest: eDigest,
  });
  if (!ack.ok) {
    // Every failure here is AFTER key materialization: the authority stays TRANSFERRED_SPENT, the private
    // key stays deleted, the buffers stay zeroed and the writer stays closed. A supervisor that is still
    // alive but never produced a valid claim is killed and reaped so nothing is left holding the key.
    await killAndReap(child);
    return R(ack.code, { detail: ack.detail, transfer: st.transfer, supervisor_pid: child.pid, supervisor_acknowledged: false });
  }
  if (opts.detached !== false && typeof child.unref === "function") child.unref();
  return R(LC_CODES.OK, {
    child, supervisor_pid: child.pid, key_fd: keyFd, entrypoint: entry, entrypoint_digest: eDigest, transfer: st.transfer,
    supervisor_acknowledged: true,
    supervisor_claim_path: ack.path, supervisor_claim_digest: ack.digest,
    supervisor_start_identity: ack.doc.supervisor_start_identity,
    start_identity_independently_observed: ack.start_identity_independently_observed,
  });
}

// Kill a partially launched supervisor and WAIT for it to be reaped, so a failed transfer leaves no process
// behind. Bounded: escalates to the process group and gives up after a short interval rather than hanging.
function killAndReap(child, timeoutMs = 2000) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve(false);
    // FG-FCHK-197-A: a child whose spawn FAILED has no pid — there is no process to kill or reap, and
    // waiting on its 'close' would only burn the timeout.
    if (!child.pid) return resolve(false);
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(true); } };
    child.once("close", finish);
    child.once("exit", finish);
    try { if (child.pid) process.kill(-child.pid, "SIGKILL"); } catch { /* not a group leader / already gone */ }
    try { child.kill("SIGKILL"); } catch { /* already gone */ }
    const t = setTimeout(finish, timeoutMs);
    if (t.unref) t.unref();
  });
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
