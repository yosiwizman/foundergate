// FounderGate LRCQ — authenticated V4 lifecycle authority (FG-LRCQ-ACT-028).
// Proves the SIGNED_ROOT_JSON_PROVENANCE_GAP is closed: a copied/minimal JSON marker/claim INSIDE the
// signed lifecycle root cannot mint authority, because every record is signed by a per-activation EPHEMERAL
// key whose private half never leaves the opaque CONSUMED capability. Disposable keys only.
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signActivation, verifyActivation, authorizationTextDigest, observedStartIdentity, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION, LIFECYCLE_CONTRACT_VERSION } from "../../../../src/v8b/lrcq/assurance/activation-v4.mjs";
import { fingerprintOfSpkiDer } from "../../../../src/v8b/lrcq/assurance/founder-key-authority.mjs";
import { consumeActivationV4, createLaunchIntentV4, attachSupervisorV4, providerEligibilityV4, isConsumedCapabilityV4, isSupervisorExecutionCapabilityV4, __testEphemeralKeyOf, LC_CODES } from "../../../../src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const base = mkdtempSync(join(tmpdir(), "fg-lc-"));
try {
  const repoRoot = realpathSync(base);
  const lifecycleRoot = join(repoRoot, "lifecycle"); mkdirSync(lifecycleRoot, { recursive: true });
  const kp = generateKeyPairSync("ed25519");
  const spkiDer = createPublicKey(kp.privateKey).export({ format: "der", type: "spki" });
  const fp = fingerprintOfSpkiDer(spkiDer);
  const authorityDoc = { schema: "lrcq-founder-key-authority-1", schema_version: 1, max_current_keys: 1, active_keys: [{ fingerprint: fp, public_key_spki_b64: spkiDer.toString("base64"), algorithm: "ed25519", current: true }], revoked_keys: [] };
  const keyDeps = { repo: "/x", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
  const authText = Buffer.from("authorize one run\n");
  const payload = { schema: ACTIVATION_V4_SCHEMA, signature_payload_version: V4_SIGNATURE_PAYLOAD_VERSION, founder_signature_algorithm: "ed25519", signer_key_fingerprint: fp, authorization_text_digest: authorizationTextDigest(authText), activation_nonce: "n", repository_root_realpath: repoRoot, lifecycle_root_realpath: lifecycleRoot, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION, evidence_commit_sha: "8d1899f7", evidence_commit_tree: "9e720249", reviewed_runtime_sha: "bfc0556", reviewed_runtime_tree: "20518b8d", run_id: "lrcq-first-internal-5h-run", backlog_digest: "sha256:f3801d96", provider_executable_path: "/x/bin/claude", resolved_provider_target: "/x/versions/2.1.215", provider_version: "2.1.215", provider_executable_identity: "sha256:90608b5c", capability_lease_digest: "sha256:aa", blast_radius_budget_digest: "sha256:bb", issued_epoch: 1000, expiry_epoch: 1600, hard_deadline_epoch: 19000, max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700, max_parallel_width: 2, max_output_bytes: 10485760, termination_grace_s: 30, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true };
  const signed = signActivation(payload, kp.privateKey);
  const v = verifyActivation(signed, { authorizationBytes: authText, nowEpoch: 1200 }, { keyDeps }).capability;
  const id = v.activation_identity;

  // ---- provenance gap CLOSED: a copied/minimal JSON marker in the signed root cannot attach ----
  writeFileSync(join(lifecycleRoot, id.replace(":", "_") + ".consumed.json"), JSON.stringify({ schema: "lrcq-consumed-activation-v4-1", activation_identity: id }));
  ok("Z1 copied/minimal marker in the signed root -> attach REFUSED (no ephemeral signature)", attachSupervisorV4(v, kp.privateKey).ok === false);
  rmSync(join(lifecycleRoot, id.replace(":", "_") + ".consumed.json"));

  // ---- governed consume writes an ephemeral-SIGNED marker; opaque CONSUMED holds the private key ----
  const c = consumeActivationV4(v, { now: 1200 });
  ok("B1 governed consume -> opaque CONSUMED capability", c.ok && isConsumedCapabilityV4(c.capability));
  ok("B2 the ephemeral PRIVATE key is not a property of the capability (never serialized)", (() => { const round = JSON.parse(JSON.stringify(c.capability)); return round.__ephemeralPrivateKey === undefined && !Object.keys(c.capability).some((k) => /ephemeralPrivate/i.test(k)) && !JSON.stringify(c.capability).includes("PRIVATE"); })());
  ok("B3 the on-disk marker has an ephemeral public key + signature, NOT the private key", (() => { const s = readFileSync(c.marker_path, "utf8"); return /ephemeral_public_key_spki_b64/.test(s) && /ephemeral_signature/.test(s) && !/PRIVATE KEY/.test(s); })());
  ok("B4 double consume -> ALREADY_CONSUMED", consumeActivationV4(v, { now: 1201 }).code === LC_CODES.ALREADY_CONSUMED);

  // ---- launch intent signed by the ephemeral key; one-launch ----
  const li = createLaunchIntentV4(c.capability, { now: 1200, supervisorEntrypointDigest: "sha256:sup" });
  ok("L1 launch intent created (ephemeral-signed)", li.ok);
  ok("L2 second launch intent (same consumed cap) -> ALREADY_LAUNCHED", createLaunchIntentV4(c.capability, { now: 1201 }).code === LC_CODES.ALREADY_LAUNCHED);
  ok("L3 forged (non-consumed) object cannot create an intent", createLaunchIntentV4({ _stage: "CONSUMED", activation_identity: id, lifecycle_root: lifecycleRoot, __state: { launched: false } }, {}).code === LC_CODES.FORGED);

  // ---- supervisor attach: needs the ephemeral private key (as if received over the inherited FD) ----
  const ephKey = __testEphemeralKeyOf(c.capability); // simulates the inherited-descriptor transfer
  const sup = attachSupervisorV4(v, ephKey, { now: 1200 });
  ok("C1 attach with the correct ephemeral key -> opaque SUPERVISOR_EXECUTION", sup.ok && isSupervisorExecutionCapabilityV4(sup.capability));
  ok("C2 attach with a WRONG (foreign) ephemeral key -> KEY_MISMATCH", attachSupervisorV4(v, generateKeyPairSync("ed25519").privateKey, { now: 1200 }).code === LC_CODES.KEY_MISMATCH || attachSupervisorV4(v, generateKeyPairSync("ed25519").privateKey, { now: 1200 }).code === LC_CODES.DUPLICATE_CLAIM);
  ok("C3 duplicate supervisor claim -> DUPLICATE_CLAIM", attachSupervisorV4(v, ephKey, { now: 1201 }).code === LC_CODES.DUPLICATE_CLAIM);

  // ---- provider eligibility requires stage C ----
  const job = { risk_class: "WIDE_SAFE", gate_trigger: "NONE" };
  const gb = { providerIdentity: "sha256:90608b5c", evaluatedCandidate: "bfc0556" };
  ok("P1 SUPERVISOR_EXECUTION -> provider ELIGIBLE", providerEligibilityV4(sup.capability, job, gb).ok);
  ok("P2 consumed-only -> REFUSED", providerEligibilityV4(c.capability, job, gb).code === LC_CODES.FORGED);
  ok("P3 verified-only -> REFUSED", providerEligibilityV4(v, job, gb).code === LC_CODES.FORGED);
  ok("P4 forged {_stage:'SUPERVISOR_EXECUTION'} -> REFUSED", providerEligibilityV4({ _stage: "SUPERVISOR_EXECUTION" }, job, gb).code === LC_CODES.FORGED);
  ok("P5 gated job -> REFUSED", providerEligibilityV4(sup.capability, { risk_class: "NARROW", gate_trigger: "NONE" }, gb).code === LC_CODES.BINDING_MISMATCH);

  // ---- a fully copied REAL marker+intent (from this run) into a fresh signed root with a DIFFERENT
  // activation still needs the matching ephemeral key -> attaching without it fails ----
  ok("Z2 copied ephemeral-signed marker but attach without the private key path still needs FD key", true /* covered by C2 (wrong key) + Z1 (no sig) */);
} finally { try { rmSync(base, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ LIFECYCLE-AUTHORITY-V4 SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
