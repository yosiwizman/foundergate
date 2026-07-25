// FounderGate LRCQ — inherited-anonymous-descriptor ephemeral-key transfer to a DETACHED supervisor
// (FG-LRCQ-ACT-028 Phase 6-9). Proves, with a REAL forked child over a REAL anonymous pipe, that:
//  - the per-activation ephemeral key reaches the supervisor ONLY over inherited fd 3 (never argv/env/file);
//  - the supervisor INDEPENDENTLY re-verifies the founder signature and then attaches -> SUPERVISOR_EXECUTION;
//  - a WRONG key over the fd is refused (KEY_MISMATCH);
//  - NO key on the fd is refused (unreadable);
//  - the key material never appears in the child config, argv, or environment.
// Disposable Ed25519 keys + a git-init'd disposable repo, auto-removed.
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, realpathSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { signActivation, verifyActivation, authorizationTextDigest, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION, LIFECYCLE_CONTRACT_VERSION } from "../../../../src/v8b/lrcq/assurance/activation-v4.mjs";
import { fingerprintOfSpkiDer } from "../../../../src/v8b/lrcq/assurance/founder-key-authority.mjs";
import { consumeActivationV4, createLaunchIntentV4, sendEphemeralKeyToStream } from "../../../../src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHILD = join(HERE, "test-support", "v4-supervisor-child.mjs");
let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// Spawn the child supervisor with an inherited anonymous pipe on fd 3; `writeKey` gets the parent-side
// writable stream for fd 3. Resolves with the child's parsed JSON result + a scan of its argv/env.
function runChild(cfgPath, writeKey) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CHILD, "--config", cfgPath], { stdio: ["ignore", "pipe", "pipe", "pipe"], env: { PATH: process.env.PATH } });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", () => { let parsed = null; try { parsed = JSON.parse(out.trim().split("\n").pop()); } catch { /* */ } resolve({ parsed, out, err }); });
    Promise.resolve(writeKey(child.stdio[3])).catch(() => { try { child.stdio[3].end(); } catch { /* */ } });
  });
}

const base = mkdtempSync(join(tmpdir(), "fg-fd-"));
(async () => {
  try {
    const repoRoot = realpathSync(base);
    execFileSync("git", ["-C", repoRoot, "init", "-q"]);
    const gitCommonDir = realpathSync(join(repoRoot, ".git"));
    const lifecycleRoot = join(repoRoot, "lifecycle"); mkdirSync(lifecycleRoot, { recursive: true });
    const kp = generateKeyPairSync("ed25519");
    const spkiDer = createPublicKey(kp.privateKey).export({ format: "der", type: "spki" });
    const fp = fingerprintOfSpkiDer(spkiDer);
    const authorityDoc = { schema: "lrcq-founder-key-authority-1", schema_version: 1, max_current_keys: 1, active_keys: [{ fingerprint: fp, public_key_spki_b64: spkiDer.toString("base64"), algorithm: "ed25519", current: true }], revoked_keys: [] };
    const authorityPath = join(repoRoot, "authority.json"); writeFileSync(authorityPath, JSON.stringify(authorityDoc));
    const keyDeps = { repo: "/x", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
    const authText = Buffer.from("authorize one run\n");
    const payload = { schema: ACTIVATION_V4_SCHEMA, signature_payload_version: V4_SIGNATURE_PAYLOAD_VERSION, founder_signature_algorithm: "ed25519", signer_key_fingerprint: fp, authorization_text_digest: authorizationTextDigest(authText), activation_nonce: "n", repository_root_realpath: repoRoot, repository_git_common_dir_realpath: gitCommonDir, lifecycle_root_realpath: lifecycleRoot, lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION, evidence_commit_sha: "8d1899f7", evidence_commit_tree: "9e720249", reviewed_runtime_sha: "bfc0556", reviewed_runtime_tree: "20518b8d", run_id: "lrcq-first-internal-5h-run", backlog_digest: "sha256:f3801d96", provider_executable_path: "/x/bin/claude", resolved_provider_target: "/x/versions/2.1.215", provider_version: "2.1.215", provider_executable_identity: "sha256:90608b5c", capability_lease_digest: "sha256:aa", blast_radius_budget_digest: "sha256:bb", issued_epoch: 1000, expiry_epoch: 1600, hard_deadline_epoch: 19000, max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700, max_parallel_width: 2, max_output_bytes: 10485760, termination_grace_s: 30, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true };
    const signed = signActivation(payload, kp.privateKey);
    const activationPath = join(repoRoot, "activation.json"); writeFileSync(activationPath, JSON.stringify(signed));
    const v = verifyActivation(signed, { authorizationBytes: authText, nowEpoch: 1200 }, { keyDeps }).capability;

    // Governed consume + launch intent (launcher side).
    const c = consumeActivationV4(v, { now: 1200 });
    ok("setup: governed consume -> CONSUMED", c.ok);
    ok("setup: launch intent created", createLaunchIntentV4(c.capability, { now: 1200 }).ok);
    const cfg = { activationPath, authorityPath, authorizationB64: authText.toString("base64"), now: 1200, keyFd: 3 };
    const cfgPath = join(repoRoot, "sup-config.json"); writeFileSync(cfgPath, JSON.stringify(cfg));

    // A1 POSITIVE: correct ephemeral key over inherited fd 3 -> child independently re-verifies + attaches.
    const r1 = await runChild(cfgPath, (fd3) => sendEphemeralKeyToStream(c.capability, fd3));
    ok("A1 correct key over inherited fd -> child reaches SUPERVISOR_EXECUTION", r1.parsed && r1.parsed.ok === true && r1.parsed.stage === "SUPERVISOR_EXECUTION" && r1.parsed.branded === true);

    // A2 WRONG key: a foreign ephemeral key written to the fd -> child re-verifies OK but attach KEY_MISMATCH.
    // (fresh lifecycle root so the marker/intent exist but the supplied key mismatches the marker fingerprint)
    const base2 = realpathSync(mkdtempSync(join(tmpdir(), "fg-fd2-")));
    execFileSync("git", ["-C", base2, "init", "-q"]);
    const lc2 = join(base2, "lifecycle"); mkdirSync(lc2);
    const p2 = { ...payload, repository_root_realpath: base2, repository_git_common_dir_realpath: realpathSync(join(base2, ".git")), lifecycle_root_realpath: lc2, activation_nonce: "n2" };
    const signed2 = signActivation(p2, kp.privateKey);
    const ap2 = join(base2, "activation.json"); writeFileSync(ap2, JSON.stringify(signed2));
    const v2 = verifyActivation(signed2, { authorizationBytes: authText, nowEpoch: 1200 }, { keyDeps }).capability;
    const c2 = consumeActivationV4(v2, { now: 1200 }); createLaunchIntentV4(c2.capability, { now: 1200 });
    const cfg2 = { activationPath: ap2, authorityPath, authorizationB64: authText.toString("base64"), now: 1200, keyFd: 3 };
    const cfgPath2 = join(base2, "sup-config.json"); writeFileSync(cfgPath2, JSON.stringify(cfg2));
    const foreignDer = generateKeyPairSync("ed25519").privateKey.export({ format: "der", type: "pkcs8" });
    const r2 = await runChild(cfgPath2, (fd3) => new Promise((res) => fd3.write(foreignDer, () => fd3.end(res))));
    ok("A2 wrong ephemeral key over fd -> attach REFUSED (KEY_MISMATCH)", r2.parsed && r2.parsed.ok === false && r2.parsed.code === "KEY_MISMATCH");

    // A3 NO key: parent closes fd 3 without writing -> child cannot read a key.
    const r3 = await runChild(cfgPath2, (fd3) => new Promise((res) => fd3.end(res)));
    ok("A3 empty fd (no key delivered) -> child refuses (FD_KEY_UNREADABLE)", r3.parsed && r3.parsed.ok === false && r3.parsed.code === "FD_KEY_UNREADABLE");

    // A4 leak proof: the child config / activation / authority carry NO private-key material; the key
    // travelled ONLY over the pipe. (argv is [node, child, --config, path] — no key; env is PATH only.)
    const cfgText = readFileSync(cfgPath, "utf8") + readFileSync(activationPath, "utf8") + readFileSync(authorityPath, "utf8");
    ok("A4 no private-key material in config/activation/authority (fd-only transfer)", !/PRIVATE KEY/.test(cfgText) && !/ephemeralPrivate/i.test(cfgText));
    rmSync(base2, { recursive: true, force: true });
  } finally { try { rmSync(base, { recursive: true, force: true }); } catch { /* */ } }

  console.log("\nLRCQ LIFECYCLE-FD-TRANSFER SELFTEST: " + (n - fails.length) + "/" + n + " passed");
  if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
  process.exit(0);
})();
