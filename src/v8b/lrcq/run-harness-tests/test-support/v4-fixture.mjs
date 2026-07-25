// FounderGate LRCQ — TEST-SUPPORT disposable V4 world builder (FG-LRCQ-ACT-029).
// Structurally test-only (lives under run-harness-tests; no production module imports it). It builds a
// COMPLETE disposable authority world so every migrated test family uses the real V4 route instead of
// hand-written activation objects:
//   * a disposable Ed25519 founder key (generated here, never enrolled, never persisted outside tmp);
//   * a disposable governed public-key authority document (injected via keyDeps — the real
//     docs/governance/FOUNDER_KEY_AUTHORITY.json is never read and active_keys stays empty);
//   * disposable founder-authorization text;
//   * a real git repository + its real git-common-dir + a lifecycle root inside it;
//   * a genuinely SIGNED V4 activation, written to disk;
//   * the VERIFIED capability from the production verifier.
// It NEVER invokes a provider and NEVER creates a real founder key, signature, or activation.
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signActivation, verifyActivation, authorizationTextDigest, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION, LIFECYCLE_CONTRACT_VERSION } from "../../assurance/activation-v4.mjs";
import { fingerprintOfSpkiDer } from "../../assurance/founder-key-authority.mjs";

export const DEFAULT_NOW = 1200;

// Build the disposable world. `payloadOverrides` patches the signed payload before signing.
export function makeDisposableV4World(opts = {}) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), opts.prefix || "fg-v4-")));
  const repoRoot = base;
  execFileSync("git", ["-C", repoRoot, "init", "-q"]);
  const gitCommonDir = realpathSync(join(repoRoot, ".git"));
  const lifecycleRoot = join(repoRoot, "lifecycle");
  mkdirSync(lifecycleRoot, { recursive: true });

  const kp = generateKeyPairSync("ed25519");                       // DISPOSABLE founder key
  const spkiDer = createPublicKey(kp.privateKey).export({ format: "der", type: "spki" });
  const fingerprint = fingerprintOfSpkiDer(spkiDer);
  const authorityDoc = {
    schema: "lrcq-founder-key-authority-1", schema_version: 1, max_current_keys: 1,
    active_keys: [{ fingerprint, public_key_spki_b64: spkiDer.toString("base64"), algorithm: "ed25519", current: true }],
    revoked_keys: [],
  };
  const authorityPath = join(repoRoot, "disposable-key-authority.json");
  writeFileSync(authorityPath, JSON.stringify(authorityDoc, null, 2) + "\n");
  // keyDeps points the loader at the DISPOSABLE document — the governed repository file is never touched.
  const keyDeps = { repo: "/disposable", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
  const authorizationBytes = Buffer.from(opts.authorizationText || "DISPOSABLE TEST AUTHORIZATION — one bounded deterministic run\n");

  const payload = {
    schema: ACTIVATION_V4_SCHEMA, signature_payload_version: V4_SIGNATURE_PAYLOAD_VERSION,
    founder_signature_algorithm: "ed25519", signer_key_fingerprint: fingerprint,
    authorization_text_digest: authorizationTextDigest(authorizationBytes), activation_nonce: opts.nonce || "disposable-nonce-1",
    repository_root_realpath: repoRoot, repository_git_common_dir_realpath: gitCommonDir,
    lifecycle_root_realpath: lifecycleRoot, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION,
    evidence_commit_sha: "8d1899f7", evidence_commit_tree: "9e720249",
    reviewed_runtime_sha: opts.reviewedRuntimeSha || "bfc0556", reviewed_runtime_tree: "20518b8d",
    run_manifest_path: opts.runManifestPath || "disposable-run-manifest.json",
    run_manifest_digest: opts.runManifestDigest || "sha256:" + "5".repeat(64),
    lrcq_base_sha: "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5", lrcq_base_tree: "aaaa1111",
    provider_candidate_sha: "50e18e55863b4abc0f0c2ef036b790ef15001ac5", provider_candidate_tree: "bbbb2222",
    run_id: opts.run_id || "lrcq-disposable-deterministic-run", backlog_digest: opts.backlogDigest || "sha256:" + "1".repeat(64),
    provider_executable_path: opts.providerPath || "/disposable/bin/claude",
    resolved_provider_target: opts.resolvedProviderTarget || "/disposable/versions/stub",
    provider_version: opts.providerVersion || "0.0.0-stub",
    provider_executable_identity: opts.providerIdentity || "sha256:" + "2".repeat(64),
    capability_lease_digest: "sha256:" + "3".repeat(64), blast_radius_budget_digest: "sha256:" + "4".repeat(64),
    // Temporal defaults are small fixed epochs for pure-crypto tests. Families whose code paths consult the
    // REAL system clock (the running-worker deadline monitor) pass realTemporal:true for real-epoch values.
    issued_epoch: opts.realTemporal ? 1_700_000_000 : 1000,
    expiry_epoch: opts.realTemporal ? 9_999_999_999 : 1600,
    hard_deadline_epoch: opts.realTemporal ? 9_999_999_998 : 19000,
    max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700, max_parallel_width: 2,
    max_output_bytes: 10485760, termination_grace_s: 30,
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true,
    no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true,
    ...(opts.payloadOverrides || {}),
  };
  const signed = signActivation(payload, kp.privateKey);
  const activationPath = join(repoRoot, "signed-activation-v4.json");
  writeFileSync(activationPath, JSON.stringify(signed, null, 2) + "\n");
  const now = typeof opts.now === "number" ? opts.now : (opts.realTemporal ? 1_700_000_100 : DEFAULT_NOW);
  const vr = verifyActivation(signed, { authorizationBytes, nowEpoch: now }, { keyDeps });

  const world = {
    base, repoRoot, gitCommonDir, lifecycleRoot, privateKey: kp.privateKey, fingerprint,
    authorityDoc, authorityPath, keyDeps, authorizationBytes, payload, signed, activationPath, now,
    verified: vr.capability, verifyResult: vr,
    // Sign + verify a VARIANT payload in this same world (used by binding/adversarial cases).
    signVariant(over) {
      const p = { ...payload, ...over };
      const s = signActivation(p, kp.privateKey);
      return { signed: s, result: verifyActivation(s, { authorizationBytes, nowEpoch: now }, { keyDeps }) };
    },
    // Standard config for the test-support supervisor child (public data only — never a key).
    childConfig(extra = {}) {
      return { activationPath, authorityPath, authorizationB64: authorizationBytes.toString("base64"), now, keyFd: 3, ...extra };
    },
    writeChildConfig(name, extra = {}) {
      const p = join(repoRoot, name || "supervisor-config.json");
      writeFileSync(p, JSON.stringify(world.childConfig(extra), null, 2) + "\n");
      return p;
    },
    cleanup() { try { rmSync(base, { recursive: true, force: true }); } catch { /* */ } },
  };
  return world;
}
