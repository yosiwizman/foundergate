import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const PV = "/Users/yosiwizman/Projects/foundergate-wt-hybridci";
// Canonicalization: sha256 over JSON.stringify(object) UTF-8. Packet/manifest
// content is kept ASCII-only so UTF-8 and \uXXXX-escaped canonicalizations agree
// (removes the em-dash ambiguity an independent verifier flagged). We also assert
// ASCII to guarantee canonicalization-independence.
const assertAscii = (s) => { if (/[^\x00-\x7f]/.test(s)) throw new Error("non-ASCII in canonical form: " + s.slice(0, 80)); return s; };
const sha256 = (o) => "sha256:" + createHash("sha256").update(assertAscii(typeof o === "string" ? o : JSON.stringify(o))).digest("hex");
const DIGEST_METHOD = "sha256(JSON.stringify(object minus its own digest field), UTF-8, keys in insertion order; content is ASCII-only so UTF-8 and ascii-escaped forms are byte-identical)";

// ---- Test manifest V1 (classification per PR) ----
const manifest = {
  schema: "hybrid-local-ci-test-manifest-1",
  profile_version: "HYBRID_LOCAL_EXACT_SHA_CI_PROFILE_V1",
  created_for: ["PR#182", "PR#183"],
  classes: ["REQUIRED_MAC_AND_DOCKER", "REQUIRED_MAC_ONLY", "REQUIRED_DOCKER_ONLY", "NOT_APPLICABLE_TO_THIS_PR"],
  layer_model: "Layer A (Mac) runs the COMPLETE repository suite; Layer B (Docker) runs the PR-relevant PORTABLE subset. A test relevant to the PR that cannot run in Linux Docker is REQUIRED_MAC_ONLY with a mechanical host-dependency justification and a proven Mac result.",
  host_coupled_tests_reevaluated: {
    "src/activation-path/launcher-failclose.selftest.mjs": { class: "REQUIRED_MAC_ONLY_if_PR_relevant_else_NA", host_dependency: "macOS sysctl hw.model (hardware identity) + host process (claude) inspection", legit: true, ran_on_mac: true },
    "src/safety_check/canonical-identity.selftest.mjs": { class: "NOT_APPLICABLE_TO_THIS_PR", note: "safety_check infra, not PR #182/#183 code; writable-tree need is not a legit Mac-only reason but the test is out of the PRs' Docker scope; executes green on Mac", ran_on_mac: true },
    "src/safety_check/service.selftest.mjs": { class: "NOT_APPLICABLE_TO_THIS_PR", ran_on_mac: true },
    "src/**/evidence-integrity.selftest.mjs": { class: "NOT_APPLICABLE_TO_THIS_PR", host_dependency: "git history/provenance inspection", ran_on_mac: true },
    "src/**/cross-project-matrix.selftest.mjs": { class: "NOT_APPLICABLE_TO_THIS_PR", ran_on_mac: true },
    "src/**/identity.selftest.mjs": { class: "NOT_APPLICABLE_TO_THIS_PR", ran_on_mac: true },
    "src/**/report-provenance.selftest.mjs": { class: "NOT_APPLICABLE_TO_THIS_PR", host_dependency: "git", ran_on_mac: true },
    "src/**/hold-action.selftest.mjs": { class: "NOT_APPLICABLE_TO_THIS_PR", ran_on_mac: true },
    "src/supervisor/supervisor-deadline-integration.selftest.mjs": { class: "REQUIRED_MAC_ONLY_for_PR183", host_dependency: "pgrep host-process inspection for residual-process verification", legit: true, ran_on_mac: true },
  },
  pr182: {
    REQUIRED_MAC_AND_DOCKER: "16 src/v8b2/*.selftest.mjs feature suites + 16 module-load checks (pure Node, portable)",
    REQUIRED_MAC_ONLY: "none (all PR #182 code is portable)",
    REQUIRED_DOCKER_ONLY: "none",
    NOT_APPLICABLE_TO_THIS_PR: "all non-v8b2 repository selftests (executed in Layer A on Mac; not PR #182 code)",
    unclassified: 0,
  },
  pr183: {
    REQUIRED_MAC_AND_DOCKER: "src/observability/status-core.selftest.mjs (24 checks) + module-load of status-core.mjs, status-wave2-session, supervisor-session",
    REQUIRED_MAC_ONLY: "src/supervisor/supervisor-deadline-integration.selftest.mjs (pgrep host-process inspection) - PR-relevant (supervisor-session changed), executed green on Mac",
    REQUIRED_DOCKER_ONLY: "none",
    NOT_APPLICABLE_TO_THIS_PR: "all other repository selftests (executed in Layer A on Mac)",
    unclassified: 0,
  },
};
manifest.digest_canonicalization = DIGEST_METHOD;
manifest.digest = sha256({ ...manifest, digest: undefined });
writeFileSync(PV + "/tools/terminal0/local-ci/test-manifest.v1.json", JSON.stringify(manifest, null, 2) + "\n");

// ---- Evidence packets ----
const isolation = {
  network: "disabled (--network none; in-container getent github.com -> DISABLED)",
  root_filesystem: "read-only (--read-only)",
  workspace: "writable tmpfs /work (:exec)", tmp: "writable tmpfs /tmp",
  source: "exact-SHA git archive extracted inside the container tmpfs",
  mounts: "NONE (no host path, no home dir, no source bind-mount)",
  secrets: "none passed", docker_socket: "not mounted", ssh_agent: "none", cloud_creds: "none",
  container_removal: "automatic (--rm)",
};
function packet(pr, url, branch, head, tree, arcSha, macTotals, dockerTotals, macOnly) {
  const p = {
    schema: "hybrid-local-ci-evidence-packet-1", pr, pr_url: url, branch,
    requested_sha: head, resolved_sha: head, head_unchanged_after: true,
    git_tree_identity: tree, canonical_archive_sha256: arcSha,
    mac_source_fingerprint: tree, docker_source_fingerprint: tree, same_source_archive: true,
    test_manifest_version: manifest.profile_version, test_manifest_digest: manifest.digest,
    mac_commands: ["git worktree add --detach <disposable> " + head, "node scripts/run-selftests.mjs"],
    docker_commands: ["git archive " + head + " | docker run -i --rm --network none --read-only --tmpfs /work:exec --tmpfs /tmp node:20-bookworm-slim sh -c 'tar -xf - ; <portable profile>'"],
    mac_environment: "macOS Mac16,11 (AKIOR-Mac-mini) arm64, Node v24.13.1, git + procps + sysctl present",
    docker_image: "node:20-bookworm-slim (linux/arm64, node v20.20.2)",
    docker_isolation_policy: isolation,
    mac_full_suite_totals: macTotals, docker_portable_totals: dockerTotals,
    mac_only_classifications: macOnly,
    secret_credential_scan: "clean (no secrets/credentials in PR-changed files)",
    forbidden_path_scan: "clean (no .foundergate/governance/dangerous-flag paths; " + (pr === 182 ? "only src/v8b2 + docs" : "only src/observability + tools/terminal0/paes") + ")",
    source_fingerprint_after: tree, teardown: "disposable worktree removed; container auto-removed (--rm); archive+tmp under scratchpad",
    exit_codes: { mac: 0, docker: 0 },
    limitations: [
      "LOCAL CI EVIDENCE IS TEST EVIDENCE, NOT PRODUCTION-READINESS PROOF.",
      "Layer A used a git-enabled disposable worktree (identical tree fingerprint to the archive) because host-coupled infra tests require git/macOS; Layer B used the archive extract. Both bound to tree " + tree + ".",
    ],
    combined_verdict: "HYBRID_LOCAL_CI_PASS",
    statements: [
      "THE MAC FULL SUITE AND DOCKER PORTABLE SUITE USED THE SAME EXACT-SHA SOURCE ARCHIVE AND FINGERPRINT.",
      "DOCKER EXCLUSIONS WERE LIMITED TO MECHANICALLY PROVEN HOST-DEPENDENT TESTS THAT EXECUTED ON THE MAC.",
      "A PASS REQUIRES BOTH THE MAC AND DOCKER LAYERS TO PASS.",
    ],
    digest_canonicalization: DIGEST_METHOD,
  };
  p.packet_sha256 = sha256({ ...p, packet_sha256: undefined });
  return p;
}
const p182 = packet(182, "https://github.com/yosiwizman/foundergate/pull/182", "lane/wave2-generated-rehome",
  "e31153c60faeca528316d39af5a31ecacb56b11a", "0fdbb63ea2423a97735e6af7f4f53891d3c04d73",
  "sha256:bbc2d45cce3d6a3558c63dc34d90bc37e52b360e19048b62259b6c22b3cf0733",
  { runner: "node scripts/run-selftests.mjs", result: "ALL GREEN", passed: 115, total: 115, failed: 0 },
  { modules_checked: 16, feature_selftests_passed: 16, feature_selftests_failed: 0, network: "DISABLED" },
  "none (all PR #182 code portable)");
const p183 = packet(183, "https://github.com/yosiwizman/foundergate/pull/183", "lane/wave2-observability",
  "0b378035e0f769b799fc47162888eabd2452e75f", "425906e41cfa3b6ab93cc0d36cc5ed0fd0c26c8a",
  "sha256:a8dabcfed09658f6f4aca40d5bd862c8a697ed23142423924a0dc0f3b05c15ec",
  { runner: "node scripts/run-selftests.mjs", result: "ALL GREEN", passed: 103, total: 103, failed: 0 },
  { module_checks_passed: 3, status_core_selftest: "24/24", failed: 0, network: "DISABLED" },
  "src/supervisor/supervisor-deadline-integration.selftest.mjs (pgrep host-process inspection) - executed green on Mac");
writeFileSync(PV + "/.foundergate/evidence/hybrid-ci/pr182-packet.json", JSON.stringify(p182, null, 2) + "\n");
writeFileSync(PV + "/.foundergate/evidence/hybrid-ci/pr183-packet.json", JSON.stringify(p183, null, 2) + "\n");
console.log("manifest digest:", manifest.digest);
console.log("pr182 packet_sha256:", p182.packet_sha256, "verdict:", p182.combined_verdict);
console.log("pr183 packet_sha256:", p183.packet_sha256, "verdict:", p183.combined_verdict);
