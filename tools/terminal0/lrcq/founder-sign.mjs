// FounderGate LRCQ — founder SIGNING ceremony (FG-LRCQ-ACT-028). Interactive TTY only.
// Loads the fixed external encrypted Ed25519 key, proves its public fingerprint == the current governed
// fingerprint, reads the EXACT founder-authorization bytes from a --authorization-file (regular file, owned
// by the user, safe perms, no symlink, NO byte normalization), computes authorization_text_digest, builds a
// V4 activation from the frozen unsigned template + mechanically-derived current state, requires typed
// confirmation, reads the key passphrase via hidden TTY, signs Ed25519, immediately re-verifies, and writes
// the signed activation + safe receipt OUTSIDE the repo. Never prints/persists passphrase or private bytes.
// This wave does NOT use it for a real signature.
import { readFileSync, existsSync, lstatSync, statSync, writeFileSync } from "node:fs";
import { createPrivateKey, createPublicKey, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { signActivation, verifyActivation, authorizationTextDigest, extractPayload, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION } from "../../../src/v8b/lrcq/assurance/activation-v4.mjs";
import { fingerprintOfSpkiDer, currentFounderKey } from "../../../src/v8b/lrcq/assurance/founder-key-authority.mjs";

// ---- testable core (disposable keys + explicit inputs in tests) ----
// Load an encrypted private key -> KeyObject + its public fingerprint.
export function loadPrivateKey(encryptedPkcs8Pem, passphrase) {
  const key = createPrivateKey({ key: encryptedPkcs8Pem, format: "pem", passphrase });
  const spkiDer = createPublicKey(key).export({ format: "der", type: "spki" });
  return { key, fingerprint: fingerprintOfSpkiDer(spkiDer) };
}

// Read exact authorization bytes, fail-closed on symlink / non-regular / not-owner / unsafe perms.
export function readAuthorizationBytes(path, deps = {}) {
  const exists = deps.exists || existsSync; const lstat = deps.lstat || lstatSync; const stat = deps.stat || statSync; const read = deps.readFile || ((p) => readFileSync(p));
  if (!exists(path)) throw new Error("sign: authorization-file missing");
  if (lstat(path).isSymbolicLink()) throw new Error("sign: authorization-file is a symlink");
  const st = stat(path);
  if (!st.isFile()) throw new Error("sign: authorization-file is not a regular file");
  const uid = deps.uid !== undefined ? deps.uid : process.getuid && process.getuid();
  if (uid !== undefined && st.uid !== undefined && st.uid !== uid) throw new Error("sign: authorization-file not owned by the current user");
  if ((st.mode & 0o077) !== 0 && deps.allowLoosePerms !== true) throw new Error("sign: authorization-file has unsafe permissions (group/other access)");
  return read(path); // EXACT bytes, no normalization
}

// Build a V4 payload from a frozen unsigned template + mechanically-derived current state.
export function buildV4Payload({ template, signerFingerprint, authorizationBytes, nonce, issuedEpoch, repositoryRootRealpath, lifecycleRootRealpath }) {
  const p = {
    schema: ACTIVATION_V4_SCHEMA, signature_payload_version: V4_SIGNATURE_PAYLOAD_VERSION,
    founder_signature_algorithm: "ed25519", signer_key_fingerprint: signerFingerprint,
    authorization_text_digest: authorizationTextDigest(authorizationBytes), activation_nonce: nonce,
    repository_root_realpath: repositoryRootRealpath, lifecycle_root_realpath: lifecycleRootRealpath, lifecycle_contract_version: "lrcq-lifecycle-v4-1",
    evidence_commit_sha: template.run_harness_candidate_sha, evidence_commit_tree: template.run_harness_candidate_tree,
    reviewed_runtime_sha: template.reviewed_production_ancestor_sha, reviewed_runtime_tree: template.reviewed_production_ancestor_tree,
    run_id: template.run_id, backlog_digest: template.first_real_run_backlog_digest,
    provider_executable_path: template.provider_executable_path, resolved_provider_target: template.resolved_provider_target,
    provider_version: template.provider_version, provider_executable_identity: template.provider_executable_identity,
    capability_lease_digest: template.capability_lease_digest, blast_radius_budget_digest: template.blast_radius_budget_digest,
    issued_epoch: issuedEpoch, expiry_epoch: issuedEpoch + 600, hard_deadline_epoch: issuedEpoch + 18000,
    max_budget_usd: template.max_budget_usd ?? 10, run_duration_s: template.run_duration_s ?? 18000,
    per_job_timeout_s: template.per_job_timeout_s ?? 2700, max_parallel_width: template.max_parallel_width ?? 2,
    max_output_bytes: template.max_output_bytes ?? 10485760, termination_grace_s: template.termination_grace_s ?? 30,
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true,
    no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true,
  };
  return p;
}

if (fileURLToPath(import.meta.url) === (process.argv[1] || "")) {
  for (const a of process.argv.slice(2)) if (/^--(private-key|public-key|authority-file|passphrase|schema)/.test(a)) { console.error("sign: forbidden flag " + a); process.exit(2); }
  if (!process.stdin.isTTY) { console.error("sign: interactive TTY required"); process.exit(2); }
  console.error("sign: production signing ceremony requires an enrolled founder key + interactive confirmation; not runnable in this implementation wave.");
  process.exit(2);
}
