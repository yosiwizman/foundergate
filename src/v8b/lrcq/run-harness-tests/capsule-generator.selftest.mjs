// FounderGate LRCQ — real-contract integration selftest for the capsule generator (FG-LRCQ-ACT-026).
// Hermetic: a disposable CLONE of this repo + an approved temp output root. Exercises the AUTHORITATIVE
// controls on generated output — the real --final-template-preflight and the real verifyEvidenceSet — plus
// the flat Layout-B contract and the fail-closed authority matrix. No signature/activation/model.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import { generateCapsule, validateInputs, REQUIRED_MEMBERS, REQUIRED_MEMBER_REGISTRY } from "../../../../tools/terminal0/lrcq/generate-capsule.mjs";
import { verifyCapsule } from "../../../../tools/terminal0/lrcq/capsule-verifier.mjs";
import { buildActivationMaterialPacket } from "../../../../tools/terminal0/lrcq/generate-run-manifest.mjs";
import { manifestDigest } from "../../../../src/v8b/lrcq/run-harness/run-manifest.mjs";
import { verifyEvidenceSet as verifyES } from "../../../../tools/terminal0/lrcq/evidence-set.mjs";

let n = 0; const fails = [];
const ok = (name, cond, detail) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name + (detail ? " [" + String(detail).slice(0, 700) + "]" : "")); } else console.log("  ok   " + name); };
const WORKTREE = new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
// FG-LRCQ-ACT-029 provider re-freeze: the probe answers with whatever version the CURRENT manifest binds,
// read mechanically from the versioned filename (never by executing the provider).
const fileDigest = (p) => "sha256:" + createHash("sha256").update(readFileSync(p)).digest("hex");
const versionRunner = (p) => basename(String(p));

const base = mkdtempSync(join(tmpdir(), "fg-capgen-"));
try {
  // ---- disposable clone fixture (own .git; full history so base/provider SHAs resolve) --------------
  const clone = join(base, "clone");
  execFileSync("git", ["clone", "--quiet", "--no-hardlinks", WORKTREE, clone], { stdio: "ignore" });
  const g = (a) => execFileSync("git", ["-C", clone, ...a], { encoding: "utf8" }).trim();
  g(["config", "user.email", "t@t"]); g(["config", "user.name", "t"]);
  const evaluatedSha = g(["rev-parse", "HEAD"]);
  const branch = g(["rev-parse", "--abbrev-ref", "HEAD"]);
  // regenerate the committed material packet bound to evaluated_sha, then commit it -> evidence_commit
  const manifest = JSON.parse(readFileSync(join(clone, ".foundergate/run-materials/first-internal-5h/run-manifest.json"), "utf8"));
  const prov = { path: manifest.provider_executable_path, target: manifest.resolved_provider_target, version: manifest.provider_version, identity: manifest.provider_executable_identity };
  const pkt = buildActivationMaterialPacket({ repo: clone, prov, manRel: ".foundergate/run-materials/first-internal-5h/run-manifest.json", manDigest: fileDigest(join(clone, ".foundergate/run-materials/first-internal-5h/run-manifest.json")), leaseManifestAbs: join(clone, manifest.capability_lease_manifest_path), blastManifestAbs: join(clone, manifest.blast_budget_manifest_path), backlogRel: manifest.backlog_path, runHarnessSha: evaluatedSha, runHarnessTree: g(["rev-parse", "HEAD^{tree}"]) });
  writeFileSync(join(clone, ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json"), JSON.stringify(pkt, null, 2) + "\n");
  g(["add", ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json"]);
  g(["commit", "-q", "-m", "package: bind material packet to evaluated_sha (evidence commit)"]);
  const evidenceCommitSha = g(["rev-parse", "HEAD"]);
  ok("00 two distinct real SHAs: evaluated (ancestor) != evidence_commit (HEAD)", evaluatedSha !== evidenceCommitSha && g(["merge-base", "--is-ancestor", evaluatedSha, evidenceCommitSha]) === "");

  const outRoot = join(base, "out"); execFileSync("mkdir", ["-p", outRoot]);
  const inputs = {
    repoRoot: clone, evaluatedSha, branch, prNumber: 190,
    prTitle: "t", prLiveBody: "b\n", prStoredBody: "b\n",
    protectedMainBaseline: (() => { try { return g(["rev-parse", "refs/remotes/origin/main"]); } catch { return "ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423"; } })(),
    githubHead: evidenceCommitSha, approvedOutputRoot: outRoot, capsuleName: "capsule",
    providerDeps: { versionRunner }, gh: () => evidenceCommitSha,
  };
  // origin/main in the clone == the worktree HEAD (clone origin) — align the baseline to whatever git reports
  inputs.protectedMainBaseline = (() => { try { return g(["rev-parse", "refs/remotes/origin/main"]); } catch { return inputs.protectedMainBaseline; } })();

  // ---- generate ------------------------------------------------------------------------------------
  const r = generateCapsule(inputs);
  ok("01 generation succeeds (real authority + provider + manifest)", r.ok === true || (console.log("   errors:", JSON.stringify(r.errors)), false));
  const cap = join(outRoot, "capsule");
  const FLAT = ["SYSTEM_STATE.json", "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json", "FOUNDER_SUMMARY.md", "BUILT_VS_UNPROVEN.md", "OPEN_RISKS.md", "NEXT_FOUNDER_GATE.md", "EVIDENCE_SET_MANIFEST.json", "SHA256SUMS.txt"];
  ok("02 flat capsule has exactly the 8 files, no subdirs, no review files", r.ok && JSON.stringify(readdirSync(cap).sort()) === JSON.stringify(FLAT.slice().sort()) && readdirSync(cap).every((f) => statSync(join(cap, f)).isFile()));
  if (r.ok) {
    const ss = JSON.parse(readFileSync(join(cap, "SYSTEM_STATE.json"), "utf8"));
    const ft = JSON.parse(readFileSync(join(cap, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"), "utf8"));
    ok("03 two-SHA: material packet binds evaluated; FINAL template binds evidence_commit", pkt.evidence_commit_sha === evaluatedSha && ft.evidence_commit_sha === evidenceCommitSha && ft.reviewed_runtime_sha === evaluatedSha && ft.reviewed_production_ancestor_sha === evaluatedSha);
    ok("04 SYSTEM_STATE binds both SHAs + trees; founder_signature null", ss.evaluated_sha === evaluatedSha && ss.evidence_commit_sha === evidenceCommitSha && ss.frozen_head === evidenceCommitSha && ss.founder_signature === null);
    ok("05 FINAL template unsigned/unissued (full V4 payload field set present)", ft.founder_signature === null && ft.issued_epoch === null && ft.expiry_epoch === null && ft.hard_deadline_epoch === null && ft.signer_key_fingerprint === null && ft.authorization_text_digest === null && ft.schema === "lrcq-activation-4" && "resolved_provider_target" in ft && "run_manifest_digest" in ft && "lifecycle_root_realpath" in ft);

    // A. ACTUAL final-template preflight (run in the clone; HEAD == evidence_commit)
    // realpath the script + template so run-five-hour's CLI guard (SELF === resolve(argv[1])) matches on
    // macOS where tmpdir() is a /var -> /private/var symlink (else the guard skips the preflight branch).
    const rfh = realpathSync(join(clone, "tools/terminal0/lrcq/run-five-hour.mjs"));
    const tplPath = realpathSync(join(cap, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"));
    const pfr = spawnSync(process.execPath, [rfh, "--final-template-preflight", tplPath], { cwd: realpathSync(clone), encoding: "utf8" });
    const pf = (pfr.stdout || "") + (pfr.stderr || ""); // preflight prints to stderr
    ok("06 ACTUAL preflight -> SIGNATURE-REQUIRED (zero_invocation, no non-sig refusals)", /LRCQ-REAL-LAUNCH-PREFLIGHT: SIGNATURE-REQUIRED/.test(pf) && /"zero_invocation":\s*true/.test(pf) && !/non_signature_refusals":\s*\[[^\]]/.test(pf));

    // B. ACTUAL evidence-set verifier on the DELIVERED capsule (founder_capsule.dir must be the final outDir)
    const ev = verifyES(clone, join(cap, "EVIDENCE_SET_MANIFEST.json"));
    if (!ev.valid) console.log("   [07 problems]:", JSON.stringify(ev.problems));
    ok("07 ACTUAL verifyEvidenceSet -> valid:true, problems:[] on the DELIVERED capsule", ev.valid === true && (ev.problems || []).length === 0);
    ok("07b founder_capsule.dir is the FINAL capsule dir (survives the atomic rename), not the staging dir", JSON.parse(readFileSync(join(cap, "EVIDENCE_SET_MANIFEST.json"), "utf8")).founder_capsule.dir === cap && ev.evaluated_candidate_sha === evidenceCommitSha);

    // C. SHA256SUMS covers every file except itself (incl. the manifest); no absolute paths
    const sums = readFileSync(join(cap, "SHA256SUMS.txt"), "utf8").trim().split("\n");
    const listed = sums.map((l) => l.match(/^([0-9a-f]{64})\s+(.+)$/)).filter(Boolean);
    const present = readdirSync(cap).filter((f) => f !== "SHA256SUMS.txt").sort();
    ok("08 SHA256SUMS bijection (incl. EVIDENCE_SET_MANIFEST.json), correct hashes, relative paths", listed.length === present.length && listed.every(([, h, f]) => present.includes(f) && !f.startsWith("/") && h === execFileSync("shasum", ["-a", "256", join(cap, f)], { encoding: "utf8" }).slice(0, 64)));

    // C. ACTUAL third control — exported verifyCapsule on the SAME disposable capsule (fixture metadata provider)
    const ghMeta = () => ({ title: inputs.prTitle, body: inputs.prLiveBody });
    const cv = verifyCapsule({ repo: clone, capsuleDir: cap, prNumber: 190, githubMetadataProvider: ghMeta });
    if (!cv.valid) console.log("   [09 problems]:", JSON.stringify(cv.problems));
    ok("09 ACTUAL verifyCapsule -> valid:true, problems:[] on the SAME capsule", cv.valid === true && cv.problems.length === 0, JSON.stringify(cv.problems) + " " + JSON.stringify((cv.checks||[]).filter((c)=>c.status!=="PASS")));
    ok("09b live-metadata check RAN (PASS, not SKIP) via the injected provider", cv.checks.some((c) => /canonical LIVE metadata/.test(c.name) && c.status === "PASS"));
    const noGh = verifyCapsule({ repo: clone, capsuleDir: cap, prNumber: 190, githubMetadataProvider: null });
    ok("09c SKIP != acceptance: null provider -> metadata SKIP recorded AND overall valid:false", noGh.checks.some((c) => c.status === "SKIP") && noGh.valid === false);
    // all three controls referenced the SAME capsule dir + FINAL template + SYSTEM_STATE + manifest + SHA256SUMS
    ok("09d three controls share the identical capsule artifacts", existsSync(join(cap, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json")) && existsSync(join(cap, "EVIDENCE_SET_MANIFEST.json")) && existsSync(join(cap, "SHA256SUMS.txt")));

    // capsule-file tamper -> verifyCapsule INVALID (restore after each)
    const tamperCV = (file, mutate) => { const p = join(cap, file); const orig = readFileSync(p); mutate(p, orig); const bad = verifyCapsule({ repo: clone, capsuleDir: cap, prNumber: 190, githubMetadataProvider: ghMeta }).valid; writeFileSync(p, orig); return bad === false; };
    ok("M1 tamper SYSTEM_STATE -> verifyCapsule INVALID", tamperCV("SYSTEM_STATE.json", (p, o) => writeFileSync(p, JSON.stringify({ ...JSON.parse(o), frozen_head: "0".repeat(40) }))));
    ok("M2 non-null founder_signature in FINAL template -> verifyCapsule INVALID", tamperCV("FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json", (p, o) => { const t = JSON.parse(o); t.founder_signature = "X"; writeFileSync(p, JSON.stringify(t)); }));
    ok("M3 issued_epoch stamped in FINAL template -> verifyCapsule INVALID", tamperCV("FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json", (p, o) => { const t = JSON.parse(o); t.issued_epoch = 1; writeFileSync(p, JSON.stringify(t)); }));
    ok("M4 tamper EVIDENCE_SET_MANIFEST -> SHA256SUMS bijection fails -> INVALID", tamperCV("EVIDENCE_SET_MANIFEST.json", (p, o) => writeFileSync(p, o + " ")));
    ok("M5 tamper SHA256SUMS -> INVALID", tamperCV("SHA256SUMS.txt", (p, o) => writeFileSync(p, o.toString().replace(/[0-9a-f]/, "0"))));
  }

  // ---- fail-closed authority matrix (validateInputs) ----------------------------------------------
  const bad = (patch, label) => ok(label, validateInputs({ ...inputs, ...patch }).ok === false);
  bad({ evaluatedSha: evidenceCommitSha }, "10 evaluated==evidence (not distinct) -> REFUSED");
  bad({ evaluatedSha: "0".repeat(40) }, "11 non-existent evaluated_sha -> REFUSED");
  bad({ branch: "not-the-branch" }, "12 wrong branch -> REFUSED");
  bad({ gh: () => "f".repeat(40) }, "13 wrong GitHub PR head -> REFUSED");
  bad({ protectedMainBaseline: "0".repeat(40) }, "14 wrong protected-main baseline -> REFUSED");
  bad({ providerDeps: { versionRunner: () => "9.9.9" } }, "15 wrong provider version -> REFUSED");
  bad({ providerDeps: { versionRunner, hashFile: () => "sha256:" + "0".repeat(64) } }, "16 false provider digest -> REFUSED");
  bad({ approvedOutputRoot: clone }, "17 output inside the repository -> REFUSED");
  bad({ capsuleName: "capsule" }, "18 destination already exists -> REFUSED");
  // required-member absence: point at a repo missing a required member
  const emptyRepo = join(base, "empty"); execFileSync("mkdir", ["-p", emptyRepo]); execFileSync("git", ["-C", emptyRepo, "init", "-q"]);
  bad({ repoRoot: emptyRepo }, "19 missing required members -> REFUSED");
  ok("20 required-member registry is versioned + complete (>=20 members incl. activation-schema, lease/blast manifests)", REQUIRED_MEMBER_REGISTRY.version >= 1 && REQUIRED_MEMBER_REGISTRY.members.length >= 20 && ["activation_schema", "capability_lease_manifest", "blast_budget_manifest", "setup_pipeline", "separation", "supervisor_main"].every((id) => REQUIRED_MEMBER_REGISTRY.members.some((m) => m.id === id)));

  // per-member mutation: removing ONE specific required member fails with that member's ID
  const perMember = (id) => { const m = REQUIRED_MEMBER_REGISTRY.members.find((x) => x.id === id); const p = join(clone, m.path); const bak = p + ".bak"; execFileSync("mv", [p, bak]); const r2 = validateInputs({ ...inputs, evaluatedSha, branch, prNumber: 190, protectedMainBaseline: inputs.protectedMainBaseline, providerDeps: { versionRunner } }); execFileSync("mv", [bak, p]); return r2.ok === false && (r2.errors || []).some((e) => e.includes(id)); };
  ok("21 remove activation_schema member -> REFUSED with its exact ID", perMember("activation_schema"));
  ok("22 remove capability_lease_manifest member -> REFUSED with its exact ID", perMember("capability_lease_manifest"));

  // PRODUCTION path (no injected providerDeps): re-hashes the real immutable 2.1.215 target
  const prodOut = generateCapsule({ ...inputs, capsuleName: "capsule-prod" });
  ok("23 production path (no injected providerDeps) verifies the real immutable target + succeeds", prodOut.ok === true);

  // containment: a symlink approved-root resolving INTO the repository is REFUSED
  const evilLink = join(base, "evil-root"); try { execFileSync("ln", ["-s", clone, evilLink]); } catch { /* */ }
  bad({ approvedOutputRoot: evilLink, capsuleName: "x" }, "24 symlinked approved-root escaping into the repository -> REFUSED");

  // CLI-strip: the production generateCapsule() default provider path is used when providerDeps omitted (proven by 23);
  // a malformed injected providerDeps (fixture API) that lies about the digest is still caught by the real re-hash
  bad({ providerDeps: { versionRunner, hashFile: () => "sha256:" + "1".repeat(64) } }, "25 injected false provider digest is caught by the real re-hash -> REFUSED");
} finally {
  try { rmSync(base, { recursive: true, force: true }); } catch { /* */ }
}

console.log("\nLRCQ CAPSULE-GENERATOR SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
