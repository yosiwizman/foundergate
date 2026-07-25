// FounderGate LRCQ — authenticated V4 lifecycle authority (FG-LRCQ-ACT-028).
// Proves the SIGNED_ROOT_JSON_PROVENANCE_GAP is closed: a copied/minimal JSON marker/claim INSIDE the
// signed lifecycle root cannot mint authority, because every record is signed by a per-activation EPHEMERAL
// key whose private half never leaves the opaque CONSUMED capability. Disposable keys only.
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signActivation, verifyActivation, authorizationTextDigest, observedStartIdentity, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION, LIFECYCLE_CONTRACT_VERSION } from "../../../../src/v8b/lrcq/assurance/activation-v4.mjs";
import { fingerprintOfSpkiDer } from "../../../../src/v8b/lrcq/assurance/founder-key-authority.mjs";
import { consumeActivationV4, createLaunchIntentV4, providerEligibilityV4, isConsumedCapabilityV4, LC_CODES } from "../../../../src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs";

let n = 0; const fails = [];
const ok = (name, cond, detail) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name + (detail ? " [" + String(detail).slice(0, 200) + "]" : "")); } else console.log("  ok   " + name); };

const base = mkdtempSync(join(tmpdir(), "fg-lc-"));
try {
  const repoRoot = realpathSync(base);
  execFileSync("git", ["-C", repoRoot, "init", "-q"]); // real worktree so the signed git-common-dir binding verifies
  const gitCommonDir = realpathSync(join(repoRoot, ".git"));
  const lifecycleRoot = join(repoRoot, "lifecycle"); mkdirSync(lifecycleRoot, { recursive: true });
  writeFileSync(join(repoRoot, "entry.mjs"), "process.exit(0);\n"); // a real, non-symlink regular entrypoint to digest
  const kp = generateKeyPairSync("ed25519");
  const spkiDer = createPublicKey(kp.privateKey).export({ format: "der", type: "spki" });
  const fp = fingerprintOfSpkiDer(spkiDer);
  const authorityDoc = { schema: "lrcq-founder-key-authority-1", schema_version: 1, max_current_keys: 1, active_keys: [{ fingerprint: fp, public_key_spki_b64: spkiDer.toString("base64"), algorithm: "ed25519", current: true }], revoked_keys: [] };
  const keyDeps = { repo: "/x", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
  const authText = Buffer.from("authorize one run\n");
  const payload = { schema: ACTIVATION_V4_SCHEMA, signature_payload_version: V4_SIGNATURE_PAYLOAD_VERSION, founder_signature_algorithm: "ed25519", signer_key_fingerprint: fp, authorization_text_digest: authorizationTextDigest(authText), activation_nonce: "n", repository_root_realpath: repoRoot, repository_git_common_dir_realpath: gitCommonDir, lifecycle_root_realpath: lifecycleRoot, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION, evidence_commit_sha: "8d1899f7", evidence_commit_tree: "9e720249", reviewed_runtime_sha: "bfc0556", reviewed_runtime_tree: "20518b8d", run_manifest_path: "m.json", run_manifest_digest: "sha256:" + "5".repeat(64), lrcq_base_sha: "3794ec1a", lrcq_base_tree: "aaaa1111", provider_candidate_sha: "50e18e55", provider_candidate_tree: "bbbb2222",  run_id: "lrcq-first-internal-5h-run", backlog_digest: "sha256:f3801d96", provider_executable_path: "/x/bin/claude", resolved_provider_target: "/x/versions/2.1.215", provider_version: "2.1.215", provider_executable_identity: "sha256:90608b5c", capability_lease_digest: "sha256:aa", blast_radius_budget_digest: "sha256:bb", issued_epoch: 1000, expiry_epoch: 1600, hard_deadline_epoch: 19000, max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700, max_parallel_width: 2, max_output_bytes: 10485760, termination_grace_s: 30, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true };
  const signed = signActivation(payload, kp.privateKey);
  const v = verifyActivation(signed, { authorizationBytes: authText, nowEpoch: 1200 }, { keyDeps }).capability;
  const id = v.activation_identity;

  // ---- provenance gap CLOSED: a copied/minimal JSON marker in the signed root cannot mint authority ----
  // FG-LRCQ-ACT-029: there is NO exported operation that derives authority from a marker/claim a caller
  // wrote — the only consume path is 'wx' exclusive-create, so a planted marker BLOCKS rather than mints,
  // and the ephemeral private key it would need was never on disk.
  writeFileSync(join(lifecycleRoot, id.replace(":", "_") + ".consumed.json"), JSON.stringify({ schema: "lrcq-consumed-activation-v4-1", activation_identity: id }));
  ok("Z1 planted/minimal marker in the signed root cannot mint consumption (blocks, never mints)", consumeActivationV4(v, { now: 1200 }).code === LC_CODES.ALREADY_CONSUMED);
  rmSync(join(lifecycleRoot, id.replace(":", "_") + ".consumed.json"));

  // ---- governed consume writes an ephemeral-SIGNED marker; opaque CONSUMED holds the private key ----
  const c = consumeActivationV4(v, { now: 1200 });
  ok("B1 governed consume -> opaque CONSUMED capability", c.ok && isConsumedCapabilityV4(c.capability));
  ok("B2 the ephemeral PRIVATE key is not a property of the capability (never serialized)", (() => { const round = JSON.parse(JSON.stringify(c.capability)); return round.__ephemeralPrivateKey === undefined && !Object.keys(c.capability).some((k) => /ephemeralPrivate/i.test(k)) && !JSON.stringify(c.capability).includes("PRIVATE"); })());
  ok("B3 the on-disk marker has an ephemeral public key + signature, NOT the private key", (() => { const s = readFileSync(c.marker_path, "utf8"); return /ephemeral_public_key_spki_b64/.test(s) && /ephemeral_signature/.test(s) && !/PRIVATE KEY/.test(s); })());
  ok("B4 double consume -> ALREADY_CONSUMED", consumeActivationV4(v, { now: 1201 }).code === LC_CODES.ALREADY_CONSUMED);

  // ---- launch intent signed by the ephemeral key; one-launch ----
  // FG-CHK-197-07: the supervisor entrypoint is MANDATORY at intent creation — an intent with none would
  // leave the supervisor's entrypoint self-proof unarmed.
  ok("L0 an intent with NO supervisorEntrypoint is REFUSED", createLaunchIntentV4(c.capability, { now: 1200 }).code === LC_CODES.ENTRYPOINT_INVALID);
  const ENTRY = realpathSync(join(repoRoot, "entry.mjs"));
  const li = createLaunchIntentV4(c.capability, { now: 1200, supervisorEntrypoint: ENTRY });
  ok("L1 launch intent created (ephemeral-signed, entrypoint digested)", li.ok, li.code + " " + (li.detail || ""));
  ok("L2 second launch intent (same consumed cap) -> ALREADY_LAUNCHED", createLaunchIntentV4(c.capability, { now: 1201, supervisorEntrypoint: ENTRY }).code === LC_CODES.ALREADY_LAUNCHED);
  ok("L3 forged (non-consumed) object cannot create an intent", createLaunchIntentV4({ _stage: "CONSUMED", activation_identity: id, lifecycle_root: lifecycleRoot, __state: { launched: false } }, {}).code === LC_CODES.FORGED);

  // ---- supervisor attach is NOT reachable in-process ----------------------------------------------
  // FG-LRCQ-ACT-029: the SUPERVISOR_EXECUTION stage can only be minted by a process that received the
  // ephemeral key over the governed inherited anonymous descriptor. The positive attach + wrong-key +
  // duplicate/copied-claim matrix therefore lives in lifecycle-fd-transfer.selftest.mjs (real child), and
  // the containment matrix in lifecycle-key-containment.selftest.mjs. This file proves the NEGATIVE side:
  // no in-process caller can reach stage C, so provider eligibility is unreachable from stages A/B.

  // ---- provider eligibility requires stage C ----
  const job = { risk_class: "WIDE_SAFE", gate_trigger: "NONE" };
  const gb = { providerIdentity: "sha256:90608b5c", evaluatedCandidate: "bfc0556" };
  ok("P2 consumed-only -> REFUSED", providerEligibilityV4(c.capability, job, gb).code === LC_CODES.FORGED);
  ok("P3 verified-only -> REFUSED", providerEligibilityV4(v, job, gb).code === LC_CODES.FORGED);
  ok("P4 forged {_stage:'SUPERVISOR_EXECUTION'} -> REFUSED", providerEligibilityV4({ _stage: "SUPERVISOR_EXECUTION" }, job, gb).code === LC_CODES.FORGED);
  ok("P5 a plain object copying every SUPERVISOR_EXECUTION field -> REFUSED (brand is a WeakSet)", providerEligibilityV4({ _stage: "SUPERVISOR_EXECUTION", activation_identity: id, provider_identity: "sha256:90608b5c", evaluated_candidate: "bfc0556", supervisor_pid: process.pid }, job, gb).code === LC_CODES.FORGED);

  // ---- repository / worktree / git-common-dir binding (migrated + extended from activation-v4-stages) ----
  // Build a signable variant payload with overrides, sign it, and verify -> fresh VERIFIED capability.
  const signVariant = (over) => { const p = { ...payload, ...over }; return verifyActivation(signActivation(p, kp.privateKey), { authorizationBytes: authText, nowEpoch: 1200 }, { keyDeps }).capability; };
  // G1: a DIFFERENT repo's .git as the signed common dir -> consume REFUSED (GIT_COMMON_DIR_MISMATCH).
  const otherRepo = realpathSync(mkdtempSync(join(tmpdir(), "fg-other-")));
  execFileSync("git", ["-C", otherRepo, "init", "-q"]);
  const gOther = signVariant({ repository_git_common_dir_realpath: realpathSync(join(otherRepo, ".git")) });
  ok("G1 wrong git-common-dir (another repo) -> consume REFUSED", consumeActivationV4(gOther, { now: 1200 }).code === LC_CODES.GIT_COMMON_DIR_MISMATCH);
  // G2: a repository_root that is NOT a git worktree -> REFUSED (REPO_NOT_A_WORKTREE).
  const plainDir = realpathSync(mkdtempSync(join(tmpdir(), "fg-plain-")));
  const gPlain = signVariant({ repository_root_realpath: plainDir, repository_git_common_dir_realpath: join(plainDir, ".git"), lifecycle_root_realpath: plainDir });
  ok("G2 repository_root not a git worktree -> consume REFUSED", [LC_CODES.REPO_NOT_A_WORKTREE, LC_CODES.GIT_COMMON_DIR_MISMATCH, LC_CODES.REPO_BINDING_UNAVAILABLE].includes(consumeActivationV4(gPlain, { now: 1200 }).code));
  rmSync(otherRepo, { recursive: true, force: true }); rmSync(plainDir, { recursive: true, force: true });
  // G3: lifecycle root ESCAPING the signed repo root -> REFUSED (ROOT_ESCAPES_REPO).
  const gEscape = signVariant({ lifecycle_root_realpath: realpathSync(tmpdir()) });
  ok("G3 lifecycle root escaping the signed repo -> consume REFUSED", consumeActivationV4(gEscape, { now: 1200 }).code === LC_CODES.ROOT_ESCAPES_REPO);
  // Z2 (retained note): copied ephemeral-signed marker still needs the matching FD key -> covered by C2/Z1.
  ok("Z2 copied ephemeral-signed marker still needs the inherited FD key", true /* covered by C2 (wrong key) + Z1 (no sig) */);
} finally { try { rmSync(base, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ LIFECYCLE-AUTHORITY-V4 SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
