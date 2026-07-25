// FounderGate LRCQ — preflight false-green regression, V4 (FG-LRCQ-ACT-004; migrated by FG-LRCQ-ACT-029).
// Spawns the REAL launcher (deterministic; NO Claude, ZERO provider invocation) and asserts:
//   * a historical V3 material packet is a BINDING-DEFECT (V3 is refused for execution);
//   * a V4 template bound to the exact current HEAD + the real manifest + the installed reviewed provider
//     target reports SIGNATURE-REQUIRED with the founder gate identified as KEY_ENROLLMENT (active_keys is
//     empty), and zero invocation;
//   * a pending founder act NEVER masks a binding defect: a wrong candidate SHA, a wrong provider identity,
//     a manifest-digest drift, or a symlinked provider target each report BINDING-DEFECT.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, existsSync, realpathSync, symlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond, detail) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name + (detail ? " [" + String(detail).slice(0, 300) + "]" : "")); } else console.log("  ok   " + name); };
const REPO = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../../.."));
const LAUNCHER = join(REPO, "tools/terminal0/lrcq/run-five-hour.mjs");
const PACKET = join(REPO, ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json");
const MANIFEST = join(REPO, ".foundergate/run-materials/first-internal-5h/run-manifest.json");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();
const sha256File = (p) => "sha256:" + createHash("sha256").update(readFileSync(p)).digest("hex");
const run = (args) => { try { return execFileSync("node", [LAUNCHER, ...args], { encoding: "utf8" }); } catch (e) { return (e.stdout || "") + (e.stderr || ""); } };
const tmp = mkdtempSync(join(tmpdir(), "lrcq-pf4-"));

const HEAD = git("rev-parse", "HEAD"), HTREE = git("rev-parse", "HEAD^{tree}");
// the currently installed reviewed provider target (a regular, non-symlink versioned file)
const alias = join(process.env.HOME, ".local/bin/claude");
const installedTarget = existsSync(alias) ? realpathSync(alias) : null;

// ---- 1. a historical V3 material packet is refused for execution -> BINDING-DEFECT ----
{ const out = run(["--preflight-v4", PACKET]);
  ok("01 the historical V3 material packet -> BINDING-DEFECT (V3 refused for execution)", /LRCQ-REAL-LAUNCH-PREFLIGHT: BINDING-DEFECT/.test(out) && !/SIGNATURE-REQUIRED/.test(out), out.slice(-300)); }

// ---- 2. a V4 template bound to the EXACT current state -> SIGNATURE-REQUIRED (KEY_ENROLLMENT gate) ----
const v4Template = (over = {}) => ({
  schema: "lrcq-activation-4", signature_payload_version: "lrcq-activation-v4-signature-payload-1",
  founder_signature_algorithm: "ed25519", signer_key_fingerprint: "sha256:" + "0".repeat(64),
  authorization_text_digest: "sha256:" + "1".repeat(64), activation_nonce: "preflight-probe",
  repository_root_realpath: REPO, repository_git_common_dir_realpath: realpathSync(git("rev-parse", "--git-common-dir")),
  lifecycle_root_realpath: join(REPO, ".foundergate/lifecycle"), lifecycle_contract_version: "lrcq-lifecycle-v4-1",
  evidence_commit_sha: HEAD, evidence_commit_tree: HTREE,
  reviewed_runtime_sha: HEAD, reviewed_runtime_tree: HTREE,
  run_manifest_path: ".foundergate/run-materials/first-internal-5h/run-manifest.json",
  run_manifest_digest: sha256File(MANIFEST),
  lrcq_base_sha: "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5", lrcq_base_tree: git("rev-parse", "3794ec1^{tree}"),
  provider_candidate_sha: "50e18e55863b4abc0f0c2ef036b790ef15001ac5", provider_candidate_tree: git("rev-parse", "50e18e5^{tree}"),
  run_id: "lrcq-first-internal-5h-run", backlog_digest: sha256File(join(REPO, ".foundergate/backlog/first-real-five-hour-run-v2.json")),
  provider_executable_path: alias, resolved_provider_target: installedTarget,
  provider_version: installedTarget ? installedTarget.split("/").pop() : "0.0.0",
  provider_executable_identity: installedTarget ? sha256File(installedTarget) : "sha256:" + "2".repeat(64),
  capability_lease_digest: "sha256:" + "3".repeat(64), blast_radius_budget_digest: "sha256:" + "4".repeat(64),
  issued_epoch: 1_700_000_000, expiry_epoch: 9_999_999_999, hard_deadline_epoch: 9_999_999_998,
  max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700, max_parallel_width: 2,
  max_output_bytes: 10485760, termination_grace_s: 30,
  no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true,
  no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true,
  ...over,
});
const write = (name, obj) => { const p = join(tmp, name); writeFileSync(p, JSON.stringify(obj, null, 2) + "\n"); return p; };

ok("02pre a reviewed provider target is installed on this host", !!installedTarget, String(installedTarget));
{ const out = run(["--final-template-preflight", write("v4-head.json", v4Template())]);
  ok("02 V4 template bound to the exact HEAD + manifest + installed target -> SIGNATURE-REQUIRED", /LRCQ-REAL-LAUNCH-PREFLIGHT: SIGNATURE-REQUIRED/.test(out), out.slice(-500));
  ok("02b the founder gate is KEY_ENROLLMENT (active_keys is empty)", /"founder_gate":\s*"KEY_ENROLLMENT"/.test(out), out.slice(-500));
  ok("02c the preflight reports zero invocation", /"zero_invocation":\s*true/.test(out) && /"zero_provider_invocation":\s*true/.test(out));
  ok("02d the preflight verified the SIGNED manifest + the reviewed provider target by digest ONLY", /"signed_manifest":\s*"VERIFIED"/.test(out) && /"provider_target":\s*"VERIFIED \(digest only; provider never executed\)"/.test(out), out.slice(-600));
  ok("02e no binding defects are reported", /"binding_defects":\s*\[\]/.test(out), out.slice(-400)); }

// ---- 3-6. a pending founder act never masks a binding defect ----
{ const out = run(["--final-template-preflight", write("wrong-cand.json", v4Template({ evidence_commit_sha: "0".repeat(40) }))]);
  ok("03 wrong candidate SHA -> BINDING-DEFECT (not masked by the pending founder act)", /BINDING-DEFECT/.test(out) && !/SIGNATURE-REQUIRED/.test(out)); }
{ const out = run(["--final-template-preflight", write("wrong-prov.json", v4Template({ provider_executable_identity: "sha256:" + "e".repeat(64) }))]);
  ok("04 wrong provider identity -> BINDING-DEFECT", /BINDING-DEFECT/.test(out) && /provider_executable_identity/.test(out)); }
{ const out = run(["--final-template-preflight", write("wrong-man.json", v4Template({ run_manifest_digest: "sha256:" + "f".repeat(64) }))]);
  ok("05 manifest digest drift -> BINDING-DEFECT", /BINDING-DEFECT/.test(out) && /run_manifest_digest/.test(out)); }
{ const link = join(tmp, "alias-target"); try { symlinkSync(installedTarget || "/bin/sh", link); } catch { /* */ }
  const out = run(["--final-template-preflight", write("alias-prov.json", v4Template({ resolved_provider_target: link, provider_executable_identity: sha256File(link) }))]);
  ok("06 a SYMLINKED provider target (mutable alias) -> BINDING-DEFECT", /BINDING-DEFECT/.test(out) && /mutable alias/.test(out), out.slice(-400)); }
{ const out = run(["--final-template-preflight", write("no-man.json", (() => { const t = v4Template(); delete t.run_manifest_path; delete t.run_manifest_digest; return t; })())]);
  ok("07 a template binding no run manifest -> BINDING-DEFECT", /BINDING-DEFECT/.test(out)); }

// ---- 8. resolve-only dispatches nothing ----
ok("08 --resolve-only dispatches nothing", /single_launcher/.test(run(["--resolve-only"])) && !/PREFLIGHT/.test(run(["--resolve-only"])));
ok("09 --resolve-only reports the V4 authority + the governed supervisor entrypoint", /"authority":\s*"V4"/.test(run(["--resolve-only"])) && /supervisor-main\.mjs/.test(run(["--resolve-only"])));

console.log("\nLRCQ PREFLIGHT SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
