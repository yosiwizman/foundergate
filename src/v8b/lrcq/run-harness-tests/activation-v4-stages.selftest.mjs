// FounderGate LRCQ — V4 stage authority from the SIGNED lifecycle root (FG-LRCQ-ACT-028).
// Closes the real-file-in-arbitrary-directory forgery: the lifecycle root is SIGNED into the activation, so
// authority is read ONLY from that exact signed root. A caller cannot substitute a directory of forged
// records. Disposable Ed25519 keys + a real disposable signed lifecycle root only.
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signActivation, verifyActivation, deriveConsumedCapability, isConsumedCapability, deriveSupervisorExecutionCapability, isSupervisorExecutionCapability, providerEligibility, isVerifiedCapability, observedStartIdentity, authorizationTextDigest, V4_CODES, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION, LIFECYCLE_CONTRACT_VERSION } from "../../../../src/v8b/lrcq/assurance/activation-v4.mjs";
import { fingerprintOfSpkiDer } from "../../../../src/v8b/lrcq/assurance/founder-key-authority.mjs";
import { consumeVerifiedActivation } from "../../../../src/v8b/lrcq/run-harness/activation-consumer.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const base = mkdtempSync(join(tmpdir(), "fg-v4stages-"));
try {
  const repoRoot = realpathSync(base);
  const lifecycleRoot = join(repoRoot, "lifecycle"); mkdirSync(lifecycleRoot, { recursive: true });
  const kp = generateKeyPairSync("ed25519");
  const spkiDer = createPublicKey(kp.privateKey).export({ format: "der", type: "spki" });
  const fp = fingerprintOfSpkiDer(spkiDer);
  const authorityDoc = { schema: "lrcq-founder-key-authority-1", schema_version: 1, max_current_keys: 1, active_keys: [{ fingerprint: fp, public_key_spki_b64: spkiDer.toString("base64"), algorithm: "ed25519", current: true }], revoked_keys: [] };
  const keyDeps = { repo: "/x", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
  const authText = Buffer.from("authorize one run\n");
  const mkPayload = (over = {}) => ({ schema: ACTIVATION_V4_SCHEMA, signature_payload_version: V4_SIGNATURE_PAYLOAD_VERSION, founder_signature_algorithm: "ed25519", signer_key_fingerprint: fp, authorization_text_digest: authorizationTextDigest(authText), activation_nonce: "n", repository_root_realpath: repoRoot, lifecycle_root_realpath: lifecycleRoot, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION, evidence_commit_sha: "8d1899f7", evidence_commit_tree: "9e720249", reviewed_runtime_sha: "bfc0556", reviewed_runtime_tree: "20518b8d", run_id: "lrcq-first-internal-5h-run", backlog_digest: "sha256:f3801d96", provider_executable_path: "/x/bin/claude", resolved_provider_target: "/x/versions/2.1.215", provider_version: "2.1.215", provider_executable_identity: "sha256:90608b5c", capability_lease_digest: "sha256:aa", blast_radius_budget_digest: "sha256:bb", issued_epoch: 1000, expiry_epoch: 1600, hard_deadline_epoch: 19000, max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700, max_parallel_width: 2, max_output_bytes: 10485760, termination_grace_s: 30, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true, ...over });
  const signed = signActivation(mkPayload(), kp.privateKey);
  const v = verifyActivation(signed, { authorizationBytes: authText, nowEpoch: 1200 }, { keyDeps });
  const ident = v.capability.activation_identity;
  const idFile = ident.replace(":", "_");

  ok("A1 verified capability carries the SIGNED lifecycle + repo roots", v.ok && v.capability.lifecycle_root === lifecycleRoot && v.capability.repository_root === repoRoot);

  // Before consumption: no marker in the SIGNED root -> REFUSED. A REAL marker written to an ARBITRARY dir
  // CANNOT mint (derive reads ONLY the signed root; it takes NO path argument).
  ok("Z1 no marker in the signed root -> CONSUMED REFUSED", deriveConsumedCapability(v.capability).ok === false);
  const attackDir = mkdtempSync(join(tmpdir(), "attack-")); writeFileSync(join(attackDir, idFile + ".consumed.json"), JSON.stringify({ activation_id: ident }));
  ok("Z2 a REAL marker in an ARBITRARY dir CANNOT mint (arbitrary-dir forgery CLOSED)", deriveConsumedCapability(v.capability).ok === false);

  // Governed consumption writes the marker into the SIGNED lifecycle root; derive reads it there.
  const c = consumeVerifiedActivation(v.capability, { ledgerDir: lifecycleRoot, now: 1200 });
  ok("B1 governed consume derives CONSUMED from the on-disk marker in the SIGNED root", c.ok && isConsumedCapability(c.consumed_capability) && c.consumed_capability._stage === "CONSUMED");

  // Supervisor-execution: real launch-claim in the SIGNED root, owned by THIS process.
  const pid = process.pid; const observed = observedStartIdentity(pid);
  ok("Z3 no launch-claim in signed root -> SUPERVISOR_EXEC REFUSED", deriveSupervisorExecutionCapability(v.capability).ok === false);
  writeFileSync(join(lifecycleRoot, idFile + ".launch-claim.json"), JSON.stringify({ activation_id: ident, supervisor_pid: pid, supervisor_start_identity: observed, terminal: false }));
  const sup = deriveSupervisorExecutionCapability(v.capability);
  ok("C1 SUPERVISOR_EXEC from signed-root records + this process's real pid/observed identity", sup.ok && isSupervisorExecutionCapability(sup.capability));

  // A signed activation whose lifecycle_root points OUTSIDE the signed repo root -> REFUSED (containment).
  const escaped = signActivation(mkPayload({ lifecycle_root_realpath: realpathSync(tmpdir()) }), kp.privateKey);
  const ve = verifyActivation(escaped, { authorizationBytes: authText, nowEpoch: 1200 }, { keyDeps });
  ok("Z4 lifecycle root escaping the signed repo root -> REFUSED", deriveConsumedCapability(ve.capability).ok === false);
  // A signed activation whose lifecycle_root is a symlink -> REFUSED.
  const linkRoot = join(repoRoot, "link"); try { symlinkSync(lifecycleRoot, linkRoot); } catch { /* */ }
  const symed = signActivation(mkPayload({ lifecycle_root_realpath: linkRoot }), kp.privateKey);
  const vs = verifyActivation(symed, { authorizationBytes: authText, nowEpoch: 1200 }, { keyDeps });
  ok("Z5 symlinked signed lifecycle root -> REFUSED", deriveConsumedCapability(vs.capability).ok === false);

  // provider eligibility requires stage C
  const job = { risk_class: "WIDE_SAFE", gate_trigger: "NONE" };
  const gbind = { providerIdentity: "sha256:90608b5c", evaluatedCandidate: "bfc0556" };
  ok("P1 SUPERVISOR_EXEC -> provider ELIGIBLE", providerEligibility(sup.capability, job, gbind).ok === true);
  ok("P2 verified-only -> REFUSED", providerEligibility(v.capability, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P3 consumed-only -> REFUSED", providerEligibility(c.consumed_capability, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P4 forged {_stage:'SUPERVISOR_EXECUTION'} -> REFUSED", providerEligibility({ _stage: "SUPERVISOR_EXECUTION" }, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P5 raw signed activation -> REFUSED", providerEligibility(signed, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P6 gated job -> REFUSED", providerEligibility(sup.capability, { risk_class: "NARROW", gate_trigger: "NONE" }, gbind).code === V4_CODES.EXCLUSION_VIOLATION);
  ok("P7 wrong provider identity -> REFUSED", providerEligibility(sup.capability, job, { ...gbind, providerIdentity: "sha256:other" }).code === V4_CODES.BINDING_MISMATCH);
  try { rmSync(attackDir, { recursive: true, force: true }); } catch { /* */ }
} finally { try { rmSync(base, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ ACTIVATION-V4 STAGES (SIGNED LIFECYCLE ROOT) SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
