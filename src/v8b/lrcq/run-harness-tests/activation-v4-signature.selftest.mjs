// FounderGate LRCQ — Ed25519 V4 founder-signature authority selftest (FG-LRCQ-ACT-028).
// Disposable test keys ONLY (in-memory KeyObjects; no key written to disk). Exercises the production
// canonicalizer + key-authority loader + V4 sign/verify + verified-capability + V3-refusal.
import { generateKeyPairSync, createHash } from "node:crypto";
import { canonicalize, signedMessage, V4_SIGNATURE_DOMAIN } from "../../../../src/v8b/lrcq/assurance/canonical-json.mjs";
import { loadAuthority, currentFounderKey, resolveVerifierKey, fingerprintOfSpkiDer, KEY_CODES } from "../../../../src/v8b/lrcq/assurance/founder-key-authority.mjs";
import { signActivation, verifyActivation, extractPayload, authorizationTextDigest, isVerifiedCapability, assertVerifiedCapability, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION, V4_CODES } from "../../../../src/v8b/lrcq/assurance/activation-v4.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// ---- disposable test key + fixture authority ----
const kp = generateKeyPairSync("ed25519");
const spkiDer = kp.publicKey.export({ format: "der", type: "spki" });
const fp = fingerprintOfSpkiDer(spkiDer);
const authorityDoc = { schema: "lrcq-founder-key-authority-1", schema_version: 1, max_current_keys: 1, active_keys: [{ fingerprint: fp, public_key_spki_b64: spkiDer.toString("base64"), algorithm: "ed25519", current: true }], revoked_keys: [] };
const keyDeps = { repo: "/x", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };

const authText = Buffer.from("I, the founder, authorize exactly one run of candidate bfc0556.\n", "utf8");
function basePayload(over = {}) {
  return {
    schema: ACTIVATION_V4_SCHEMA, signature_payload_version: V4_SIGNATURE_PAYLOAD_VERSION,
    founder_signature_algorithm: "ed25519", signer_key_fingerprint: fp,
    authorization_text_digest: authorizationTextDigest(authText), activation_nonce: "nonce-123",
    repository_root_realpath: "/tmp/repo", repository_git_common_dir_realpath: "/tmp/repo/.git", lifecycle_root_realpath: "/tmp/repo/lifecycle", lifecycle_contract_version: "lrcq-lifecycle-v4-1",
    evidence_commit_sha: "8d1899f7", evidence_commit_tree: "9e720249", reviewed_runtime_sha: "bfc0556", reviewed_runtime_tree: "20518b8d",
    run_id: "lrcq-first-internal-5h-run", backlog_digest: "sha256:f3801d96",
    provider_executable_path: "/x/bin/claude", resolved_provider_target: "/x/versions/2.1.215", provider_version: "2.1.215", provider_executable_identity: "sha256:90608b5c",
    capability_lease_digest: "sha256:aa", blast_radius_budget_digest: "sha256:bb",
    issued_epoch: 1000, expiry_epoch: 1600, hard_deadline_epoch: 19000,
    max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700, max_parallel_width: 2, max_output_bytes: 10485760, termination_grace_s: 30,
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true,
    ...over,
  };
}
const sign = (over) => signActivation(basePayload(over), kp.privateKey);
const bind = { authorizationBytes: authText, nowEpoch: 1200, keyDeps };
const vok = (act, b = bind) => verifyActivation(act, b, { keyDeps });

// ---- canonicalization ----
ok("C1 canonical output is key-order independent", canonicalize({ b: 1, a: 2 }) === canonicalize({ a: 2, b: 1 }));
ok("C2 arrays preserve order", canonicalize([3, 1, 2]) === "[3,1,2]");
ok("C3 rejects undefined / NaN / Infinity / function", (() => { let r = 0; for (const v of [undefined, NaN, Infinity, () => {}]) { try { canonicalize({ x: v }); } catch { r++; } } return r === 4; })());
ok("C4 domain-separation prefix fixed", V4_SIGNATURE_DOMAIN === "FOUNDERGATE-LRCQ-ACTIVATION-V4\0" && signedMessage("p").slice(0, V4_SIGNATURE_DOMAIN.length).toString("utf8") === V4_SIGNATURE_DOMAIN);

// ---- key authority ----
ok("K1 loads current founder key + fingerprint recomputed", currentFounderKey(keyDeps).ok === true);
ok("K2 rejects symlink authority", loadAuthority({ ...keyDeps, lstat: () => ({ isSymbolicLink: () => true }) }).code === KEY_CODES.AUTHORITY_SYMLINK);
ok("K3 rejects fingerprint mismatch", loadAuthority({ ...keyDeps, readFile: () => JSON.stringify({ ...authorityDoc, active_keys: [{ ...authorityDoc.active_keys[0], fingerprint: "sha256:" + "0".repeat(64) }] }) }).code === KEY_CODES.FINGERPRINT_MISMATCH);
ok("K4 rejects multiple current keys", loadAuthority({ ...keyDeps, readFile: () => JSON.stringify({ ...authorityDoc, active_keys: [authorityDoc.active_keys[0], { ...authorityDoc.active_keys[0], fingerprint: "sha256:" + "1".repeat(64), current: true }] }) }).code !== KEY_CODES.OK);
ok("K5 empty active_keys -> NO_CURRENT_KEY (fail closed)", currentFounderKey({ ...keyDeps, readFile: () => JSON.stringify({ ...authorityDoc, active_keys: [] }) }).code === KEY_CODES.NO_CURRENT_KEY);
ok("K6 revoked key -> refused", resolveVerifierKey(fp, { ...keyDeps, readFile: () => JSON.stringify({ ...authorityDoc, revoked_keys: [{ fingerprint: fp }] }) }).code === KEY_CODES.KEY_REVOKED);

// ---- positive ----
const good = sign();
const v = vok(good);
ok("P1 valid signed V4 verifies + returns a verified capability", v.ok === true && isVerifiedCapability(v.capability));
ok("P2 capability is non-forgeable ({verified:true} rejected)", isVerifiedCapability({ verified: true }) === false);
ok("P3 assertVerifiedCapability throws on a forged object", (() => { try { assertVerifiedCapability({ verified: true }); return false; } catch (e) { return e.code === V4_CODES.FORGED_CAPABILITY; } })());
ok("P4 verify is object-order independent (re-serialized payload)", vok({ ...good }).ok === true);
ok("P5 activation identity is deterministic", vok(good).activation_identity === vok(good).activation_identity && /^sha256:[0-9a-f]{64}$/.test(v.activation_identity));

// ---- negative: signature/authorization ----
ok("N01 one-byte authorization change -> AUTHORIZATION_DIGEST_MISMATCH", verifyActivation(good, { ...bind, authorizationBytes: Buffer.from(authText.toString() + "X") }, { keyDeps }).code === V4_CODES.AUTHORIZATION_DIGEST_MISMATCH);
ok("N02 LF->CRLF authorization change -> mismatch (no normalization)", verifyActivation(good, { ...bind, authorizationBytes: Buffer.from(authText.toString().replace("\n", "\r\n")) }, { keyDeps }).code === V4_CODES.AUTHORIZATION_DIGEST_MISMATCH);
ok("N03 unicode-byte change -> mismatch", verifyActivation(good, { ...bind, authorizationBytes: Buffer.from(authText.toString().replace("founder", "föunder")) }, { keyDeps }).code === V4_CODES.AUTHORIZATION_DIGEST_MISMATCH);
ok("N04 tampered payload field (evidence sha) -> SIGNATURE_INVALID", vok({ ...good, evidence_commit_sha: "deadbeef" }).code === V4_CODES.SIGNATURE_INVALID);
ok("N05 tampered runtime sha -> SIGNATURE_INVALID", vok({ ...good, reviewed_runtime_sha: "x" }).code === V4_CODES.SIGNATURE_INVALID);
ok("N06 tampered backlog digest -> SIGNATURE_INVALID", vok({ ...good, backlog_digest: "sha256:00" }).code === V4_CODES.SIGNATURE_INVALID);
ok("N07 tampered provider identity -> SIGNATURE_INVALID", vok({ ...good, provider_executable_identity: "sha256:ff" }).code === V4_CODES.SIGNATURE_INVALID);
ok("N08 tampered cost ceiling -> SIGNATURE_INVALID", vok({ ...good, max_budget_usd: 9 }).code === V4_CODES.SIGNATURE_INVALID);
ok("N09 tampered exclusion (no_deploy false) -> SIGNATURE_INVALID or EXCLUSION", [V4_CODES.SIGNATURE_INVALID, V4_CODES.EXCLUSION_VIOLATION].includes(vok({ ...good, no_deploy: false }).code));
ok("N10 empty signature -> EMPTY_SIGNATURE", vok({ ...good, founder_signature: "" }).code === V4_CODES.EMPTY_SIGNATURE);
ok("N11 malformed signature (bad length) -> BAD_SIGNATURE_ENCODING", vok({ ...good, founder_signature: Buffer.from("short").toString("base64") }).code === V4_CODES.BAD_SIGNATURE_ENCODING);
// wrong/unknown key
const kp2 = generateKeyPairSync("ed25519");
ok("N12 signed by a different key -> SIGNATURE_INVALID (fingerprint still governed) or UNKNOWN", (() => { const other = signActivation(basePayload(), kp2.privateKey); return vok(other).code === V4_CODES.SIGNATURE_INVALID; })());
ok("N13 unknown signer fingerprint -> UNKNOWN_OR_REVOKED_KEY", vok({ ...good, signer_key_fingerprint: "sha256:" + "2".repeat(64) }).code === V4_CODES.UNKNOWN_OR_REVOKED_KEY);
ok("N14 revoked key -> UNKNOWN_OR_REVOKED_KEY", verifyActivation(good, bind, { keyDeps: { ...keyDeps, readFile: () => JSON.stringify({ ...authorityDoc, revoked_keys: [{ fingerprint: fp }] }) } }).code === V4_CODES.UNKNOWN_OR_REVOKED_KEY);

// ---- negative: V3 + schema ----
ok("N15 arbitrary non-empty V3 founder_signature -> V3_REFUSED_FOR_EXECUTION", verifyActivation({ schema: "lrcq-activation-3", founder_signature: "anything" }, bind, { keyDeps }).code === V4_CODES.V3_REFUSED_FOR_EXECUTION);
ok("N16 unsigned V4 (no founder_signature) -> EMPTY_SIGNATURE/MISSING", [V4_CODES.EMPTY_SIGNATURE, V4_CODES.MISSING_FIELD].includes(vok({ ...good, founder_signature: undefined }).code) || vok((() => { const p = basePayload(); return p; })()).code === V4_CODES.EMPTY_SIGNATURE);
ok("N17 not V4 schema -> NOT_V4", verifyActivation({ schema: "something-else" }, bind, { keyDeps }).code === V4_CODES.NOT_V4);

// ---- negative: temporal + binding ----
ok("N18 expired -> EXPIRED", verifyActivation(good, { ...bind, nowEpoch: 2000 }, { keyDeps }).code === V4_CODES.EXPIRED);
ok("N19 not yet issued -> NOT_YET_ISSUED", verifyActivation(good, { ...bind, nowEpoch: 500 }, { keyDeps }).code === V4_CODES.NOT_YET_ISSUED);
ok("N20 deadline elapsed -> DEADLINE_ELAPSED", verifyActivation(sign({ hard_deadline_epoch: 1100 }), { ...bind, nowEpoch: 1200 }, { keyDeps }).code === V4_CODES.DEADLINE_ELAPSED);
ok("N21 binding mismatch (wrong evidence sha) -> BINDING_MISMATCH", verifyActivation(good, { ...bind, evidenceCommitSha: "other" }, { keyDeps }).code === V4_CODES.BINDING_MISMATCH);

console.log("\nLRCQ ACTIVATION-V4 SIGNATURE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
