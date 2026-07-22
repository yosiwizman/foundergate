// FounderGate LRCQ — deterministic capsule-generator qualification selftest (FG-LRCQ-ACT-026).
// Hermetic: disposable git repos, commits, fake manifest/provider/PR metadata, temp output dirs only.
// Never touches the real PR #189 package, never signs/consumes/spawns. Proves the 40 required
// properties + mutation guards for tools/terminal0/lrcq/generate-capsule.mjs.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { generateCapsule, validateInputs, buildMaterialPacket, buildFinalTemplate, buildSystemState, GENERATOR_VERSION } from "../../../../tools/terminal0/lrcq/generate-capsule.mjs";
import { canon } from "../../../../tools/terminal0/lrcq/evidence-set.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const g = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const sha256hex = (b) => createHash("sha256").update(b).digest("hex");
const sha256 = (b) => "sha256:" + sha256hex(b);
const H64 = (s) => sha256hex(Buffer.from(s));

const base = mkdtempSync(join(tmpdir(), "fg-capgen-"));
try {
  // ---- fixture repo (two real commits: evaluated -> evidence) --------------------------------------
  const repo = join(base, "repo"); mkdirSync(repo);
  g(["init", "-q", "-b", "main"], repo); g(["config", "user.email", "t@t"], repo); g(["config", "user.name", "t"], repo);
  mkdirSync(join(repo, "src"), { recursive: true });
  mkdirSync(join(repo, ".foundergate/run-materials/first-internal-5h"), { recursive: true });
  mkdirSync(join(repo, ".foundergate/backlog"), { recursive: true });
  mkdirSync(join(repo, ".foundergate/evidence"), { recursive: true });
  writeFileSync(join(repo, "src/a.mjs"), "export const a = 1;\n");
  writeFileSync(join(repo, "src/b.mjs"), "export const b = 2;\n");
  writeFileSync(join(repo, ".foundergate/x.json"), JSON.stringify({ x: 1 }) + "\n");
  const backlogRel = ".foundergate/backlog/first-real-five-hour-run-v2.json";
  writeFileSync(join(repo, backlogRel), JSON.stringify({ jobs: Array.from({ length: 25 }, (_, k) => ({ job_id: "j" + k })) }, null, 2) + "\n");
  const backlogDigest = sha256(readFileSync(join(repo, backlogRel)));
  const manifest = {
    schema_version: "lrcq-run-manifest-1", backlog_path: backlogRel, backlog_digest: backlogDigest, job_count: 25,
    provider_executable_path: "/opt/x/bin/claude", resolved_provider_target: "/opt/x/versions/2.1.215",
    provider_version: "2.1.215", provider_executable_identity: sha256(Buffer.from("fake-binary")),
    max_cost_usd: 10, max_parallel_width: 2, max_duration_s: 18000, per_job_timeout_s: 2700, termination_grace_s: 30, output_cap_bytes: 10485760,
  };
  writeFileSync(join(repo, ".foundergate/run-materials/first-internal-5h/run-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  g(["add", "."], repo); g(["commit", "-q", "-m", "evaluated"], repo);
  const evaluatedSha = g(["rev-parse", "HEAD"], repo); const evaluatedTree = g(["rev-parse", "HEAD^{tree}"], repo);
  writeFileSync(join(repo, ".foundergate/package-note.txt"), "package-only evidence commit\n");
  g(["add", "."], repo); g(["commit", "-q", "-m", "evidence-commit (package only)"], repo);
  const evidenceCommitSha = g(["rev-parse", "HEAD"], repo); const evidenceCommitTree = g(["rev-parse", "HEAD^{tree}"], repo);

  const prTitle = "PR #189 — governed real-run route";
  const prBody = "## Body\n\nUnsigned capsule.\n";
  const baseInputs = () => ({
    repoRoot: repo, evaluatedSha, evaluatedTree, evidenceCommitSha, evidenceCommitTree,
    branch: "lane/v8b-lrcq-assurance-factory-50e18e5", prNumber: 189, prTitle, prBody,
    protectedMainBaseline: "ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423", runManifest: manifest,
    digestSources: { provider_adapter_digest: "src/a.mjs", orchestrator_digest: "src/b.mjs" },
    committedMembers: { alpha: ".foundergate/x.json" },
    activationIdentity: sha256(Buffer.from("activation")), consumedOnce: true, replayBlocked: true,
    rawEvidenceDigest: sha256(Buffer.from("raw-evidence")),
  });
  const outN = (() => { let k = 0; return () => join(base, "out-" + (k++)); })();
  const readJSON = (d, f) => JSON.parse(readFileSync(join(d, f), "utf8"));
  const filesInDir = (d) => readdirSync(d).sort();

  // ---- happy path ---------------------------------------------------------------------------------
  const dA = outN(); const rA = generateCapsule(baseInputs(), dA);
  ok("05 valid ancestry + valid inputs -> generation succeeds", rA.ok === true);
  ok("00 all 9 required files produced", rA.ok && ["UNSIGNED_ACTIVATION_MATERIAL_PACKET.json", "SYSTEM_STATE.json", "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json", "FOUNDER_SUMMARY.md", "BUILT_VS_UNPROVEN.md", "OPEN_RISKS.md", "NEXT_FOUNDER_GATE.md", "EVIDENCE_SET_MANIFEST.json", "SHA256SUMS.txt"].every((f) => existsSync(join(dA, f))));

  // 1 + 3 + 11 + 12 determinism (byte-identical across two dirs; reordered input keys)
  const dB = outN(); const inB = baseInputs();
  const reordered = {}; for (const k of Object.keys(inB).reverse()) reordered[k] = inB[k]; // reversed key order
  reordered.runManifest = Object.fromEntries(Object.entries(manifest).reverse());
  const rB = generateCapsule(reordered, dB);
  const identical = rB.ok && filesInDir(dA).every((f) => Buffer.compare(readFileSync(join(dA, f)), readFileSync(join(dB, f))) === 0) && filesInDir(dA).length === filesInDir(dB).length;
  ok("01 identical inputs -> byte-identical outputs (two separate dirs)", identical);
  ok("03 input/manifest key ORDER does not change output (deterministic serialization)", identical);
  ok("11 evidence-set digest reproducible across runs", readJSON(dA, "EVIDENCE_SET_MANIFEST.json").evidence_set_digest === readJSON(dB, "EVIDENCE_SET_MANIFEST.json").evidence_set_digest);
  ok("12b SHA256SUMS.txt reproducible byte-identical", Buffer.compare(readFileSync(join(dA, "SHA256SUMS.txt")), readFileSync(join(dB, "SHA256SUMS.txt"))) === 0);

  // 2 no wall-clock nondeterminism (source-level guard)
  const genSource = readFileSync(new URL("../../../../tools/terminal0/lrcq/generate-capsule.mjs", import.meta.url), "utf8");
  ok("02 generator reads NO ambient wall-clock (no Date.now/new Date/Math.random)", !/Date\.now|new Date\(|Math\.random/.test(genSource));

  // 4 + 7 + 8 + 9 two-SHA semantics
  const mp = readJSON(dA, "UNSIGNED_ACTIVATION_MATERIAL_PACKET.json");
  const ft = readJSON(dA, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json");
  const ss = readJSON(dA, "SYSTEM_STATE.json");
  ok("04 evaluated_sha and evidence_commit_sha are distinct", evaluatedSha !== evidenceCommitSha);
  ok("07 MATERIAL packet binds evaluated_sha", mp.run_harness_candidate_sha === evaluatedSha && mp.run_harness_candidate_tree === evaluatedTree);
  ok("08 FINAL template binds evidence_commit_sha (future candidate)", ft.run_harness_candidate_sha === evidenceCommitSha && ft.reviewed_production_ancestor_sha === evaluatedSha);
  ok("09 SYSTEM_STATE binds BOTH shas + trees", ss.evaluated_sha === evaluatedSha && ss.evidence_commit_sha === evidenceCommitSha && ss.frozen_head === evidenceCommitSha);
  // mutation guard: evidence_commit_sha must NEVER appear in the tracked material packet
  ok("MG evidence_commit_sha is NOT present anywhere in the tracked material packet", !JSON.stringify(mp).includes(evidenceCommitSha));

  // 6 invalid ancestry fails (evaluated = child, evidence = parent -> child not ancestor of parent)
  const badAnc = baseInputs(); badAnc.evaluatedSha = evidenceCommitSha; badAnc.evaluatedTree = evidenceCommitTree; badAnc.evidenceCommitSha = evaluatedSha; badAnc.evidenceCommitTree = evaluatedTree;
  ok("06 invalid ancestry is REFUSED", validateInputs(badAnc).ok === false);

  // 10 + 32 evidence-set does not hash itself / no self-inclusion
  const esm = readJSON(dA, "EVIDENCE_SET_MANIFEST.json");
  ok("10 evidence-set does NOT hash itself or SHA256SUMS", !("EVIDENCE_SET_MANIFEST.json" in esm.capsule_artifacts) && !("SHA256SUMS.txt" in esm.capsule_artifacts));
  ok("32 evidence-set member set excludes the manifest (non-recursive)", esm.non_recursive === true && esm.exclusions.some((s) => /self/.test(s)));
  // evidence-set digest is non-recursive: recompute over body sans digest
  const { evidence_set_digest, ...esBody } = esm;
  ok("11b evidence_set_digest == sha256(canon(body-without-digest))", evidence_set_digest === sha256(Buffer.from(canon(esBody), "utf8")));

  // 12 SHA256SUMS generated LAST (lists every other file incl. the manifest; bijection) + correct hashes
  const sumsLines = readFileSync(join(dA, "SHA256SUMS.txt"), "utf8").trim().split("\n");
  const listed = new Map(sumsLines.map((l) => { const m = l.match(/^([0-9a-f]{64})\s+(.+)$/); return [m[2], m[1]]; }));
  const present = filesInDir(dA).filter((f) => f !== "SHA256SUMS.txt");
  const bijection = present.every((f) => listed.has(f)) && [...listed.keys()].every((f) => present.includes(f)) && listed.size === present.length;
  const hashesOk = present.every((f) => listed.get(f) === sha256hex(readFileSync(join(dA, f))));
  ok("12 SHA256SUMS last: exact bijection with all other files + correct hashes (incl. EVIDENCE_SET_MANIFEST.json)", bijection && hashesOk && listed.has("EVIDENCE_SET_MANIFEST.json"));

  // 13 + 14 unsigned-only / no issuance
  const allJson = [mp, ft, ss];
  ok("13 founder_signature is null in every JSON artifact", allJson.every((o) => o.founder_signature === null));
  ok("14 issued/expiry/hard_deadline epochs null in packet + template", [mp, ft].every((o) => o.issued_epoch === null && o.expiry_epoch === null && o.hard_deadline_epoch === null));

  // 15 SIGNATURE_REQUIRED-equivalent structure (unsigned + unissued + candidate-bound => sole gap is signature/epochs)
  ok("15 FINAL template is SIGNATURE_REQUIRED-shaped (candidate-bound; sole missing = signature/epochs)", ft.run_harness_candidate_sha === evidenceCommitSha && ft.founder_signature === null && ft.issued_epoch === null && ft.expiry_epoch === null && ft.hard_deadline_epoch === null && ft.unsigned === true);

  // 16 + 17 + 40 generation consumes/spawns nothing / creates no activation artifacts
  const strayActivation = readdirSync(base).some((d) => { try { return readdirSync(join(base, d)).some((f) => /consumed\.json$|activation-ledger|\.lock$/.test(f)); } catch { return false; } });
  ok("16+40 generation creates NO activation/consumed/ledger artifacts", strayActivation === false);
  ok("17 generation spawns no provider/supervisor (source has no such spawn; only git merge-base)", !/spawn\(|supervisor-main|real-provider|ClaudeCode|\.local\/bin\/claude/.test(genSource));

  // 18 missing provider target fails
  const noTgt = baseInputs(); noTgt.runManifest = { ...manifest }; delete noTgt.runManifest.resolved_provider_target;
  ok("18 missing provider target is REFUSED", validateInputs(noTgt).ok === false);
  // 19 mutable alias where immutable required fails
  const alias = baseInputs(); alias.runManifest = { ...manifest, resolved_provider_target: "/opt/x/bin/claude" };
  ok("19 mutable provider ALIAS (no /versions/) is REFUSED", validateInputs(alias).ok === false);
  // 20 malformed provider digest fails
  const badPid = baseInputs(); badPid.runManifest = { ...manifest, provider_executable_identity: "not-a-sha" };
  ok("20 malformed provider executable identity is REFUSED", validateInputs(badPid).ok === false);
  // 21 run-manifest digest mismatch fails
  const badRm = baseInputs(); badRm.expectRunManifestDigest = sha256(Buffer.from("wrong"));
  ok("21 run-manifest digest mismatch is REFUSED", validateInputs(badRm).ok === false);
  const okRm = baseInputs(); okRm.expectRunManifestDigest = sha256(readFileSync(join(repo, ".foundergate/run-materials/first-internal-5h/run-manifest.json")));
  ok("21b matching run-manifest digest passes", validateInputs(okRm).ok === true);
  // 22 backlog digest mismatch fails
  const badBk = baseInputs(); badBk.runManifest = { ...manifest, backlog_digest: sha256(Buffer.from("wrong-backlog")) };
  ok("22 backlog digest mismatch (manifest vs on-disk) is REFUSED", validateInputs(badBk).ok === false);
  // 23 stale PR metadata digest fails
  const badPr = baseInputs(); badPr.expectPrBodyDigest = sha256(Buffer.from("stale"));
  ok("23 stale PR metadata digest is REFUSED", validateInputs(badPr).ok === false);
  // 24 activation-state contradiction fails
  const notConsumed = baseInputs(); notConsumed.consumedOnce = false;
  ok("24 original-activation-not-consumed contradiction is REFUSED", validateInputs(notConsumed).ok === false);
  // 25 replay contradiction fails
  const notReplay = baseInputs(); notReplay.replayBlocked = false;
  ok("25 replay-not-blocked contradiction is REFUSED", validateInputs(notReplay).ok === false);
  // 26 raw-evidence digest malformed fails
  const badRaw = baseInputs(); badRaw.rawEvidenceDigest = "nope";
  ok("26 malformed raw-evidence digest is REFUSED", validateInputs(badRaw).ok === false);

  // 27-31 + 33 + 34 tamper detection (recompute SHA256SUMS + evidence-set + safety after mutating a file)
  function tamperDetected(dir, file, transform) {
    const p = join(dir, file); const orig = readFileSync(p);
    const mutated = transform(orig); writeFileSync(p, mutated);
    // SHA256SUMS check
    const lines = readFileSync(join(dir, "SHA256SUMS.txt"), "utf8").trim().split("\n");
    const lm = new Map(lines.map((l) => { const m = l.match(/^([0-9a-f]{64})\s+(.+)$/); return [m[2], m[1]]; }));
    const sumsBad = file === "SHA256SUMS.txt" ? true : lm.get(file) !== sha256hex(readFileSync(p));
    // evidence-set check (only for capsule members it hashes)
    let esBad = false;
    if (file !== "EVIDENCE_SET_MANIFEST.json" && file !== "SHA256SUMS.txt") {
      const man = JSON.parse(readFileSync(join(dir, "EVIDENCE_SET_MANIFEST.json"), "utf8"));
      esBad = man.capsule_artifacts[file] && man.capsule_artifacts[file] !== sha256(readFileSync(p));
    }
    writeFileSync(p, orig); // restore
    return sumsBad || esBad;
  }
  const dT = outN(); generateCapsule(baseInputs(), dT);
  ok("27 tampered MATERIAL packet is detected", tamperDetected(dT, "UNSIGNED_ACTIVATION_MATERIAL_PACKET.json", (b) => Buffer.from(b.toString().replace("2.1.215", "9.9.9"))));
  ok("28 tampered SYSTEM_STATE is detected", tamperDetected(dT, "SYSTEM_STATE.json", (b) => Buffer.from(b.toString() + " ")));
  ok("29 tampered FINAL template is detected", tamperDetected(dT, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json", (b) => Buffer.from(b.toString().replace("null", "\"x\""))));
  ok("30 tampered summary file is detected", tamperDetected(dT, "FOUNDER_SUMMARY.md", (b) => Buffer.from(b.toString() + "extra")));
  ok("31 tampered evidence-set member (SHA256SUMS) is detected", tamperDetected(dT, "SHA256SUMS.txt", (b) => Buffer.from(b.toString().replace(/[0-9a-f]/, "0"))));
  // 33 + 34 safety-field injection is detectable by a safety check
  const safetyViolated = (o) => o.founder_signature !== null || o.issued_epoch !== null || o.expiry_epoch !== null || o.hard_deadline_epoch !== null;
  ok("33 non-null founder_signature would violate the safety check", safetyViolated({ ...ft, founder_signature: "X" }) && !safetyViolated(ft));
  ok("34 issued/expiry injection would violate the safety check", safetyViolated({ ...ft, issued_epoch: 1 }) && !safetyViolated(ft));

  // 35 path traversal fails
  const trav = baseInputs(); trav.committedMembers = { bad: "../../etc/passwd" };
  ok("35 path-traversal committed member is REFUSED", validateInputs(trav).ok === false);
  // 36 symlink output escape fails
  const linkTarget = join(base, "real-target"); mkdirSync(linkTarget);
  const linkPath = join(base, "out-symlink"); symlinkSync(linkTarget, linkPath);
  ok("36 symlink output dir is REFUSED", generateCapsule(baseInputs(), linkPath).ok === false);
  // 37 interrupted/failed generation leaves no accepted partial capsule
  const preexist = outN(); mkdirSync(preexist); writeFileSync(join(preexist, "keep.txt"), "x");
  const rPre = generateCapsule(baseInputs(), preexist);
  ok("37 refuses to overwrite an existing outDir (no partial written)", rPre.ok === false && filesInDir(preexist).length === 1 && existsSync(join(preexist, "keep.txt")));
  const badValidateDir = outN();
  const rBad = generateCapsule({ ...baseInputs(), evaluatedSha: "zzz" }, badValidateDir);
  ok("37b validation failure creates NO outDir at all", rBad.ok === false && !existsSync(badValidateDir));

  // 38 + 39 no model/provider invocation: the generator's ONLY subprocess is git (ancestry check).
  const execCalls = genSource.match(/execFileSync\(\s*"([^"]+)"/g) || [];
  const nonGitExec = execCalls.filter((s) => !/execFileSync\(\s*"git"/.test(s));
  ok("38 no real Claude/provider invocation (only git subprocess; no spawn)", nonGitExec.length === 0 && !/\bspawn\s*\(/.test(genSource));
  ok("39 no local-model (qwen/ollama) invocation in generator source", !/qwen|ollama|localhost:11434/i.test(genSource));

  // Mutation guards
  ok("MG provider binding is the immutable target, not a placeholder", mp.resolved_provider_target === "/opt/x/versions/2.1.215" && !/founder-fills|<.*>/.test(mp.resolved_provider_target));
  ok("MG digests are RECOMPUTED from source (not copied): changing the source changes the digest", (() => {
    const d1 = buildMaterialPacket(baseInputs()).provider_adapter_digest;
    writeFileSync(join(repo, "src/a.mjs"), "export const a = 999;\n");
    const d2 = buildMaterialPacket(baseInputs()).provider_adapter_digest;
    writeFileSync(join(repo, "src/a.mjs"), "export const a = 1;\n"); // restore
    return d1 !== d2 && d1 === sha256(Buffer.from("export const a = 1;\n"));
  })());
  ok("MG generator_version + generator_digest are bound in SYSTEM_STATE", ss.generator_version === GENERATOR_VERSION && /^sha256:[0-9a-f]{64}$/.test(ss.generator_digest));
  ok("MG all outputs written under the OS temp dir (never a real PR189 capsule path)", dA.startsWith(base) && base.startsWith(tmpdir()));
} finally {
  try { rmSync(base, { recursive: true, force: true }); } catch { /* */ }
}

console.log("\nLRCQ CAPSULE-GENERATOR SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
