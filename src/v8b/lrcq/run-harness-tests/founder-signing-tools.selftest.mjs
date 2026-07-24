// FounderGate LRCQ — enrollment/signing tools + consumption bypass-closure (FG-LRCQ-ACT-028).
// Disposable Ed25519 test keys ONLY, all under an auto-removed temp dir. Exercises the production tool
// CORE functions + the V4 capability-gated consumer. Proves no private-key/passphrase leakage.
import { generateKeyPairSync, createHash, createPublicKey } from "node:crypto";
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync, statSync, rmSync, lstatSync, symlinkSync, readdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateEnrollment, writeEncryptedKey } from "../../../../tools/terminal0/lrcq/founder-key-enroll.mjs";
import { loadPrivateKey, readAuthorizationBytes, buildV4Payload } from "../../../../tools/terminal0/lrcq/founder-sign.mjs";
import { signActivation, verifyActivation, isVerifiedCapability, V4_CODES } from "../../../../src/v8b/lrcq/assurance/activation-v4.mjs";
import { fingerprintOfSpkiDer } from "../../../../src/v8b/lrcq/assurance/founder-key-authority.mjs";
import { consumeVerifiedActivation } from "../../../../src/v8b/lrcq/run-harness/activation-consumer.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const base = mkdtempSync(join(tmpdir(), "fg-signtools-"));
const PASS = "disposable-test-passphrase-123";
try {
  // ---- enrollment core (disposable) ----
  const enr = generateEnrollment(PASS);
  ok("E1 enrollment produces encrypted PKCS#8 + SPKI public + fingerprint", /BEGIN ENCRYPTED PRIVATE KEY/.test(enr.encryptedPkcs8Pem) && /^sha256:[0-9a-f]{64}$/.test(enr.fingerprint));
  ok("E2 short passphrase refused", (() => { try { generateEnrollment("short"); return false; } catch { return true; } })());
  const keyPath = join(base, "founder-ed25519.p8");
  writeEncryptedKey(keyPath, enr.encryptedPkcs8Pem);
  ok("E3 key written mode 600", (statSync(keyPath).mode & 0o777) === 0o600);
  ok("E4 refuses to overwrite an existing key", (() => { try { writeEncryptedKey(keyPath, enr.encryptedPkcs8Pem); return false; } catch { return true; } })());

  // ---- signing core (disposable) ----
  const { key: priv, fingerprint: fp } = loadPrivateKey(enr.encryptedPkcs8Pem, PASS);
  ok("S1 loaded private key fingerprint == enrolled public fingerprint", fp === enr.fingerprint);
  ok("S2 wrong passphrase fails to load key", (() => { try { loadPrivateKey(enr.encryptedPkcs8Pem, "wrong"); return false; } catch { return true; } })());
  // authorization-file: exact bytes, symlink/perm refusal
  const authPath = join(base, "authz.txt");
  const authText = "I authorize exactly one run of candidate bfc0556.\n";
  writeFileSync(authPath, authText, { mode: 0o600 });
  const bytes = readAuthorizationBytes(authPath, { uid: statSync(authPath).uid, allowLoosePerms: false });
  ok("S3 reads EXACT authorization bytes (no normalization)", bytes.toString() === authText);
  ok("S4 refuses a symlink authorization-file", (() => { const l = join(base, "authz-link.txt"); try { symlinkSync(authPath, l); } catch { return true; } try { readAuthorizationBytes(l, { uid: 0 }); return false; } catch { return true; } })());
  // frozen template (mimics the FINAL_UNSIGNED_ACTIVATION_TEMPLATE fields)
  const template = { run_harness_candidate_sha: "8d1899f7", run_harness_candidate_tree: "9e720249", reviewed_production_ancestor_sha: "bfc0556", reviewed_production_ancestor_tree: "20518b8d", run_id: "lrcq-first-internal-5h-run", first_real_run_backlog_digest: "sha256:f3801d96", provider_executable_path: "/x/bin/claude", resolved_provider_target: "/x/versions/2.1.215", provider_version: "2.1.215", provider_executable_identity: "sha256:90608b5c", capability_lease_digest: "sha256:aa", blast_radius_budget_digest: "sha256:bb", max_budget_usd: 10 };
  const repoRoot = realpathSync(base);
  const lifecycleRoot = join(repoRoot, "lifecycle"); mkdirSync(lifecycleRoot, { recursive: true });
  const payload = buildV4Payload({ template, signerFingerprint: fp, authorizationBytes: bytes, nonce: "n1", issuedEpoch: 1000, repositoryRootRealpath: repoRoot, lifecycleRootRealpath: lifecycleRoot });
  const signed = signActivation(payload, priv);
  // governed authority fixture with this disposable key as current
  const spkiDer = createPublicKey(priv).export({ format: "der", type: "spki" });
  const authorityDoc = { schema: "lrcq-founder-key-authority-1", schema_version: 1, max_current_keys: 1, active_keys: [{ fingerprint: fp, public_key_spki_b64: spkiDer.toString("base64"), algorithm: "ed25519", current: true }], revoked_keys: [] };
  const keyDeps = { repo: "/x", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
  const v = verifyActivation(signed, { authorizationBytes: bytes, nowEpoch: 1200 }, { keyDeps });
  ok("S5 tool-signed activation verifies + yields a capability", v.ok === true && isVerifiedCapability(v.capability));

  // ---- consumption bypass closure ----
  const ledgerDir = lifecycleRoot;
  const c1 = consumeVerifiedActivation(v.capability, { ledgerDir: lifecycleRoot, now: 1200 });
  ok("B1 verified capability consumes exactly once", c1.ok === true && existsSync(c1.marker_path));
  ok("B2 replay refused (second consumption)", consumeVerifiedActivation(v.capability, { ledgerDir: lifecycleRoot, now: 1201 }).replay_blocked === true);
  ok("B3 forged {verified:true} object refused BEFORE any marker", consumeVerifiedActivation({ verified: true, activation_identity: "sha256:" + "9".repeat(64) }, { ledgerDir: join(base, "l2"), now: 1200 }).code === V4_CODES.FORGED_CAPABILITY && !existsSync(join(base, "l2")));
  ok("B4 raw activation object (not a capability) refused", consumeVerifiedActivation(signed, { ledgerDir: join(base, "l3"), now: 1200 }).code === V4_CODES.FORGED_CAPABILITY);

  // ---- secret-leak proof over everything this test produced ----
  const scan = (dir) => { let hit = false; const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else { const s = readFileSync(p, "utf8"); if (/BEGIN ENCRYPTED PRIVATE KEY/.test(s) && !p.endsWith(".p8")) hit = true; if (s.includes(PASS)) hit = true; if (/BEGIN PRIVATE KEY/.test(s)) hit = true; } } }; walk(dir); return hit; };
  ok("L1 no passphrase / unencrypted private key leaked into any receipt/marker/log", scan(ledgerDir) === false);
  ok("L2 the consumed marker records only safe digests+fingerprints (no auth text, no key, no passphrase)", (() => { const m = readFileSync(c1.marker_path, "utf8"); return !m.includes(PASS) && !m.includes(authText) && !/PRIVATE KEY/.test(m) && /signer_key_fingerprint/.test(m); })());
} finally { try { rmSync(base, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ FOUNDER-SIGNING-TOOLS SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
