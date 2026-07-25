// FounderGate LRCQ — governed regression tests for the two accepted capsule-generator dependency
// corrections (FG-LRCQ-ACT-026): (A) generate-run-manifest import-safety (CLI guard), (B) evidence-set
// founder-capsule recursion closure + tamper detection. Turns the prior ad-hoc proofs into suite tests.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import { buildEvidenceSet, verifyEvidenceSet, FOUNDER_CAPSULE_EXCLUSIONS } from "../../../../tools/terminal0/lrcq/evidence-set.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const REPO = new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const hashTree = (dir) => existsSync(dir) ? readdirSync(dir).sort().map((f) => f + ":" + createHash("sha256").update(readFileSync(join(dir, f))).digest("hex")).join("|") : "(absent)";

// ---- (A) import-safety: importing generate-run-manifest.mjs performs ZERO writes ----
const matDir = join(REPO, ".foundergate/run-materials/first-internal-5h");
const packetPath = join(REPO, ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json");
const beforeMat = hashTree(matDir);
const beforePacket = existsSync(packetPath) ? createHash("sha256").update(readFileSync(packetPath)).digest("hex") : "(absent)";
const mod = await import("../../../../tools/terminal0/lrcq/generate-run-manifest.mjs");
ok("A1 import exposes buildActivationMaterialPacket (pure) + resolveProvider", typeof mod.buildActivationMaterialPacket === "function" && typeof mod.resolveProvider === "function");
ok("A2 importing writes NOTHING to run-materials (CLI guard)", hashTree(matDir) === beforeMat);
ok("A3 importing does NOT rewrite the tracked material packet", (existsSync(packetPath) ? createHash("sha256").update(readFileSync(packetPath)).digest("hex") : "(absent)") === beforePacket);
// FG-LRCQ-ACT-029 provider re-freeze: the historical 2.1.215 target is gone from this host, so the tracked
// packet is re-frozen onto the CURRENTLY INSTALLED immutable versioned target. The invariant that matters is
// that the tracked packet's provider binding matches a real, non-symlink versioned file on disk by digest.
ok("A4 the tracked material packet binds a REAL immutable versioned target by digest", (() => {
  if (!existsSync(packetPath)) return true;
  const p = JSON.parse(readFileSync(packetPath, "utf8"));
  if (!p.resolved_provider_target || !existsSync(p.resolved_provider_target)) return false;
  if (lstatSync(p.resolved_provider_target).isSymbolicLink()) return false;
  const d = "sha256:" + createHash("sha256").update(readFileSync(p.resolved_provider_target)).digest("hex");
  return d === p.provider_executable_identity && p.provider_version === basename(p.resolved_provider_target);
})());
// buildActivationMaterialPacket is pure: calling it twice on identical inputs is byte-stable and writes nothing
const g = (a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).stdout || execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();
const gitR = (a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();
const manifest = JSON.parse(readFileSync(join(matDir, "run-manifest.json"), "utf8"));
const rm = await import("../../../../src/v8b/lrcq/run-harness/run-manifest.mjs");
const prov = { path: manifest.provider_executable_path, target: manifest.resolved_provider_target, version: manifest.provider_version, identity: manifest.provider_executable_identity };
const mkPkt = (headSha, headTree) => mod.buildActivationMaterialPacket({ repo: REPO, prov, manRel: ".foundergate/run-materials/first-internal-5h/run-manifest.json", manDigest: rm.manifestDigest(manifest), leaseManifestAbs: join(REPO, manifest.capability_lease_manifest_path), blastManifestAbs: join(REPO, manifest.blast_budget_manifest_path), backlogRel: manifest.backlog_path, runHarnessSha: headSha, runHarnessTree: headTree });
const p1 = JSON.stringify(mkPkt("aaa", "bbb")); const p2 = JSON.stringify(mkPkt("aaa", "bbb"));
ok("A5 buildActivationMaterialPacket is deterministic (identical inputs -> identical packet)", p1 === p2);
ok("A6 the packet carries the full authoritative V4 field set (>= 50 fields incl. the signed manifest + lifecycle bindings)", (() => { const o = mkPkt("aaa", "bbb"); return Object.keys(o).length >= 50 && ["schema", "signature_payload_version", "founder_signature_algorithm", "repository_root_realpath", "repository_git_common_dir_realpath", "lifecycle_root_realpath", "run_manifest_path", "run_manifest_digest", "lrcq_base_sha", "provider_candidate_sha", "capability_lease_digest", "blast_radius_budget_digest", "resolved_provider_target", "run_id", "lifecycle_authority_v4_digest"].every((k) => k in o); })());
ok("A7 the tracked run-materials remained unchanged across all packet builds", hashTree(matDir) === beforeMat);

// ---- (B) evidence-set founder-capsule recursion closure + tamper detection (REAL functions) ----
ok("B0 fixed exclusion set is EXACTLY the two self-referential files", Array.isArray(FOUNDER_CAPSULE_EXCLUSIONS) && FOUNDER_CAPSULE_EXCLUSIONS.length === 2 && FOUNDER_CAPSULE_EXCLUSIONS.includes("EVIDENCE_SET_MANIFEST.json") && FOUNDER_CAPSULE_EXCLUSIONS.includes("SHA256SUMS.txt"));
const base = mkdtempSync(join(tmpdir(), "fg-capdeps-"));
const mkCap = () => { const c = mkdtempSync(join(base, "cap-")); writeFileSync(join(c, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"), JSON.stringify({ run_duration_s: 18000, per_job_timeout_s: 2700, founder_signature: null })); for (const f of ["SYSTEM_STATE.json", "FOUNDER_SUMMARY.md", "BUILT_VS_UNPROVEN.md", "OPEN_RISKS.md", "NEXT_FOUNDER_GATE.md"]) writeFileSync(join(c, f), "content-" + f); return c; };
const build = (c) => buildEvidenceSet({ repo: REPO, template: join(c, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"), capsuleDir: c, prTitle: "t", prLiveBody: "b", prStoredBody: "b", githubHead: "x" });
// returns true iff verify reports a founder-capsule aggregate/exclusion problem
const aggFails = (c, man) => { writeFileSync(join(c, "EVIDENCE_SET_MANIFEST.json"), JSON.stringify(man, null, 2)); const r = verifyEvidenceSet(REPO, join(c, "EVIDENCE_SET_MANIFEST.json")); return (r.problems || []).some((p) => /capsule aggregate|aggregate_exclusions/.test(p)); };
let c = mkCap(); const b = build(c); writeFileSync(join(c, "SHA256SUMS.txt"), "sums");
ok("B1 valid flat capsule + manifest + SHA256SUMS -> founder aggregate stable (recursion closed)", aggFails(c, b) === false);
ok("B2 manifest records the exclusions", Array.isArray(b.founder_capsule.aggregate_exclusions) && b.founder_capsule.aggregate_exclusions.length === 2);
c = mkCap(); let bb = build(c); writeFileSync(join(c, "SYSTEM_STATE.json"), "TAMPERED"); ok("B3 tamper SYSTEM_STATE -> FAIL", aggFails(c, bb));
c = mkCap(); bb = build(c); writeFileSync(join(c, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"), JSON.stringify({ x: 1 })); ok("B4 tamper FINAL template -> FAIL", aggFails(c, bb));
c = mkCap(); bb = build(c); writeFileSync(join(c, "OPEN_RISKS.md"), "TAMPERED"); ok("B5 tamper a summary -> FAIL", aggFails(c, bb));
c = mkCap(); bb = build(c); writeFileSync(join(c, "EXTRA.json"), "x"); ok("B6 arbitrary extra file -> FAIL", aggFails(c, bb));
c = mkCap(); bb = build(c); writeFileSync(join(c, "checker-report.json"), "x"); ok("B7 checker-report inside capsule -> FAIL (reports must be external)", aggFails(c, bb));
c = mkCap(); bb = build(c); writeFileSync(join(c, "advisor-report.json"), "x"); ok("B8 advisor-report inside capsule -> FAIL", aggFails(c, bb));
c = mkCap(); bb = build(c); bb.founder_capsule.aggregate_exclusions = ["SYSTEM_STATE.json"]; ok("B9 altered declared exclusion list -> FAIL", aggFails(c, bb));

try { execFileSync("rm", ["-rf", base], { stdio: "ignore" }); } catch { /* */ }
console.log("\nLRCQ CAPSULE-DEPS SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
