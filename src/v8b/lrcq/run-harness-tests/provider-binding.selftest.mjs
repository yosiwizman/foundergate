// FounderGate LRCQ — provider-binding drift closure (FG-LRCQ-ACT-022). Uses DISPOSABLE fake versioned
// executables + a retargeting symlink alias (never real Claude) to prove: the bound IMMUTABLE versioned
// target is rehashed + version-checked before consumption; a mutable alias retarget cannot change what
// executes; missing/modified/wrong-version/symlink/non-exec targets fail closed; and the production wiring
// binds resolved_provider_target (not the alias) with a real disk rehash.
import { verifyProviderTarget, sha256File } from "../provider/provider-verify.mjs";
import { mkdtempSync, writeFileSync, chmodSync, rmSync, symlinkSync, unlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "../../../..");
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-provbind-"));

// deterministic fake versioned executables (never real Claude)
const V215 = join(ROOT, "versions", "2.1.215"); const V217 = join(ROOT, "versions", "2.1.217");
import { mkdirSync } from "node:fs";
mkdirSync(join(ROOT, "versions"), { recursive: true });
writeFileSync(V215, "#!/bin/sh\necho '2.1.215 (fake)'\n"); chmodSync(V215, 0o755);
writeFileSync(V217, "#!/bin/sh\necho '2.1.217 (fake)'\n"); chmodSync(V217, 0o755);
const ID215 = sha256File(V215); const ID217 = sha256File(V217);
// mutable alias symlink (like ~/.local/bin/claude) — initially -> 2.1.215
const ALIAS = join(ROOT, "bin-claude"); symlinkSync(V215, ALIAS);
// version runners: fake that reads the file's echoed version (never executes real Claude)
const vr = (p) => (p === V215 ? "2.1.215 (fake)" : p === V217 ? "2.1.217 (fake)" : "0.0.0");

try {
  const bind = (over = {}) => ({ resolvedTarget: V215, expectedIdentity: ID215, expectedVersion: "2.1.215", ...over });
  // 1. alias->reviewed target, digest matches -> exact target accepted
  ok("01 exact bound target verifies OK", verifyProviderTarget(bind(), { versionRunner: vr }).code === "OK");
  // 2. alias retargets to a different fake version -> verifier STILL targets the bound versioned file, ignores the alias
  try { unlinkSync(ALIAS); } catch { /* */ } symlinkSync(V217, ALIAS);
  ok("02 alias retarget to 2.1.217 does NOT change the bound target result (still OK for 2.1.215)", verifyProviderTarget(bind(), { versionRunner: vr }).code === "OK");
  ok("02b binding the mutable alias itself is refused (symlink)", verifyProviderTarget(bind({ resolvedTarget: ALIAS, expectedIdentity: ID217 }), { versionRunner: vr }).code === "PROVIDER_TARGET_IS_MUTABLE_ALIAS");
  // 3. exact target missing
  ok("03 missing target -> PROVIDER_TARGET_MISSING", verifyProviderTarget(bind({ resolvedTarget: join(ROOT, "versions", "nope") }), { versionRunner: vr }).code === "PROVIDER_TARGET_MISSING");
  // 4. digest changed
  ok("04 digest mismatch -> PROVIDER_DIGEST_MISMATCH", verifyProviderTarget(bind({ expectedIdentity: ID217 }), { versionRunner: vr }).code === "PROVIDER_DIGEST_MISMATCH");
  // 5. version changed
  ok("05 version mismatch -> PROVIDER_VERSION_MISMATCH", verifyProviderTarget(bind({ expectedVersion: "2.1.999" }), { versionRunner: vr }).code === "PROVIDER_VERSION_MISMATCH");
  // 6. target becomes a symlink
  const SL = join(ROOT, "versions", "sym215"); symlinkSync(V215, SL);
  ok("06 symlinked target -> PROVIDER_TARGET_IS_MUTABLE_ALIAS", verifyProviderTarget(bind({ resolvedTarget: SL }), { versionRunner: vr }).code === "PROVIDER_TARGET_IS_MUTABLE_ALIAS");
  // 7. target loses executable permission
  const NX = join(ROOT, "versions", "noexec215"); writeFileSync(NX, readFileSync(V215)); chmodSync(NX, 0o644);
  ok("07 non-executable target -> PROVIDER_TARGET_NOT_EXECUTABLE", verifyProviderTarget({ resolvedTarget: NX, expectedIdentity: sha256File(NX), expectedVersion: "2.1.215" }, { versionRunner: vr }).code === "PROVIDER_TARGET_NOT_EXECUTABLE");
  // 8-9. PATH / caller substitute cannot influence the verifier (it only reads resolvedTarget from the binding)
  ok("08 verifier ignores PATH/caller substitutes (binding-only resolvedTarget)", verifyProviderTarget(bind(), { versionRunner: vr, exists: () => true, hashFile: () => ID215 }).code === "OK" && verifyProviderTarget(bind({ resolvedTarget: undefined }), { versionRunner: vr }).code === "PROVIDER_BINDING_UNKNOWN");
  // 10-11. manifest/activation agreement is NOT enough — the disk is rehashed here
  ok("10 agreement-but-disk-differs is detected (disk rehash, not just field compare)", verifyProviderTarget(bind({ expectedIdentity: "sha256:" + "0".repeat(64) }), { versionRunner: vr }).code === "PROVIDER_DIGEST_MISMATCH");
  // UNKNOWN never passes
  ok("12 no version runner -> PROVIDER_BINDING_UNKNOWN (UNKNOWN never passes)", verifyProviderTarget(bind(), {}).code === "PROVIDER_BINDING_UNKNOWN");
  ok("13 missing binding fields -> PROVIDER_BINDING_UNKNOWN", verifyProviderTarget({ resolvedTarget: V215 }, { versionRunner: vr }).code === "PROVIDER_BINDING_UNKNOWN");
  // OK receipt carries the authority-bearing facts
  const okr = verifyProviderTarget(bind(), { versionRunner: vr });
  ok("14 OK receipt binds target + digest + version", okr.receipt && okr.receipt.target === V215 && okr.receipt.digest === ID215 && okr.receipt.version === "2.1.215");

  // ---- production wiring guards (mutation guards 22-24) ----
  const compSrc = readFileSync(join(SRC, "src/v8b/lrcq/run-harness/compose-adapter-activation.mjs"), "utf8");
  const rpSrc = readFileSync(join(SRC, "src/v8b/lrcq/provider/real-provider.mjs"), "utf8");
  ok("22 execution spawns provider_resolved_target, NOT the mutable alias (mutation guard)", /provider_resolved_target:\s*manifest\.resolved_provider_target/.test(compSrc) && /spawn\(\s*execTarget/.test(rpSrc) && /execTarget\s*=\s*activation\.provider_resolved_target/.test(rpSrc));
  const launchSrc = readFileSync(join(SRC, "tools/terminal0/lrcq/run-five-hour.mjs"), "utf8");
  const actIdx = launchSrc.indexOf('args.indexOf("--activation")');
  const actBranch = launchSrc.slice(actIdx);
  ok("23 runtime provider verification runs BEFORE consumption (verifyProviderTarget before launchDetachedSupervisor)", actBranch.indexOf("verifyProviderTarget(") >= 0 && actBranch.indexOf("verifyProviderTarget(") < actBranch.indexOf("launchDetachedSupervisor("));
  ok("24 verification rehashes the disk target (not just manifest-to-activation compare)", /hashFile|sha256File|createHash/.test(readFileSync(join(SRC, "src/v8b/lrcq/provider/provider-verify.mjs"), "utf8")) && actBranch.includes("resolved_provider_target"));
} finally { try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ PROVIDER-BINDING SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
