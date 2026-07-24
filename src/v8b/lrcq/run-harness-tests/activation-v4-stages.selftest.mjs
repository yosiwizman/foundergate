// FounderGate LRCQ — V4 three-stage capability architecture (FG-LRCQ-ACT-028 Phase 1 A/B/C).
// Proves VERIFIED -> CONSUMED -> SUPERVISOR_EXECUTION are distinct, non-forgeable stages and that the
// provider-eligibility gate requires the SUPERVISOR-EXECUTION stage (not verified-only, not consumed-only,
// not a forged object). Disposable Ed25519 keys only.
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signActivation, verifyActivation, mintConsumedCapability, isConsumedCapability, mintSupervisorExecutionCapability, isSupervisorExecutionCapability, providerEligibility, isVerifiedCapability, authorizationTextDigest, V4_CODES, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION } from "../../../../src/v8b/lrcq/assurance/activation-v4.mjs";
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

const base = mkdtempSync(join(tmpdir(), "fg-v4stages-"));
try {
  // Stage A
  ok("A1 verified capability is stage VERIFIED", v.ok && isVerifiedCapability(v.capability) && v.capability._stage === "VERIFIED");
  ok("A2 a verified capability is NOT a supervisor-execution capability", !isSupervisorExecutionCapability(v.capability));
  // Stage B — via the real consumer
  const c = consumeVerifiedActivation(v.capability, { ledgerDir: join(base, "led"), now: 1200 });
  ok("B1 consumption yields a genuine CONSUMED capability", c.ok && isConsumedCapability(c.consumed_capability) && c.consumed_capability._stage === "CONSUMED");
  ok("B2 the consumed capability binds the marker path+digest", c.consumed_capability.consumed_marker_path === c.marker_path && /^sha256:/.test(c.consumed_capability.consumed_marker_digest));
  ok("B3 mintConsumedCapability refuses a non-verified (forged) input", (() => { try { mintConsumedCapability({ _stage: "VERIFIED" }, { markerPath: "x", markerDigest: "y" }); return false; } catch (e) { return e.code === V4_CODES.FORGED_CAPABILITY; } })());
  // Stage C
  const supProof = { consumedMarkerPresent: true, markerMatchesIdentity: true, launchClaimOwned: true, supervisorStartIdentity: "pid-123-epoch-456", consumedMarkerPath: c.marker_path };
  const sup = mintSupervisorExecutionCapability(v.capability, supProof);
  ok("C1 supervisor-execution capability minted only with complete proof", isSupervisorExecutionCapability(sup) && sup._stage === "SUPERVISOR_EXECUTION");
  ok("C2 incomplete supervisor proof is refused", (() => { try { mintSupervisorExecutionCapability(v.capability, { ...supProof, launchClaimOwned: false }); return false; } catch (e) { return e.code === V4_CODES.FORGED_CAPABILITY; } })());
  ok("C3 supervisor-execution cannot be minted from a forged verified input", (() => { try { mintSupervisorExecutionCapability({ _stage: "VERIFIED" }, supProof); return false; } catch (e) { return e.code === V4_CODES.FORGED_CAPABILITY; } })());

  // provider eligibility requires stage C
  const job = { risk_class: "WIDE_SAFE", gate_trigger: "NONE" };
  const gbind = { providerIdentity: "sha256:90608b5c", evaluatedCandidate: "bfc0556" };
  ok("P1 supervisor-execution capability -> provider ELIGIBLE", providerEligibility(sup, job, gbind).ok === true);
  ok("P2 verified-only capability -> provider REFUSED", providerEligibility(v.capability, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P3 consumed-only capability -> provider REFUSED", providerEligibility(c.consumed_capability, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P4 forged {verified:true} / {_stage:'SUPERVISOR_EXECUTION'} -> provider REFUSED", providerEligibility({ verified: true, _stage: "SUPERVISOR_EXECUTION" }, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P5 raw signed activation object -> provider REFUSED", providerEligibility(signed, job, gbind).code === V4_CODES.FORGED_CAPABILITY);
  ok("P6 gated/non-WIDE_SAFE job -> REFUSED even with a valid capability", providerEligibility(sup, { risk_class: "NARROW", gate_trigger: "NONE" }, gbind).code === V4_CODES.EXCLUSION_VIOLATION);
  ok("P7 wrong provider identity binding -> REFUSED", providerEligibility(sup, job, { ...gbind, providerIdentity: "sha256:other" }).code === V4_CODES.BINDING_MISMATCH);
} finally { try { rmSync(base, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ ACTIVATION-V4 STAGES SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
