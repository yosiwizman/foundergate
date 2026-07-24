// FounderGate LRCQ — V4 stage authority DERIVED FROM DURABLE RECORDS via REAL fs ONLY (FG-LRCQ-ACT-028).
// Closes the caller-assisted injection bypass: the production derive functions take only a real ledgerDir
// and use real fs + real process.pid + a mechanically-observed start identity — no injectable fs/pid/
// identity/booleans. Tests write REAL files to a disposable dir and use the test process's real identity.
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signActivation, verifyActivation, deriveConsumedCapability, isConsumedCapability, deriveSupervisorExecutionCapability, isSupervisorExecutionCapability, providerEligibility, isVerifiedCapability, observedStartIdentity, authorizationTextDigest, V4_CODES, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION } from "../../../../src/v8b/lrcq/assurance/activation-v4.mjs";
import { fingerprintOfSpkiDer } from "../../../../src/v8b/lrcq/assurance/founder-key-authority.mjs";
import { consumeVerifiedActivation } from "../../../../src/v8b/lrcq/run-harness/activation-consumer.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const kp = generateKeyPairSync("ed25519");
const spkiDer = createPublicKey(kp.privateKey).export({ format: "der", type: "spki" });
const fp = fingerprintOfSpkiDer(spkiDer);
const authorityDoc = { schema: "lrcq-founder-key-authority-1", schema_version: 1, max_current_keys: 1, active_keys: [{ fingerprint: fp, public_key_spki_b64: spkiDer.toString("base64"), algorithm: "ed25519", current: true }], revoked_keys: [] };
const keyDeps = { repo: "/x", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
const authText = Buffer.from("authorize one run\n");
const payload = { schema: ACTIVATION_V4_SCHEMA, signature_payload_version: V4_SIGNATURE_PAYLOAD_VERSION, founder_signature_algorithm: "ed25519", signer_key_fingerprint: fp, authorization_text_digest: authorizationTextDigest(authText), activation_nonce: "n", evidence_commit_sha: "8d1899f7", evidence_commit_tree: "9e720249", reviewed_runtime_sha: "bfc0556", reviewed_runtime_tree: "20518b8d", run_id: "lrcq-first-internal-5h-run", backlog_digest: "sha256:f3801d96", provider_executable_path: "/x/bin/claude", resolved_provider_target: "/x/versions/2.1.215", provider_version: "2.1.215", provider_executable_identity: "sha256:90608b5c", capability_lease_digest: "sha256:aa", blast_radius_budget_digest: "sha256:bb", issued_epoch: 1000, expiry_epoch: 1600, hard_deadline_epoch: 19000, max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700, max_parallel_width: 2, max_output_bytes: 10485760, termination_grace_s: 30, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true };
const signed = signActivation(payload, kp.privateKey);
const v = verifyActivation(signed, { authorizationBytes: authText, nowEpoch: 1200 }, { keyDeps });
const ident = v.capability.activation_identity;
const idFile = ident.replace(":", "_");

const base = mkdtempSync(join(tmpdir(), "fg-v4stages-"));
try {
  // INJECTION CLOSURE: the derive API no longer accepts fs/pid/identity — passing extra "deps" is ignored,
  // and a ledgerDir with no real marker on disk is REFUSED (fake fs can't help).
  ok("Z1 deriveConsumedCapability({fake fs}) is IGNORED; no real marker -> REFUSED", (() => { const r = deriveConsumedCapability(v.capability, join(base, "nope"), { exists: () => true, read: () => JSON.stringify({ activation_id: ident }) }); return r.ok === false; })());
  ok("Z1b deriveConsumedCapability only accepts a string ledgerDir (object arg refused)", deriveConsumedCapability(v.capability, { ledgerDir: "/x", exists: () => true }).ok === false);

  // real consumption writes a REAL marker; derive rereads it via real fs
  const ledgerDir = join(base, "led");
  const c = consumeVerifiedActivation(v.capability, { ledgerDir, now: 1200 });
  ok("B1 real consumption derives a genuine CONSUMED capability from the on-disk marker", c.ok && isConsumedCapability(c.consumed_capability) && c.consumed_capability._stage === "CONSUMED");
  ok("B2 binds marker path + a disk-computed digest", c.consumed_capability.consumed_marker_path === c.marker_path && /^sha256:[0-9a-f]{64}$/.test(c.consumed_capability.consumed_marker_digest));
  ok("Z2 marker with wrong activation_id -> REFUSED", (() => { const l = join(base, "wid"); mkdirSync(l, { recursive: true }); writeFileSync(join(l, idFile + ".consumed.json"), JSON.stringify({ activation_id: "sha256:" + "0".repeat(64) })); return deriveConsumedCapability(v.capability, l).code === V4_CODES.BINDING_MISMATCH; })());
  ok("Z3 symlinked marker -> REFUSED", (() => { const l = join(base, "syl"); mkdirSync(l, { recursive: true }); const real = join(base, "rm.json"); writeFileSync(real, JSON.stringify({ activation_id: ident })); try { symlinkSync(real, join(l, idFile + ".consumed.json")); } catch { return true; } return deriveConsumedCapability(v.capability, l).ok === false; })());

  // supervisor-execution: real marker + real launch-claim owned by THIS process (real pid + observed identity)
  const pid = process.pid; const observed = observedStartIdentity(pid);
  ok("PI observedStartIdentity(current pid) is mechanically readable", typeof observed === "string" && observed.includes("pid:" + pid));
  ok("Z4 supervisor-exec with NO launch-claim -> REFUSED", deriveSupervisorExecutionCapability(v.capability, ledgerDir).ok === false);
  writeFileSync(join(ledgerDir, idFile + ".launch-claim.json"), JSON.stringify({ activation_id: ident, supervisor_pid: pid, supervisor_start_identity: observed, terminal: false }));
  const sup = deriveSupervisorExecutionCapability(v.capability, ledgerDir);
  ok("C1 supervisor-exec derived from real records + THIS process's real pid/observed identity", sup.ok && isSupervisorExecutionCapability(sup.capability));
  ok("Z5 launch-claim with a DIFFERENT pid -> REFUSED (stale-PID/forgery closed)", (() => { const l = join(base, "wp"); mkdirSync(l, { recursive: true }); writeFileSync(join(l, idFile + ".consumed.json"), JSON.stringify({ activation_id: ident })); writeFileSync(join(l, idFile + ".launch-claim.json"), JSON.stringify({ activation_id: ident, supervisor_pid: pid + 1, supervisor_start_identity: observed, terminal: false })); return deriveSupervisorExecutionCapability(v.capability, l).ok === false; })());
  ok("Z6 launch-claim with a forged start-identity -> REFUSED", (() => { const l = join(base, "wi"); mkdirSync(l, { recursive: true }); writeFileSync(join(l, idFile + ".consumed.json"), JSON.stringify({ activation_id: ident })); writeFileSync(join(l, idFile + ".launch-claim.json"), JSON.stringify({ activation_id: ident, supervisor_pid: pid, supervisor_start_identity: "forged", terminal: false })); return deriveSupervisorExecutionCapability(v.capability, l).ok === false; })());
  ok("Z7 terminal claim -> REFUSED", (() => { const l = join(base, "tm"); mkdirSync(l, { recursive: true }); writeFileSync(join(l, idFile + ".consumed.json"), JSON.stringify({ activation_id: ident })); writeFileSync(join(l, idFile + ".launch-claim.json"), JSON.stringify({ activation_id: ident, supervisor_pid: pid, supervisor_start_identity: observed, terminal: true })); return deriveSupervisorExecutionCapability(v.capability, l).ok === false; })());

  // provider eligibility requires stage C
  const job = { risk_class: "WIDE_SAFE", gate_trigger: "NONE" };
  const gbind = { providerIdentity: "sha256:90608b5c", evaluatedCandidate: "bfc0556" };
  ok("P1 supervisor-execution -> provider ELIGIBLE", providerEligibility(sup.capability, job, gbind).ok === true);
  ok("P2 verified-only -> REFUSED", providerEligibility(v.capability, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P3 consumed-only -> REFUSED", providerEligibility(c.consumed_capability, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P4 forged {_stage:'SUPERVISOR_EXECUTION'} -> REFUSED", providerEligibility({ _stage: "SUPERVISOR_EXECUTION" }, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P5 raw signed activation -> REFUSED", providerEligibility(signed, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P6 gated job -> REFUSED", providerEligibility(sup.capability, { risk_class: "NARROW", gate_trigger: "NONE" }, gbind).code === V4_CODES.EXCLUSION_VIOLATION);
  ok("P7 wrong provider identity -> REFUSED", providerEligibility(sup.capability, job, { ...gbind, providerIdentity: "sha256:other" }).code === V4_CODES.BINDING_MISMATCH);
} finally { try { rmSync(base, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ ACTIVATION-V4 STAGES (REAL-FS DURABLE) SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
