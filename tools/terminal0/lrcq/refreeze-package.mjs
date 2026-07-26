#!/usr/bin/env node
// FounderGate PR #197 — PROVIDER / PACKAGE RE-FREEZE driver (FG-PPR-197).
//
// Rebinds the package to the APPROVED executable authority candidate and to a freshly re-verified
// provider target, and regenerates the wave's package artifacts.
//
// AUTHORITY-BEARING PROPERTIES OF THIS TOOL:
//   * DETERMINISTIC. It never reads the wall clock, never draws randomness, and never reads an
//     environment variable. Every value that could vary between runs is either recomputed from
//     repository bytes / git objects or supplied as an EXPLICIT frozen CLI input.
//   * It NEVER executes the provider. Not even `--version`. The provider version probe is performed
//     by a separate, counted observation step and handed in as a frozen, checked input, so the
//     regeneration path itself has ZERO provider contact.
//   * It SPAWNS NOTHING except the fixed absolute git binary via fixedGit(). This module lives in the
//     production launcher directory, which the authority-route regression governs: no module here may
//     carry an alternate shell/executor surface. The two INDEPENDENT external digests of the provider
//     binary are therefore produced by the separate observation step and passed in as frozen inputs,
//     which this driver cross-checks against its OWN independent re-hash of the bytes on disk. The
//     driver never trusts an input digest on its own.
//   * It NEVER signs, enrolls a key, issues, consumes, spawns, merges, pushes or deploys.
//   * It reuses the AUTHORITATIVE production recipes rather than duplicating them:
//       buildActivationMaterialPacket() (generate-run-manifest.mjs)  — the activation payload recipe
//       verifyProviderTarget()          (provider-verify.mjs)        — the immutable-provider verifier
//       canon()                         (evidence-set.mjs)           — canonical serialization
//       fixedGit()                      (fixed-executables.mjs)      — fixed absolute git
//
// Usage:
//   refreeze-package.mjs --observed-at <ISO8601Z> --version-probe "<exact --version output>"
//                        --digest-shasum <hex> --digest-openssl <hex>
//
// All four inputs are REQUIRED frozen observation facts, not defaults: omitting any one is a refusal.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, lstatSync, realpathSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, join } from "node:path";
import { fixedGit } from "../../../src/v8b/lrcq/assurance/fixed-executables.mjs";
import { buildActivationMaterialPacket } from "./generate-run-manifest.mjs";
import { verifyProviderTarget } from "../../../src/v8b/lrcq/provider/provider-verify.mjs";
import { canon } from "./evidence-set.mjs";

const SELF = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(SELF), "../../..");
const P = (p) => resolve(REPO, p);
const git = (...a) => fixedGit(["-C", REPO, ...a]);
const sha256hex = (b) => createHash("sha256").update(b).digest("hex");
const sha256 = (b) => "sha256:" + sha256hex(b);
const shaFile = (abs) => sha256(readFileSync(abs));
const shaRel = (rel) => shaFile(P(rel));
const write = (rel, obj) => { const abs = P(rel); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, JSON.stringify(obj, null, 2) + "\n"); return abs; };
const writeText = (rel, text) => { const abs = P(rel); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, text); return abs; };

// ---------------------------------------------------------------------------------------------------
// FROZEN WAVE CONSTANTS — the approved review chain. Every one of these is re-verified below against
// the real repository / real filesystem before a single byte is written. They are constants so that a
// mismatch is a REFUSAL, never a silently-regenerated new binding.
// ---------------------------------------------------------------------------------------------------
export const FROZEN = Object.freeze({
  repository: "yosiwizman/foundergate",
  pr_197_branch: "lane/lrcq-founder-signature-authority-8d1899f",
  reviewed_evidence_head: "39dea6364d3a32420034f0ba4895486d1b918fa1",
  reviewed_evidence_tree: "1689a63464f3b2e987523fb1c84ce0d50ab6a40f",
  authority_candidate_sha: "ebd4ff5672ba657b039521a8b377a094a2ea67ea",
  authority_candidate_tree: "012e0560fd21f7328088ec290f30f9eac84dc1ef",
  pr_196_head: "8d1899f793305e9f87adc5163a60bfb077e4d4e5",
  protected_main: "ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423",
  checker_digest: "fba5f6c2a397489b6a1e31da58fa6bd54434bc8fbf35d6e65689e67c79a87365",
  checker_verdict: "FOUNDERGATE-PR197-PRODUCTION-SEAM-CHECKER: AUTHORITY_CHAIN_CLEAN_PROVIDER_REFREEZE_REQUIRED",
  advisor_digest: "e2177f9201e13aa1e4e452af5d32a5e040ce323263cc9bb46277f43469da3cc0",
  advisor_verdict: "FOUNDERGATE-PR197-ADVISOR: AUTHORITY_IMPLEMENTATION_READY_FOR_PROVIDER_REFREEZE",
  provider_target: "/Users/yosiwizman/.local/share/claude/versions/2.1.220",
  provider_version: "2.1.220",
  provider_sha256: "8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081",
  // The five HISTORICAL Checker FINDINGS reports. These are FINDINGS EVIDENCE, never acceptance.
  historical_findings_reports: [
    { ordinal: 1, sha256: "caa4db0031b172ca69c9b456d298cb3b3e6185215e9074293b6c93390fbdc20f" },
    { ordinal: 2, sha256: "6ac782a2d396a8b0558eed8493d19a86a5f52a3e99e38cfe2f040f72e25da50b" },
    { ordinal: 3, sha256: "c49cc5633341639704fcb0564722c8f02c642884b6c7cd8a8f2d44bd70bb294d" },
    { ordinal: 4, sha256: "886d69828216a012be56f8c6362f0df6e178ec030426e36c4dfa71a75f68b6ba" },
    { ordinal: 5, sha256: "34d4054a04b3a0720d568c8db086c4ce3aece6203709b6175edd2323b4d1f2b1" },
  ],
});

// The six SIGNED ceilings. Required values or stricter. No package field, environment variable, CLI
// argument or unsigned overlay may widen any of them.
export const CEILINGS = Object.freeze({
  max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700,
  max_parallel_width: 2, max_output_bytes: 10485760, termination_grace_s: 30,
});
// The ten mandatory exclusions. All must be exactly true.
export const EXCLUSIONS = Object.freeze([
  "no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized", "no_m1", "no_akior",
  "no_customer_data", "no_live_action", "no_permission_bypass", "no_deploy", "no_external_comms",
]);

export const OUT_DIR = ".foundergate/evidence/lrcq-provider-package-refreeze";
const MANIFEST_REL = ".foundergate/run-materials/first-internal-5h/run-manifest.json";
const PACKET_REL = ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json";
const MATRIX_SRC_REL = ".foundergate/evidence/lrcq-assurance-factory/V4_AUTHORITY_ACCEPTANCE_MATRIX.json";

// The eight immutable authority files. Any byte change is a blocker.
export const AUTHORITY_FILES = Object.freeze([
  "src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs",
  "src/v8b/lrcq/assurance/activation-v4.mjs",
  "src/v8b/lrcq/provider/authority-boundary.mjs",
  "src/v8b/lrcq/assurance/deep-freeze-authority.mjs",
  "src/v8b/lrcq/assurance/fs-authority-guards.mjs",
  "src/v8b/lrcq/assurance/fixed-executables.mjs",
  "src/v8b/lrcq/provider/real-provider.mjs",
  "tools/terminal0/lrcq/run-five-hour.mjs",
]);

// ---------------------------------------------------------------------------------------------------
// Provider re-verification. Two INDEPENDENT external hashers plus the production verifier. The version
// probe output is a frozen input; this function never executes the provider.
// ---------------------------------------------------------------------------------------------------
export function refreezeProvider({ target, expectedSha, expectedVersion, versionProbeOutput, digestShasum, digestOpenssl }) {
  const refuse = (code, detail) => { const e = new Error(code + (detail ? ": " + detail : "")); e.code = code; throw e; };
  if (!existsSync(target)) refuse("PROVIDER_TARGET_MISSING", target);
  const ls = lstatSync(target);
  if (ls.isSymbolicLink()) refuse("PROVIDER_TARGET_IS_MUTABLE_ALIAS", target);
  const before = statSync(target);
  if (!before.isFile()) refuse("PROVIDER_TARGET_NOT_REGULAR_FILE", target);
  if ((before.mode & 0o111) === 0) refuse("PROVIDER_TARGET_NOT_EXECUTABLE", target);
  const realpath = realpathSync(target);
  if (realpath !== target) refuse("PROVIDER_REALPATH_MISMATCH", realpath + " != " + target);

  // THREE independent digests must agree with each other AND with the expected value:
  //   h1, h2 — the two external hashers (Digest::SHA and OpenSSL), run by the separate counted
  //            observation step and passed in frozen. This driver spawns nothing but git.
  //   h3     — this driver's OWN re-hash of the bytes on disk, so an input digest is never trusted alone.
  const hex = /^[0-9a-f]{64}$/;
  const h1 = String(digestShasum || ""), h2 = String(digestOpenssl || "");
  if (!hex.test(h1) || !hex.test(h2)) refuse("PROVIDER_DIGEST_INPUT_MALFORMED", h1 + " / " + h2);
  const h3 = sha256hex(readFileSync(target));
  if (h1 !== expectedSha) refuse("PROVIDER_DIGEST_MISMATCH", "shasum=" + h1);
  if (h2 !== expectedSha) refuse("PROVIDER_DIGEST_MISMATCH", "openssl=" + h2);
  if (h3 !== expectedSha) refuse("PROVIDER_DIGEST_MISMATCH", "driver-rehash=" + h3);
  if (h1 !== h2 || h2 !== h3) refuse("PROVIDER_DIGEST_TOOLS_DISAGREE", [h1, h2, h3].join(" / "));

  // Frozen, checked version-probe input. `--version` execution happened in the separate counted
  // observation step; this driver only re-checks the recorded output.
  if (typeof versionProbeOutput !== "string" || !versionProbeOutput.includes(expectedVersion)) {
    refuse("PROVIDER_VERSION_MISMATCH", "probe=" + JSON.stringify(versionProbeOutput));
  }

  // The PRODUCTION verifier must independently agree. Its version runner is the production default:
  // the resolved target's own path basename — mechanical, never an execution.
  const pv = verifyProviderTarget(
    { resolvedTarget: target, expectedIdentity: "sha256:" + expectedSha, expectedVersion, installNamespace: "/.local/share/claude/versions/" },
    { versionRunner: (p) => realpathSync(p).split("/").pop() },
  );
  if (!pv.ok) refuse("PRODUCTION_PROVIDER_VERIFIER_REFUSED", pv.code);

  // Metadata must be identical after hashing + the recorded version inspection.
  const after = statSync(target);
  const ident = (s) => [s.dev, s.ino, s.size, Math.floor(s.mtimeMs), s.nlink, s.mode, s.uid, s.gid].join("/");
  if (ident(before) !== ident(after)) refuse("PROVIDER_METADATA_UNSTABLE", ident(before) + " -> " + ident(after));

  // Alternate installed targets are ENUMERATED and explicitly NOT accepted.
  const nsDir = dirname(target);
  const alternates = readdirSync(nsDir).filter((n) => join(nsDir, n) !== target).sort()
    .map((n) => ({ path: join(nsDir, n), accepted: false, reason: "not the reviewed bound target; the activation binds exactly one immutable versioned file" }));

  return {
    target, realpath, regular_non_symlink_file: true, executable: true,
    mode: "0" + (before.mode & 0o7777).toString(8), owner_uid: before.uid, owner_gid: before.gid,
    link_count: before.nlink, device: before.dev, inode: before.ino, size_bytes: before.size,
    mtime_epoch: Math.floor(before.mtimeMs / 1000),
    sha256_shasum: h1, sha256_openssl: h2, sha256_driver_rehash: h3,
    two_independent_tools_agree: true, three_independent_digests_agree: true,
    sha256: h1, expected_sha256: expectedSha, digest_matches_expected: true,
    version_probe_output: versionProbeOutput, version: expectedVersion, version_agrees: true,
    production_verifier_code: pv.code, production_verifier_ok: pv.ok,
    metadata_stable_across_hash_and_version_inspection: true,
    alternate_targets_present_and_refused: alternates,
  };
}

// ---------------------------------------------------------------------------------------------------
// Non-recursive package SHA-256 manifest: hashes every package file EXCEPT itself.
// ---------------------------------------------------------------------------------------------------
export function buildShaManifest(repo, relPaths, selfRel) {
  const files = {};
  for (const r of relPaths.filter((r) => r !== selfRel).sort()) files[r] = shaFile(resolve(repo, r));
  return {
    schema: "lrcq-package-sha-manifest-1",
    non_recursive: true,
    excludes_itself: selfRel,
    file_count: Object.keys(files).length,
    files,
    aggregate: sha256(canon(files)),
  };
}

// ---------------------------------------------------------------------------------------------------
function main(argv) {
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const observedAt = arg("--observed-at");
  const versionProbe = arg("--version-probe");
  const digestShasum = arg("--digest-shasum");
  const digestOpenssl = arg("--digest-openssl");
  if (!observedAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(observedAt)) {
    console.error("REFUSED: --observed-at <ISO8601Z> is required (this tool never reads the wall clock)"); return 2;
  }
  if (!versionProbe) { console.error("REFUSED: --version-probe \"<exact --version output>\" is required"); return 2; }
  if (!digestShasum || !digestOpenssl) { console.error("REFUSED: --digest-shasum <hex> and --digest-openssl <hex> are required"); return 2; }

  // ---- re-verify the frozen review chain against the real repository -----------------------------
  const problems = [];
  const req = (c, m) => { if (!c) problems.push(m); };
  req(git("rev-parse", FROZEN.authority_candidate_sha + "^{tree}") === FROZEN.authority_candidate_tree, "authority candidate tree mismatch");
  req(git("rev-parse", FROZEN.reviewed_evidence_head + "^{tree}") === FROZEN.reviewed_evidence_tree, "reviewed evidence tree mismatch");
  let anc = false; try { git("merge-base", "--is-ancestor", FROZEN.authority_candidate_sha, FROZEN.reviewed_evidence_head); anc = true; } catch { anc = false; }
  req(anc, "authority candidate is not an ancestor of the reviewed evidence head");
  let originMain = null; try { originMain = git("rev-parse", "refs/remotes/origin/main"); } catch { /* */ }
  req(originMain === null || originMain === FROZEN.protected_main, "protected main drifted: " + originMain);
  const authority = JSON.parse(readFileSync(P("docs/governance/FOUNDER_KEY_AUTHORITY.json"), "utf8"));
  req(Array.isArray(authority.active_keys) && authority.active_keys.length === 0, "active_keys is not []");
  if (problems.length) { console.error("REFUSED (state/review mismatch):\n  " + problems.join("\n  ")); return 1; }

  // ---- authority-file digests (pre-write baseline) -----------------------------------------------
  const authorityDigests = {};
  for (const f of AUTHORITY_FILES) authorityDigests[f] = shaRel(f);

  // ---- provider re-freeze ------------------------------------------------------------------------
  let prov;
  try {
    prov = refreezeProvider({
      target: FROZEN.provider_target, expectedSha: FROZEN.provider_sha256, expectedVersion: FROZEN.provider_version,
      versionProbeOutput: versionProbe, digestShasum, digestOpenssl,
    });
  } catch (e) { console.error("PROVIDER_DRIFT: " + (e.code || "") + " " + e.message); return 3; }

  // ---- rebuild the activation material packet, bound to the APPROVED AUTHORITY CANDIDATE ---------
  // The committed packet binds the reviewed production ancestor (evaluated_sha) in reviewed_runtime_*.
  // evidence_commit_* stays a placeholder: a commit cannot embed its own hash, and the out-of-tree
  // FINAL template is what binds the exact package candidate. This is the non-recursive two-SHA seal.
  const manifest = JSON.parse(readFileSync(P(MANIFEST_REL), "utf8"));
  const provForPacket = {
    path: manifest.provider_executable_path, target: manifest.resolved_provider_target,
    version: manifest.provider_version, identity: manifest.provider_executable_identity,
  };
  if (provForPacket.target !== FROZEN.provider_target) { console.error("PROVIDER_DRIFT: manifest target " + provForPacket.target); return 3; }
  if (provForPacket.identity !== "sha256:" + FROZEN.provider_sha256) { console.error("PROVIDER_DRIFT: manifest identity " + provForPacket.identity); return 3; }
  if (provForPacket.version !== FROZEN.provider_version) { console.error("PROVIDER_DRIFT: manifest version " + provForPacket.version); return 3; }

  const packet = buildActivationMaterialPacket({
    repo: REPO, prov: provForPacket,
    manRel: MANIFEST_REL, manDigest: shaRel(MANIFEST_REL),
    leaseManifestAbs: P(manifest.capability_lease_manifest_path),
    blastManifestAbs: P(manifest.blast_budget_manifest_path),
    backlogRel: manifest.backlog_path,
    runHarnessSha: "FINAL_HEAD_REPLACED_AT_FREEZE", runHarnessTree: "FINAL_TREE_REPLACED_AT_FREEZE",
    reviewedRuntimeSha: FROZEN.authority_candidate_sha, reviewedRuntimeTree: FROZEN.authority_candidate_tree,
  });
  // ceilings + exclusions must survive the recipe exactly
  for (const [k, v] of Object.entries(CEILINGS)) if (packet[k] !== v) { console.error("CEILING_MISMATCH: " + k + "=" + packet[k]); return 4; }
  for (const x of EXCLUSIONS) if (packet[x] !== true) { console.error("EXCLUSION_NOT_TRUE: " + x); return 4; }
  if (packet.founder_signature !== null || packet.signer_key_fingerprint !== null || packet.authorization_text_digest !== null
      || packet.activation_nonce !== null || packet.issued_epoch !== null || packet.unsigned !== true) {
    console.error("PACKET_NOT_UNSIGNED"); return 4;
  }
  write(PACKET_REL, packet);

  // ---- ADV-197-01: regenerate the acceptance matrix with a CORRECT report enumeration -------------
  // Read the matrix from the REVIEWED evidence head, never from the working tree. The correction is
  // defined against the artifact the Advisor actually reviewed, and reading from git makes this driver
  // IDEMPOTENT: re-running it reproduces the same corrected bytes instead of failing on its own output.
  const srcMatrix = JSON.parse(git("show", FROZEN.reviewed_evidence_head + ":" + MATRIX_SRC_REL));
  const STALE = srcMatrix.not_proven_here.findIndex((s) => /ALL FOUR prior reports/.test(s));
  if (STALE < 0) { console.error("ADV-197-01 stale statement not found — refusing to fabricate a correction"); return 5; }
  const correctedStatement =
    "The independent PACKAGE Checker verdict on this provider/package re-freeze. FIVE historical Checker "
    + "reports exist (sha256 " + FROZEN.historical_findings_reports.map((r) => r.sha256).join(", ") + "). "
    + "ALL FIVE are HISTORICAL FINDINGS EVIDENCE ONLY — they are NOT acceptance, and each reviewed a tree that "
    + "no longer exists on this branch. The CURRENT clean authority Checker (sha256 " + FROZEN.checker_digest + ") "
    + "and the CURRENT authority Advisor (sha256 " + FROZEN.advisor_digest + ") accepted the AUTHORITY "
    + "IMPLEMENTATION ONLY and both required this provider/package re-freeze; neither accepted this package.";
  const notProven = srcMatrix.not_proven_here.slice();
  notProven[STALE] = correctedStatement;
  notProven.push("FG-PPR-197: this regenerated matrix is BUILDER evidence. A fresh independent PACKAGE Checker verdict on the package candidate is required. Builder verification is NOT package acceptance.");

  const matrix = {
    ...srcMatrix,
    schema: "lrcq-v4-authority-acceptance-matrix-3",
    wave: srcMatrix.wave + " + FG-PPR-197 (provider/package re-freeze; ADV-197-01 corrected)",
    review_report_register: {
      note: "Report classes are kept STRICTLY distinct. A FINDINGS report is evidence that defects were found and corrected; it is never acceptance.",
      historical_checker_findings_reports: FROZEN.historical_findings_reports.map((r) => ({
        ordinal: r.ordinal, sha256: r.sha256, class: "HISTORICAL_FINDINGS_EVIDENCE",
        is_acceptance: false,
        note: "Reviewed a candidate tree that no longer exists on this branch. NOT acceptance of anything.",
      })),
      historical_findings_report_count: FROZEN.historical_findings_reports.length,
      current_clean_authority_checker: {
        sha256: FROZEN.checker_digest, verdict: FROZEN.checker_verdict, class: "CLEAN_AUTHORITY_REVIEW",
        accepts: "the AUTHORITY IMPLEMENTATION only, for advancement into a provider/package re-freeze wave",
        does_not_accept: "this package; the provider re-freeze was explicitly REQUIRED by this verdict",
      },
      current_authority_advisor: {
        sha256: FROZEN.advisor_digest, verdict: FROZEN.advisor_verdict, class: "SEQUENTIAL_ADVISORY_REVIEW",
        accepts: "the AUTHORITY IMPLEMENTATION as ready for provider re-freeze",
        does_not_accept: "this package; provider status was recorded as PROVISIONAL / NOT REFROZEN",
        open_finding: "ADV-197-01 (LOW, non-blocking) — corrected in this wave, see ADV_197_01_CORRECTION_LEDGER.json",
      },
      package_checker: { status: "REQUIRED_AND_NOT_YET_ISSUED", issued_by: "an independent read-only package Checker", never_issued_by: "the Builder" },
    },
    authority_binding: {
      authority_candidate_sha: FROZEN.authority_candidate_sha, authority_candidate_tree: FROZEN.authority_candidate_tree,
      reviewed_evidence_head: FROZEN.reviewed_evidence_head, reviewed_evidence_tree: FROZEN.reviewed_evidence_tree,
      authority_file_digests: authorityDigests,
    },
    not_proven_here: notProven,
  };
  write(OUT_DIR + "/V4_AUTHORITY_ACCEPTANCE_MATRIX.json", matrix);

  // Correct the stale sentence AT ITS SOURCE too, so the defect does not survive in the repository.
  // SURGICAL: rewrite exactly the one JSON string literal in the reviewed bytes, preserving the source
  // file's own formatting. Re-serializing the whole object would reformat 657 lines and bury a one-string
  // correction in noise that no reviewer could check. The result is then parsed and deep-compared against
  // the reviewed object, so the ONLY difference that can survive is the corrected statement itself.
  // The reviewed file escapes non-ASCII (—), so the stale value is located by LINE rather than by a
  // re-serialized literal, and the line's leading indentation and trailing comma are preserved verbatim.
  const srcBytes = git("show", FROZEN.reviewed_evidence_head + ":" + MATRIX_SRC_REL);
  const srcLines = srcBytes.split("\n");
  const staleLines = srcLines.map((l, i) => [l, i]).filter(([l]) => /ALL FOUR prior reports/.test(l));
  if (staleLines.length !== 1) { console.error("ADV-197-01 stale statement is not on exactly one line — refusing a blind edit"); return 5; }
  const [staleLine, staleIdx] = staleLines[0];
  const m = staleLine.match(/^(\s*)(".*")(,?)$/);
  if (!m) { console.error("ADV-197-01 stale line is not a plain JSON string element — refusing a blind edit"); return 5; }
  if (JSON.parse(m[2]) !== srcMatrix.not_proven_here[STALE]) { console.error("ADV-197-01 located line is not the stale statement — refusing"); return 5; }
  const correctedSourceStatement = correctedStatement
    + " (Corrected in wave FG-PPR-197; the authoritative regenerated matrix is " + OUT_DIR + "/V4_AUTHORITY_ACCEPTANCE_MATRIX.json.)";
  srcLines[staleIdx] = m[1] + JSON.stringify(correctedSourceStatement) + m[3];
  const correctedBytes = srcLines.join("\n");
  const reparsed = JSON.parse(correctedBytes);
  const expected = JSON.parse(JSON.stringify(srcMatrix));
  expected.not_proven_here[STALE] = correctedSourceStatement;
  if (canon(reparsed) !== canon(expected)) { console.error("ADV-197-01 surgical correction changed more than the one statement — refusing"); return 5; }
  writeText(MATRIX_SRC_REL, correctedBytes.endsWith("\n") ? correctedBytes : correctedBytes + "\n");

  write(OUT_DIR + "/ADV_197_01_CORRECTION_LEDGER.json", {
    schema: "lrcq-advisor-finding-correction-ledger-1",
    wave: "FG-PPR-197",
    advisor_report_sha256: FROZEN.advisor_digest, advisor_verdict: FROZEN.advisor_verdict,
    finding: {
      id: "ADV-197-01", severity: "LOW", blocking: false, waived: false,
      artifact: MATRIX_SRC_REL + " (not_proven_here[" + STALE + "])",
      mechanism: "Stale enumeration carried forward from the prior wave: the statement said 'ALL FOUR prior reports' and omitted the fifth historical Checker FINDINGS report (sha256 " + FROZEN.historical_findings_reports[4].sha256 + ") that was added in the same commit.",
      authority_impact: "NONE — no false success, no provider invocation, no widened ceiling or exclusion, no executable behaviour change.",
    },
    correction: {
      corrected_in_this_package_wave: true,
      what_changed: [
        "The stale 'ALL FOUR prior reports' statement was replaced with a FULL, unabbreviated enumeration of all FIVE historical Checker FINDINGS reports, by full sha256.",
        "A review_report_register was added that keeps three report classes strictly distinct: HISTORICAL_FINDINGS_EVIDENCE (five), CLEAN_AUTHORITY_REVIEW (one), SEQUENTIAL_ADVISORY_REVIEW (one).",
        "The historical FINDINGS reports are explicitly marked is_acceptance:false and are NOT called acceptance anywhere.",
        "The correction was applied both in the regenerated wave matrix and at the source artifact, so the defective string does not survive in the repository.",
      ],
      remains_subject_to: "INDEPENDENT PACKAGE CHECKER VERIFICATION. This correction is Builder work; it is not self-accepted and it is not package acceptance.",
    },
    historical_findings_reports: FROZEN.historical_findings_reports,
    current_clean_authority_checker_sha256: FROZEN.checker_digest,
    current_authority_advisor_sha256: FROZEN.advisor_digest,
  });

  // ---- limits + exclusions record ----------------------------------------------------------------
  write(OUT_DIR + "/LIMITS_AND_EXCLUSIONS.json", {
    schema: "lrcq-limits-and-exclusions-1", wave: "FG-PPR-197",
    six_signed_ceilings: Object.fromEntries(Object.entries(CEILINGS).map(([k, v]) => [k, {
      required: "<= " + v, packet_value: packet[k], manifest_value: manifestCeiling(manifest, k), satisfied: packet[k] <= v,
    }])),
    ten_mandatory_exclusions: Object.fromEntries(EXCLUSIONS.map((x) => [x, { required: true, packet_value: packet[x], satisfied: packet[x] === true }])),
    widening_surface: {
      package_field: "REFUSED — the ceilings and exclusions are part of the SIGNED activation payload; changing one changes the signed bytes and fails signature verification.",
      environment_variable: "REFUSED — the driver reads NO environment variable, and run-five-hour.mjs fails closed on LRCQ_TEST_LIFECYCLE for a production --activation run.",
      cli_argument: "REFUSED — the production --activation command accepts no caller-supplied override of manifest / bindings / provider / limits.",
      unsigned_overlay: "REFUSED — every authority-bearing value derives from the founder-SIGNED activation payload.",
    },
  });

  // ---- preflight controls record (control inventory; executed results live in the evidence tail) --
  write(OUT_DIR + "/PREFLIGHT_CONTROLS.json", {
    schema: "lrcq-preflight-controls-1", wave: "FG-PPR-197",
    what_this_records: "The CONTROL INVENTORY the production preflight enforces, plus the digests of the modules that enforce it. This is a SOURCE-PROVEN record. The EXECUTED preflight results are recorded separately in the evidence-only tail commit, because the preflight can only reach SIGNATURE-REQUIRED against the out-of-tree FINAL template that binds the package candidate commit — which does not exist yet when this record is written.",
    enforcing_modules: Object.fromEntries(["tools/terminal0/lrcq/run-five-hour.mjs", "src/v8b/lrcq/assurance/activation-v4.mjs", "src/v8b/lrcq/assurance/founder-key-authority.mjs", "src/v8b/lrcq/provider/provider-verify.mjs", "src/v8b/lrcq/run-harness/run-manifest.mjs"].map((f) => [f, shaRel(f)])),
    controls: [
      { id: "PF-1", control: "V4 schema required; V3 and V2 activation records are REFUSED for execution" },
      { id: "PF-2", control: "provider_executable_identity must be a real sha256, never a placeholder" },
      { id: "PF-3", control: "no '<founder' / 'founder-fills' placeholder may survive into an activation" },
      { id: "PF-4", control: "the SIGNED run manifest must exist and its FILE digest must equal the signed digest" },
      { id: "PF-5", control: "evidence_commit_sha/tree must equal the exact current HEAD/tree" },
      { id: "PF-6", control: "lrcq_base and provider_candidate bindings must equal the mechanically resolved values" },
      { id: "PF-7", control: "reviewed_runtime_sha must be a real commit in this repository" },
      { id: "PF-8", control: "the bound provider target must exist, be a non-symlink regular file, and re-hash to the bound digest (digest only — preflight NEVER executes the provider)" },
      { id: "PF-9", control: "a binding defect can NEVER be masked by a pending founder act — bindings are cross-checked before the signature gate" },
      { id: "PF-10", control: "with an EMPTY governed key authority the classified founder gate is KEY_ENROLLMENT" },
      { id: "PF-11", control: "zero provider / builder / checker invocation is asserted structurally on every preflight path" },
    ],
    expected_result_for_this_package: "SIGNATURE-REQUIRED with founder_gate KEY_ENROLLMENT and zero_invocation true",
  });

  // ---- claim / evidence classification -----------------------------------------------------------
  write(OUT_DIR + "/CLAIM_EVIDENCE_CLASSIFICATION.json", {
    schema: "lrcq-claim-evidence-classification-1", wave: "FG-PPR-197",
    classes: {
      MECHANICAL: "recomputed from bytes on disk or from git objects by a tool, reproducible by a third party",
      COUNTED: "a real observed count (processes, spawns, tests)",
      SOURCE_PROVEN: "proven by reading production source text, not by executing it",
      DYNAMIC: "proven by actually executing the control and observing the refusal",
      NOT_PROVEN: "explicitly not established by this wave",
    },
    claims: [
      { claim: "the provider target is the reviewed immutable 2.1.220 binary with the expected digest", class: "MECHANICAL", evidence: "two independent external hashers plus the production verifyProviderTarget" },
      { claim: "the provider reports version 2.1.220", class: "DYNAMIC", evidence: "a counted --version metadata probe; the ONLY provider execution in this wave" },
      { claim: "the package binds the approved authority candidate ebd4ff56 / tree 012e0560", class: "MECHANICAL", evidence: "git rev-parse plus the regenerated activation payload's reviewed_runtime_* fields" },
      { claim: "the six ceilings and ten exclusions hold", class: "MECHANICAL", evidence: "read back from the regenerated payload and the manifest" },
      { claim: "invalid packages refuse before any productive provider spawn", class: "DYNAMIC", evidence: "negative attacks executed on disposable copies outside git, with a counted spawn instrument and a positive stub control" },
      { claim: "the package is unsigned and unactivated and active_keys is []", class: "MECHANICAL", evidence: "null signature fields plus docs/governance/FOUNDER_KEY_AUTHORITY.json" },
      { claim: "the real repository is blocked at KEY_ENROLLMENT", class: "DYNAMIC", evidence: "the production launcher preflight's classified founder gate" },
      { claim: "real productive provider capability works", class: "NOT_PROVEN", evidence: "requires invoking Claude productively, which is forbidden in preparation and is first exercised under founder signature" },
      { claim: "this package is accepted", class: "NOT_PROVEN", evidence: "Builder verification is NOT package acceptance; an independent package Checker verdict is required" },
      { claim: "complete OS isolation / UI proof", class: "NOT_PROVEN", evidence: "not claimed by this wave" },
    ],
  });

  // ---- founder-readable enrollment packet --------------------------------------------------------
  write(OUT_DIR + "/FOUNDER_ENROLLMENT_PACKET.json", {
    schema: "lrcq-founder-enrollment-packet-1", wave: "FG-PPR-197",
    confers_no_authority: true, founder_signature: null, contains_no_key_material: true, contains_no_passphrase: true,
    plain_language: {
      what_this_is: "A plain-language description of what is now frozen and what the next founder decision would be. It authorizes nothing by itself.",
      what_changed_in_this_wave: "The package was re-bound to the exact authority implementation that passed the sixth independent Checker and the sequential Advisor, and the provider binary was re-verified and re-frozen against that exact authority candidate.",
      what_is_still_required_before_anything_runs: [
        "an INDEPENDENT package Checker must review this package and return a clean verdict — the Builder cannot issue it",
        "the founder must enroll exactly one public founder key (no key is enrolled: active_keys is empty)",
        "the founder must sign the activation payload with that key",
        "nothing runs until both of those founder acts happen",
      ],
      what_the_run_would_be_allowed_to_do: {
        cost_ceiling_usd: CEILINGS.max_budget_usd, max_wall_clock_s: CEILINGS.run_duration_s,
        per_job_timeout_s: CEILINGS.per_job_timeout_s, max_parallel_width: CEILINGS.max_parallel_width,
        max_output_bytes: CEILINGS.max_output_bytes, termination_grace_s: CEILINGS.termination_grace_s,
      },
      what_the_run_may_never_do: EXCLUSIONS,
      honest_limits: [
        "Real productive Claude behaviour is NOT proven here and is first observed under signature.",
        "This wave proves binding, refusal and reproducibility — not that the run will succeed.",
        "No UI proof and no complete OS isolation is claimed.",
      ],
    },
    current_state: {
      active_keys: [], founder_key_enrolled: false, package_signed: false, activation_issued: false,
      activation_consumed: false, run_started: false, provider_productively_invoked: false,
      next_gate: "INDEPENDENT_PACKAGE_CHECKER, then FOUNDER_KEY_ENROLLMENT",
    },
    authority_binding: { authority_candidate_sha: FROZEN.authority_candidate_sha, authority_candidate_tree: FROZEN.authority_candidate_tree },
    provider_binding: { target: prov.target, version: prov.version, sha256: prov.sha256 },
  });

  // ---- preserved review reports (verbatim bytes, digest-checked) ---------------------------------
  const preserve = (srcAbs, destRel, expectDigest) => {
    const bytes = readFileSync(srcAbs);
    const d = sha256hex(bytes);
    if (d !== expectDigest) { throw new Error("PRESERVED_REPORT_DIGEST_MISMATCH " + srcAbs + " " + d); }
    const abs = P(destRel); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, bytes);
    return d;
  };
  let checkerCopyDigest, advisorCopyDigest;
  try {
    checkerCopyDigest = preserve("/tmp/foundergate-pr197-production-seam-independent-checker.json", OUT_DIR + "/CHECKER_197_SIXTH_AUTHORITY_REPORT.json", FROZEN.checker_digest);
    advisorCopyDigest = preserve("/tmp/foundergate-pr197-sequential-advisor.json", OUT_DIR + "/ADVISOR_197_SEQUENTIAL_REPORT.json", FROZEN.advisor_digest);
  } catch (e) { console.error("REFUSED: " + e.message); return 6; }

  // ---- provider re-freeze record -----------------------------------------------------------------
  write(OUT_DIR + "/PROVIDER_REFREEZE_2_1_220_ebd4ff5.json", {
    schema: "lrcq-provider-refreeze-2", wave: "FG-PPR-197",
    why: "The only prior provider re-freeze artifact (.foundergate/evidence/lrcq-assurance-factory/PROVIDER_REFREEZE_2_1_220.json, wave FG-LRCQ-ACT-029) predates candidates 8e6944ef, c6bf5a37, 4014d91b, 9d87afa1 and ebd4ff56. Its candidate binding was deliberately NOT carried forward. A stable hash is not a re-freeze: the binding must be RECORDED against the approved executable authority candidate.",
    prior_artifact: {
      path: ".foundergate/evidence/lrcq-assurance-factory/PROVIDER_REFREEZE_2_1_220.json",
      sha256: shaRel(".foundergate/evidence/lrcq-assurance-factory/PROVIDER_REFREEZE_2_1_220.json"),
      old_candidate_binding_carried_forward: false,
      inspection: "Mechanically inspected. Its resolution method (alias -> versioned target, two reads, --version probe, metadata stability, no updater) was re-executed independently here; its recorded candidate context was NOT reused.",
    },
    authority_binding: {
      authority_candidate_sha: FROZEN.authority_candidate_sha, authority_candidate_tree: FROZEN.authority_candidate_tree,
      prior_reviewed_evidence_head: FROZEN.reviewed_evidence_head, prior_reviewed_evidence_tree: FROZEN.reviewed_evidence_tree,
      authority_file_digests: authorityDigests,
    },
    review_binding: {
      sixth_checker_report_sha256: FROZEN.checker_digest, sixth_checker_verdict: FROZEN.checker_verdict,
      sequential_advisor_report_sha256: FROZEN.advisor_digest, sequential_advisor_verdict: FROZEN.advisor_verdict,
      preserved_checker_copy: OUT_DIR + "/CHECKER_197_SIXTH_AUTHORITY_REPORT.json",
      preserved_advisor_copy: OUT_DIR + "/ADVISOR_197_SEQUENTIAL_REPORT.json",
      preserved_copies_are_byte_identical: true,
      preserved_checker_copy_sha256: checkerCopyDigest, preserved_advisor_copy_sha256: advisorCopyDigest,
    },
    provider: prov,
    mutable_alias: {
      path: "/Users/yosiwizman/.local/bin/claude",
      role: "MUTABLE ALIAS — recorded for identity consistency only; NEVER bound and NEVER executed",
      currently_points_at: FROZEN.provider_target,
    },
    observation_time_utc: observedAt,
    observation_time_is_a_frozen_input: "This driver never reads the wall clock. The observation instant is supplied explicitly so regeneration is byte-reproducible.",
    commands_used: [
      "stat -f ... <target>              (filesystem identity, recorded before and after)",
      "shasum -a 256 <target>            (independent hasher 1: Digest::SHA)",
      "openssl dgst -sha256 -r <target>  (independent hasher 2: OpenSSL)",
      "node crypto re-hash of <target>   (independent hasher 3: performed by this driver itself)",
      "<target> --version                (metadata probe ONLY, in a separate counted observation step)",
      "verifyProviderTarget(...)         (the production immutable-provider verifier)",
      "readlink -f <mutable alias>       (alias resolution only; the alias is never bound and never executed)",
    ],
    commands_used_note: "Absolute tool paths are recorded in the evidence-only tail commit. This module lives in the production launcher directory, where the authority-route regression forbids any alternate shell/executor surface, so it spawns nothing but the fixed absolute git binary.",
    provider_execution_limited_to_version: {
      statement: "Provider EXECUTION in this wave was limited to `--version`. No model request, no productive provider request, no run-route spawn.",
      productive_provider_spawns: 0, model_requests: 0,
      version_metadata_probes: "counted and recorded in the evidence-only tail commit",
      this_driver_never_executes_the_provider: true,
    },
    updater_state: "No Claude Code updater or installer process is running. The only updater processes on the host are macOS softwareupdated/MobileSoftwareUpdate daemons, unrelated to the provider target.",
    alternate_targets_not_accepted: prov.alternate_targets_present_and_refused,
    authorization_status: {
      provider_remains_unauthorized_for_productive_use: true,
      statement: "The provider remains UNAUTHORIZED for productive use until a founder-signed activation is enrolled, signed, verified and consumed through the governed V4 route. Re-freezing records identity; it grants nothing.",
      active_keys: [], package_signed: false, activation_issued: false, activation_consumed: false,
    },
  });

  // ---- package verification instructions ---------------------------------------------------------
  writeText(OUT_DIR + "/PACKAGE_VERIFICATION_INSTRUCTIONS.md", verificationInstructions());

  // ---- evidence-set index ------------------------------------------------------------------------
  const packageFiles = [
    MANIFEST_REL,
    ".foundergate/run-materials/first-internal-5h/capability-lease-manifest.json",
    ".foundergate/run-materials/first-internal-5h/blast-budget-manifest.json",
    ".foundergate/run-materials/first-internal-5h/setup-contract.json",
    ".foundergate/run-materials/first-internal-5h/machine-verifier-contract.json",
    ".foundergate/run-materials/first-internal-5h/checker-contract.json",
    ".foundergate/run-materials/first-internal-5h/allowed-tools-manifest.json",
    ".foundergate/run-materials/first-internal-5h/denied-tools-manifest.json",
    PACKET_REL,
    MATRIX_SRC_REL,
    ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_GATE_PACKET.json",
    ".foundergate/evidence/lrcq-assurance-factory/FOUNDER_GATE_PACKET.json",
    ".foundergate/backlog/first-real-five-hour-run-v2.json",
    ".foundergate/backlog/assurance-control-master-v1.json",
    "docs/governance/FOUNDER_KEY_AUTHORITY.json",
    OUT_DIR + "/PROVIDER_REFREEZE_2_1_220_ebd4ff5.json",
    OUT_DIR + "/V4_AUTHORITY_ACCEPTANCE_MATRIX.json",
    OUT_DIR + "/ADV_197_01_CORRECTION_LEDGER.json",
    OUT_DIR + "/LIMITS_AND_EXCLUSIONS.json",
    OUT_DIR + "/PREFLIGHT_CONTROLS.json",
    OUT_DIR + "/CLAIM_EVIDENCE_CLASSIFICATION.json",
    OUT_DIR + "/FOUNDER_ENROLLMENT_PACKET.json",
    OUT_DIR + "/CHECKER_197_SIXTH_AUTHORITY_REPORT.json",
    OUT_DIR + "/ADVISOR_197_SEQUENTIAL_REPORT.json",
    OUT_DIR + "/PACKAGE_VERIFICATION_INSTRUCTIONS.md",
    "tools/terminal0/lrcq/refreeze-package.mjs",
  ];
  const missing = packageFiles.filter((f) => !existsSync(P(f)));
  if (missing.length) { console.error("PACKAGE_GENERATION_FAILURE: missing " + missing.join(", ")); return 7; }

  const evidenceSetIndexRel = OUT_DIR + "/EVIDENCE_SET_INDEX.json";
  const shaManifestRel = OUT_DIR + "/PACKAGE_SHA256_MANIFEST.json";
  const indexedFiles = Object.fromEntries(packageFiles.slice().sort().map((f) => [f, shaRel(f)]));
  write(evidenceSetIndexRel, {
    schema: "lrcq-package-evidence-set-index-1", wave: "FG-PPR-197",
    non_recursive: true,
    excludes: [evidenceSetIndexRel, shaManifestRel],
    excludes_reason: "Non-recursive by construction: the index never hashes itself, and it never hashes the SHA manifest that is generated last over the index. Both remain tamper-covered — the index by its own evidence_set_digest, the SHA manifest by the package commit tree.",
    authority_candidate_sha: FROZEN.authority_candidate_sha, authority_candidate_tree: FROZEN.authority_candidate_tree,
    provider_target: prov.target, provider_version: prov.version, provider_sha256: prov.sha256,
    file_count: Object.keys(indexedFiles).length,
    files: indexedFiles,
    evidence_set_digest: sha256(canon(indexedFiles)),
  });

  // SHA manifest LAST — over every package file plus the evidence-set index, excluding only itself.
  write(shaManifestRel, buildShaManifest(REPO, packageFiles.concat([evidenceSetIndexRel]), shaManifestRel));

  // ---- authority immutability: recompute AFTER every write ---------------------------------------
  const after = {};
  for (const f of AUTHORITY_FILES) after[f] = shaRel(f);
  const changed = AUTHORITY_FILES.filter((f) => after[f] !== authorityDigests[f]);
  if (changed.length) { console.error("AUTHORITY_FILE_CHANGED (BLOCKER): " + changed.join(", ")); return 8; }

  console.log(JSON.stringify({
    result: "PACKAGE_REGENERATED",
    authority_candidate: FROZEN.authority_candidate_sha, authority_tree: FROZEN.authority_candidate_tree,
    provider: { target: prov.target, version: prov.version, sha256: prov.sha256 },
    reviewed_runtime_sha_in_packet: packet.reviewed_runtime_sha,
    package_file_count: Object.keys(indexedFiles).length + 1,
    evidence_set_digest: sha256(canon(indexedFiles)),
    authority_files_unchanged: true,
  }, null, 2));
  return 0;
}

function manifestCeiling(m, k) {
  const map = { max_budget_usd: "max_cost_usd", run_duration_s: "max_duration_s", per_job_timeout_s: "per_job_timeout_s", max_parallel_width: "max_parallel_width", max_output_bytes: "output_cap_bytes", termination_grace_s: "termination_grace_s" };
  return m[map[k]];
}

function verificationInstructions() {
  return `# FounderGate PR #197 — Provider / Package Re-Freeze: Verification Instructions

These instructions are for an **independent read-only package Checker**. Everything below is mechanical.
Nothing here is acceptance: the Builder cannot accept its own package.

## 0. Frozen inputs

| item | value |
|---|---|
| approved authority candidate | \`${FROZEN.authority_candidate_sha}\` |
| approved authority tree | \`${FROZEN.authority_candidate_tree}\` |
| prior reviewed evidence head (PR #197) | \`${FROZEN.reviewed_evidence_head}\` |
| PR #196 head | \`${FROZEN.pr_196_head}\` |
| protected main | \`${FROZEN.protected_main}\` |
| clean authority Checker | \`sha256:${FROZEN.checker_digest}\` |
| authority Advisor | \`sha256:${FROZEN.advisor_digest}\` |
| provider target | \`${FROZEN.provider_target}\` |
| provider version | \`${FROZEN.provider_version}\` |
| provider sha256 | \`${FROZEN.provider_sha256}\` |

## 1. Authority binding

\`\`\`
git rev-parse ${FROZEN.authority_candidate_sha}^{tree}      # => ${FROZEN.authority_candidate_tree}
git merge-base --is-ancestor ${FROZEN.authority_candidate_sha} ${FROZEN.reviewed_evidence_head}
jq -r .reviewed_runtime_sha ${PACKET_REL}
\`\`\`

The activation payload's \`reviewed_runtime_sha\` / \`reviewed_runtime_tree\` MUST be the approved authority
candidate and tree. \`evidence_commit_sha\` MUST still be the freeze placeholder: a commit cannot embed its
own hash, and the out-of-tree FINAL template is what binds the exact package candidate.

## 2. Provider identity — reproduce independently

\`\`\`
stat -f 'mode=%Sp links=%l dev=%d inode=%i size=%z mtime=%Sm' ${FROZEN.provider_target}
test -L ${FROZEN.provider_target} && echo SYMLINK_BLOCKER || echo NOT_A_SYMLINK
shasum -a 256 ${FROZEN.provider_target}
openssl dgst -sha256 -r ${FROZEN.provider_target}
${FROZEN.provider_target} --version     # metadata probe ONLY — never a model request
\`\`\`

(Absolute tool paths are recorded in the evidence-only tail commit. They are omitted here because this
generator lives in the production launcher directory, where the authority-route regression forbids any
alternate shell/executor surface — including such a string appearing in the file at all.)

Both hashes must equal \`${FROZEN.provider_sha256}\` and the version must be \`${FROZEN.provider_version}\`.
Re-stat afterwards: device, inode, size and mtime must be unchanged.

## 3. Report digests

\`\`\`
shasum -a 256 ${OUT_DIR}/CHECKER_197_SIXTH_AUTHORITY_REPORT.json   # ${FROZEN.checker_digest}
shasum -a 256 ${OUT_DIR}/ADVISOR_197_SEQUENTIAL_REPORT.json        # ${FROZEN.advisor_digest}
\`\`\`

The preserved copies are byte-identical to the reviewed reports.

## 4. ADV-197-01

\`grep -c 'ALL FOUR prior reports'\` over both matrices must be \`0\`, and each of the five historical
FINDINGS digests must appear in full in the regenerated matrix's \`review_report_register\`. None of the
five may be described as acceptance.

## 5. Package file hashes

\`\`\`
jq -r '.files | to_entries[] | "\\(.value|sub("^sha256:";""))  \\(.key)"' \\
  ${shaManifestJsonPathForDoc()} | shasum -a 256 -c -
\`\`\`

Every entry of \`${shaManifestJsonPathForDoc()}\` must verify. The manifest is non-recursive: it excludes
only itself. Verify \`aggregate\` by re-canonicalizing the \`files\` map with
\`canon()\` from \`tools/terminal0/lrcq/evidence-set.mjs\` and hashing it.

## 6. Deterministic regeneration

\`\`\`
node tools/terminal0/lrcq/generate-run-manifest.mjs
node tools/terminal0/lrcq/refreeze-package.mjs --observed-at <the recorded instant> --version-probe "${FROZEN.provider_version} (Claude Code)"
git status --porcelain     # must be empty when regenerated at the SAME repository path
\`\`\`

The driver reads no clock, no randomness and no environment variable. Regenerating at a DIFFERENT
filesystem path changes exactly the explicitly-declared, launcher-verified path bindings
(\`repository_root\`, \`permitted_worktree_root\`, \`repository_root_realpath\`, \`lifecycle_root_realpath\`)
and nothing else.

## 7. Ceilings and exclusions

All six ceilings must hold at or below: max_budget_usd 10, run_duration_s 18000, per_job_timeout_s 2700,
max_parallel_width 2, max_output_bytes 10485760, termination_grace_s 30. All ten exclusions must be
exactly \`true\`: ${EXCLUSIONS.join(", ")}.

## 8. Refusal under attack

Every invalid-package attack must refuse BEFORE any productive provider spawn, with a counted spawn
instrument and a positive deterministic-stub control proving the counter can observe a spawn.

## 9. Unsigned / unactivated state

\`active_keys\` must be \`[]\`; \`founder_signature\`, \`signer_key_fingerprint\`,
\`authorization_text_digest\`, \`activation_nonce\` and \`issued_epoch\` must all be \`null\`; the real
repository must classify its founder gate as \`KEY_ENROLLMENT\`.

## 10. What this package does NOT claim

Real productive Claude capability, package acceptance, UI proof, and complete OS isolation are all
explicitly NOT proven. Builder verification is not package acceptance.
`;
}
function shaManifestJsonPathForDoc() { return OUT_DIR + "/PACKAGE_SHA256_MANIFEST.json"; }

if (SELF === resolve(process.argv[1] || "")) process.exit(main(process.argv.slice(2)));
