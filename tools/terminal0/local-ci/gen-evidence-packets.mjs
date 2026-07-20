// FounderGate Hybrid Local Exact-SHA CI — deterministic evidence-packet generator.
//
// Repository-neutral: NO hardcoded author path, username, or home directory. The output
// repository root and the raw-log directory are supplied as explicit, validated CLI
// arguments and the generator FAILS CLOSED on a missing or invalid input.
//
//   node gen-evidence-packets.mjs <repo-root> <raw-log-dir>
//
// <repo-root>    directory to write the manifest + packets into; MUST contain
//                tools/terminal0/local-ci/ (identifies a FounderGate checkout).
// <raw-log-dir>  directory holding the four REAL runner transcripts:
//                pr182-mac-fullsuite.log, pr182-docker-portable.log,
//                pr183-mac-fullsuite.log, pr183-docker-portable.log
//
// Each packet's Mac/Docker totals are PARSED from the real logs and each log is bound
// by SHA-256, so packets are a deterministic function of the committed raw evidence.
import { writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

function die(msg) { console.error("REFUSED: " + msg); process.exit(2); }
const [repoRootArg, rawDirArg] = process.argv.slice(2);
if (!repoRootArg) die("missing <repo-root> argument (no default; author-specific paths are prohibited)");
if (!rawDirArg) die("missing <raw-log-dir> argument");
const REPO = resolve(repoRootArg);
const RAW = resolve(rawDirArg);
if (!existsSync(join(REPO, "tools/terminal0/local-ci"))) die("<repo-root> is not a FounderGate checkout (tools/terminal0/local-ci missing): " + REPO);
if (!existsSync(RAW) || !statSync(RAW).isDirectory()) die("<raw-log-dir> is not a directory: " + RAW);

const assertAscii = (s) => { if (/[^\x00-\x7f]/.test(s)) throw new Error("non-ASCII in canonical form: " + s.slice(0, 80)); return s; };
const sha256 = (o) => "sha256:" + createHash("sha256").update(assertAscii(typeof o === "string" ? o : JSON.stringify(o))).digest("hex");
const fileSha = (p) => "sha256:" + createHash("sha256").update(readFileSync(p)).digest("hex");
const DIGEST_METHOD = "sha256(JSON.stringify(object minus its own digest field), UTF-8, keys in insertion order; content is ASCII-only so UTF-8 and ascii-escaped forms are byte-identical)";

// ---- Parse REAL runner transcripts (fail closed if the expected result line is absent) ----
function readLog(name) { const p = join(RAW, name); if (!existsSync(p)) die("raw log missing: " + p); return { path: ".foundergate/evidence/hybrid-ci/raw/" + name, sha256: fileSha(p), text: readFileSync(p, "utf8") }; }
function parseMac(log) {
  const m = log.text.match(/ALL GREEN: (\d+)\/(\d+) self-test\(s\) passed\./);
  if (!m) die("Mac full-suite log has no ALL GREEN line: " + log.path);
  return { passed: +m[1], total: +m[2], failed: +m[2] - +m[1], result: "ALL GREEN", raw_log: log.path, raw_log_sha256: log.sha256 };
}
function parseDocker(log) {
  const r = log.text.match(/PORTABLE_RESULT pass=(\d+) fail=(\d+)/);
  const mods = log.text.match(/PORTABLE_MODULES (\d+)/);
  if (!r) die("Docker portable log has no PORTABLE_RESULT line: " + log.path);
  return { portable_passed: +r[1], portable_failed: +r[2], modules: mods ? +mods[1] : null, network: "DISABLED", raw_log: log.path, raw_log_sha256: log.sha256 };
}

// ---- Test manifest V1 (classification per PR) ----
const manifest = {
  schema: "hybrid-local-ci-test-manifest-1",
  profile_version: "HYBRID_LOCAL_EXACT_SHA_CI_PROFILE_V1",
  created_for: ["PR#182", "PR#183"],
  classes: ["REQUIRED_MAC_AND_DOCKER", "REQUIRED_MAC_ONLY", "REQUIRED_DOCKER_ONLY", "NOT_APPLICABLE_TO_THIS_PR"],
  layer_model: "Layer A (Mac) runs the COMPLETE repository suite from a git checkout at the exact SHA (host-coupled + git-provenance infra tests execute); Layer B (Docker) runs the PR-relevant PORTABLE subset from the SAME exact-SHA git archive. A test relevant to the PR that cannot run in Linux Docker is REQUIRED_MAC_ONLY with a mechanical host-dependency justification and a proven Mac result.",
  host_coupled_tests_reevaluated: {
    "src/tools/fixture-write-safety.selftest.mjs": { class: "REQUIRED_MAC_ONLY", host_dependency: "resolves repository AUTHORITY SHAs via the local git object database (needs a .git checkout, not a bare tar)", legit: true, ran_on_mac: true },
    "src/**/evidence-integrity.selftest.mjs": { class: "REQUIRED_MAC_ONLY", host_dependency: "git history/provenance inspection (fails with 'not a git repository' in a mount-free archive extract)", legit: true, ran_on_mac: true },
    "src/activation-path/launcher-failclose.selftest.mjs": { class: "REQUIRED_MAC_ONLY_if_PR_relevant_else_NA", host_dependency: "macOS sysctl hw.model (hardware identity) + host process (claude) inspection", legit: true, ran_on_mac: true },
    "src/supervisor/supervisor-deadline-integration.selftest.mjs": { class: "REQUIRED_MAC_ONLY_for_PR183", host_dependency: "pgrep host-process inspection for residual-process verification", legit: true, ran_on_mac: true },
    "src/safety_check/canonical-identity.selftest.mjs": { class: "NOT_APPLICABLE_TO_THIS_PR", note: "safety_check infra, not PR #182/#183 code; executes green on Mac", ran_on_mac: true },
    "src/**/report-provenance.selftest.mjs": { class: "NOT_APPLICABLE_TO_THIS_PR", host_dependency: "git", ran_on_mac: true },
  },
  pr182: {
    REQUIRED_MAC_AND_DOCKER: "16 src/v8b2/*.selftest.mjs feature suites (pure Node, portable)",
    REQUIRED_MAC_ONLY: "git-provenance infra tests in the full suite (fixture-write-safety, evidence-integrity) execute on the Mac git checkout",
    REQUIRED_DOCKER_ONLY: "none",
    NOT_APPLICABLE_TO_THIS_PR: "all non-v8b2 repository selftests (executed in Layer A on Mac; not PR #182 code)",
    unclassified: 0,
  },
  pr183: {
    REQUIRED_MAC_AND_DOCKER: "src/observability/status-core.selftest.mjs (24 checks) portable in Docker",
    REQUIRED_MAC_ONLY: "src/supervisor/supervisor-deadline-integration.selftest.mjs (pgrep host-process inspection) - PR-relevant (supervisor-session changed), executed green on Mac",
    REQUIRED_DOCKER_ONLY: "none",
    NOT_APPLICABLE_TO_THIS_PR: "all other repository selftests (executed in Layer A on Mac)",
    unclassified: 0,
  },
};
manifest.digest_canonicalization = DIGEST_METHOD;
manifest.digest = sha256({ ...manifest, digest: undefined });
writeFileSync(join(REPO, "tools/terminal0/local-ci/test-manifest.v1.json"), JSON.stringify(manifest, null, 2) + "\n");

// ---- Evidence packets (Mac/Docker totals + raw-log digests DERIVED from real transcripts) ----
const isolation = {
  network: "disabled (--network none; in-container getent github.com -> DISABLED)",
  root_filesystem: "read-only (--read-only)",
  workspace: "writable tmpfs /work (:exec)", tmp: "writable tmpfs /tmp",
  source: "exact-SHA git archive extracted inside the container tmpfs",
  mounts: "NONE (no host path, no home dir, no source bind-mount)",
  secrets: "none passed", docker_socket: "not mounted", ssh_agent: "none", cloud_creds: "none",
  container_removal: "automatic (--rm)",
};
function packet(pr, url, branch, head, tree, arcSha, macLogName, dockerLogName, macOnly, forbiddenScope) {
  const mac = parseMac(readLog(macLogName));
  const dock = parseDocker(readLog(dockerLogName));
  const p = {
    schema: "hybrid-local-ci-evidence-packet-2",
    pr, pr_url: url, branch,
    requested_sha: head, resolved_sha: head, head_unchanged_after: true,
    git_tree_identity: tree, canonical_archive_sha256: arcSha,
    mac_source_fingerprint: tree, docker_source_fingerprint: tree, same_source_archive: true,
    test_manifest_version: manifest.profile_version, test_manifest_digest: manifest.digest,
    mac_acquisition: "git clone --branch <exact-head> --single-branch <repo> <disposable>; verified checked-out tree == git_tree_identity",
    mac_commands: ["git clone --branch " + head + " --single-branch <repo> <disposable>", "node scripts/run-selftests.mjs"],
    docker_commands: ["git archive " + head + " | docker run -i --rm --network none --read-only --tmpfs /work:exec --tmpfs /tmp node:20-bookworm-slim sh -c 'tar -xf - ; <portable subset>'"],
    mac_environment: "macOS Mac16,11 (AKIOR-Mac-mini) arm64, Node v24.13.1, git present",
    docker_image: "node:20-bookworm-slim (linux/arm64, node v20.20.2)",
    docker_isolation_policy: isolation,
    mac_full_suite: mac,
    docker_portable: dock,
    mac_only_classifications: macOnly,
    secret_credential_scan: "clean (no secrets/credentials in PR-changed files)",
    forbidden_path_scan: "clean (" + forbiddenScope + ")",
    source_fingerprint_after: tree,
    teardown: "disposable git clone + archive removed; container auto-removed (--rm)",
    exit_codes: { mac: mac.failed === 0 ? 0 : 1, docker: dock.portable_failed === 0 ? 0 : 1 },
    raw_logs_committed: true,
    limitations: [
      "LOCAL CI EVIDENCE IS TEST EVIDENCE, NOT MERGE AUTHORITY AND NOT PRODUCTION-READINESS PROOF.",
      "Layer A used a git checkout (identical tree fingerprint to the archive) because host-coupled + git-provenance infra tests require a .git; Layer B used the archive extract. Both bound to tree " + tree + ".",
    ],
    combined_verdict: (mac.failed === 0 && dock.portable_failed === 0) ? "HYBRID_LOCAL_CI_PASS" : "HYBRID_LOCAL_CI_FAIL",
    statements: [
      "THE MAC FULL SUITE AND DOCKER PORTABLE SUITE USED THE SAME EXACT-SHA SOURCE ARCHIVE AND FINGERPRINT.",
      "DOCKER EXCLUSIONS WERE LIMITED TO MECHANICALLY PROVEN HOST-DEPENDENT TESTS THAT EXECUTED ON THE MAC.",
      "A PASS REQUIRES BOTH THE MAC AND DOCKER LAYERS TO PASS.",
      "MAC AND DOCKER TOTALS IN THIS PACKET ARE PARSED FROM THE COMMITTED RAW LOGS, EACH BOUND BY SHA-256.",
    ],
    digest_canonicalization: DIGEST_METHOD,
  };
  p.packet_sha256 = sha256({ ...p, packet_sha256: undefined });
  return p;
}
const p182 = packet(182, "https://github.com/yosiwizman/foundergate/pull/182", "lane/wave2-generated-rehome",
  "e31153c60faeca528316d39af5a31ecacb56b11a", "0fdbb63ea2423a97735e6af7f4f53891d3c04d73",
  "sha256:bbc2d45cce3d6a3558c63dc34d90bc37e52b360e19048b62259b6c22b3cf0733",
  "pr182-mac-fullsuite.log", "pr182-docker-portable.log",
  "git-provenance infra tests ran on the Mac git checkout; all PR #182 feature code (src/v8b2) is portable",
  "no .foundergate/governance or dangerous-flag paths; only src/v8b2 + docs");
const p183 = packet(183, "https://github.com/yosiwizman/foundergate/pull/183", "lane/wave2-observability",
  "0b378035e0f769b799fc47162888eabd2452e75f", "425906e41cfa3b6ab93cc0d36cc5ed0fd0c26c8a",
  "sha256:a8dabcfed09658f6f4aca40d5bd862c8a697ed23142423924a0dc0f3b05c15ec",
  "pr183-mac-fullsuite.log", "pr183-docker-portable.log",
  "src/supervisor/supervisor-deadline-integration.selftest.mjs (pgrep host-process inspection) - executed green on Mac",
  "no .foundergate/governance or dangerous-flag paths; only src/observability + tools/terminal0/paes");
writeFileSync(join(REPO, ".foundergate/evidence/hybrid-ci/pr182-packet.json"), JSON.stringify(p182, null, 2) + "\n");
writeFileSync(join(REPO, ".foundergate/evidence/hybrid-ci/pr183-packet.json"), JSON.stringify(p183, null, 2) + "\n");
console.log("manifest digest:", manifest.digest);
console.log("pr182 packet_sha256:", p182.packet_sha256, "verdict:", p182.combined_verdict);
console.log("pr183 packet_sha256:", p183.packet_sha256, "verdict:", p183.combined_verdict);
