// FounderGate LRCQ — REAL-path test matrix (migrated to V4 by FG-LRCQ-ACT-029).
// The REAL-mode orchestrator contract now also requires a genuine SUPERVISOR_EXECUTION capability, so the
// REAL-mode matrix runs in test-support/bodies/real-launch.body.mjs under the governed execution child. The
// PURE layers — the manifest loader, the non-authoritative projection, the real machine verifier's own
// check aggregation, the checker route's fail-closed verdicts, and the committed packet/disclosure — stay
// in-process here. No `|| true`, no tautologies, never real Claude.
import { runHarness, RUNTIME_KIND, REQUIRED_REAL_SEAMS } from "../run-harness/harness.mjs";
import { loadAndVerifyManifest } from "../run-harness/run-manifest.mjs";
import * as SEAMS from "../run-harness/real-seams.mjs";
import * as pv4 from "../assurance/activation-v4.mjs";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runV4Body, reportChecks } from "./test-support/v4-run-body.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const job = (id, over = {}) => ({ job_id: id, title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/" + id + ".mjs"], forbidden_files: [], branch: "lane/" + id, worktree: "/wt/" + id, expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING", ...over });

// ===== the REAL-mode matrix, under a GENUINE SUPERVISOR_EXECUTION capability =====
{
  const res = await runV4Body({
    worldOpts: { prefix: "fg-reallaunch-", nonce: "reallaunch", run_id: "run-X", reviewedRuntimeSha: "R", backlogDigest: "FD", providerPath: "/approved/claude", providerIdentity: "id:approved" },
    bodyModule: join(HERE, "test-support/bodies/real-launch.body.mjs"), configName: "reallaunch-config.json", timeoutMs: 300000,
  });
  reportChecks(res, ok);
}

// ---- manifest loader (all 8 path-digest pairs; placeholder/path-digest symmetry) ----
{ const crypto = await import("node:crypto");
  const dir = mkdtempSync(join(tmpdir(), "lrcq-man-"));
  const mk = (name, obj) => { const f = join(dir, name); writeFileSync(f, JSON.stringify(obj)); return f; };
  const dg = (f) => "sha256:" + crypto.createHash("sha256").update(readFileSync(f)).digest("hex");
  const bl = mk("backlog.json", { jobs: [job("a")] });
  const files = { backlog: bl, lease: mk("lease.json", { t: 1 }), blast: mk("blast.json", { t: 1 }), setup: mk("setup.json", { t: 1 }), mv: mk("mv.json", { t: 1 }), checker: mk("checker.json", { t: 1 }), allowed: mk("allowed.json", { t: 1 }), denied: mk("denied.json", { t: 1 }) };
  const good = pad({
    backlog_path: files.backlog, backlog_digest: dg(files.backlog),
    capability_lease_manifest_path: files.lease, capability_lease_manifest_digest: dg(files.lease),
    blast_budget_manifest_path: files.blast, blast_budget_manifest_digest: dg(files.blast),
    setup_contract_path: files.setup, setup_contract_digest: dg(files.setup),
    machine_verifier_contract_path: files.mv, machine_verifier_contract_digest: dg(files.mv),
    checker_contract_path: files.checker, checker_contract_digest: dg(files.checker),
    allowed_tools_manifest_path: files.allowed, allowed_tools_manifest_digest: dg(files.allowed),
    denied_tools_manifest_path: files.denied, denied_tools_manifest_digest: dg(files.denied),
  });
  ok("M1 complete manifest (all 8 pairs) verifies", loadAndVerifyManifest(good).valid === true);
  ok("M2 wrong digest refused", loadAndVerifyManifest({ ...good, backlog_digest: "sha256:" + "d".repeat(64) }).valid === false);
  ok("M3 path without digest refused", loadAndVerifyManifest({ ...good, backlog_digest: undefined }).refusals.some((r) => /path without digest/.test(r)));
  ok("M5 digest without path refused", loadAndVerifyManifest({ ...good, backlog_path: undefined }).refusals.some((r) => /digest without path/.test(r)));
  ok("M4 placeholder refused", loadAndVerifyManifest({ ...good, provider_executable_path: "<founder-fills>" }).refusals.some((r) => /placeholder/.test(r)));
  ok("M6 unreadable path refused", loadAndVerifyManifest({ ...good, backlog_path: "/nonexistent/x.json", backlog_digest: good.backlog_digest }).refusals.some((r) => /unreadable/.test(r)));
}
function pad(m) { const base = { job_count: 1, estimated_minutes: 5, repository_root: "/r", permitted_worktree_root: "/w", branch_prefix: "lane/", evidence_root: "/e", recovery_state_path: "/e/r", ledger_path: "/e/l", transaction_registry_path: "/e/t", replay_stream_path: "/e/rp", evidence_index_path: "/e/ei", next_safe_action_path: "/e/n", run_lock_path: "/e/lock", pause_file_path: "/e/p", stop_file_path: "/e/s", provider_executable_path: "/approved/claude", resolved_provider_target: "/approved/claude", provider_version: "1", provider_executable_identity: "sha256:" + "a".repeat(64), max_cost_usd: 10, max_parallel_width: 2, max_duration_s: 18000, per_job_timeout_s: 2700, output_cap_bytes: 10485760, termination_grace_s: 30, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true }; return { ...base, ...m }; }

// ---- packet checks (33 placeholder, 34 obsolete SHA) ----
{ const packetPath = new URL("../../../../.foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json", import.meta.url);
  let packet = null; try { packet = JSON.parse(readFileSync(packetPath, "utf8")); } catch { /* generated separately */ }
  if (packet) {
    ok("33 committed packet is placeholder-free (no <founder-fills)", !/<\s*founder|founder-fills/i.test(JSON.stringify(packet)));
    ok("34 packet founder_signature is null (unsigned, confers no authority)", packet.founder_signature === null && packet.confers_no_authority === true);
    ok("P1 packet is a V4 activation payload", packet.schema === "lrcq-activation-4" && packet.signature_payload_version === "lrcq-activation-v4-signature-payload-1" && packet.founder_signature_algorithm === "ed25519");
    ok("P2 packet binds the SIGNED repository + git-common-dir + lifecycle roots", typeof packet.repository_root_realpath === "string" && typeof packet.repository_git_common_dir_realpath === "string" && typeof packet.lifecycle_root_realpath === "string");
    ok("P3 packet binds real provider identity (sha256) + an immutable resolved target", /^sha256:[0-9a-f]{64}$/.test(packet.provider_executable_identity || "") && typeof packet.resolved_provider_target === "string");
    ok("P4 packet binds a run manifest path + digest", typeof packet.run_manifest_path === "string" && typeof packet.run_manifest_digest === "string" && packet.run_manifest_digest.startsWith("sha256:"));
    ok("P5 packet carries EVERY V4 signed payload field as a key", (() => { const { V4_PAYLOAD_FIELDS } = pv4; return V4_PAYLOAD_FIELDS.every((f) => f in packet); })());
    ok("P6 exactly the founder-filled fields are null (everything else is mechanically resolved)", (() => { const { V4_PAYLOAD_FIELDS } = pv4; const nulls = V4_PAYLOAD_FIELDS.filter((f) => packet[f] === null || packet[f] === "").sort(); return JSON.stringify(nulls) === JSON.stringify(["activation_nonce", "authorization_text_digest", "expiry_epoch", "hard_deadline_epoch", "issued_epoch", "signer_key_fingerprint"]); })());
    ok("P7 the template is UNSIGNED and says so", packet.unsigned === true && packet.founder_signature === null && packet.confers_no_authority === true && Array.isArray(packet.unresolved_before_signature) && packet.unresolved_before_signature.length >= 6);
    ok("P8 the packet binds the V4 authority-core module digests", /^sha256:[0-9a-f]{64}$/.test(packet.lifecycle_authority_v4_digest || "") && /^sha256:[0-9a-f]{64}$/.test(packet.activation_v4_digest || "") && /^sha256:[0-9a-f]{64}$/.test(packet.founder_key_authority_digest || "") && /^sha256:[0-9a-f]{64}$/.test(packet.v4_legacy_projection_digest || ""));
  } else { ok("33/34 packet present", false); }
}

// ---- F1: the NON-AUTHORITATIVE V4 projection reaches the provider adapter ----
// FG-LRCQ-ACT-029: the retired V3->V2 composer is gone. The only V2-shaped record for new execution is the
// projection of a genuine SUPERVISOR_EXECUTION capability, and a fabricated projection opens nothing (proven
// at the spawn boundary in real-provider/v3-retirement). Here we prove the projection is well-formed for the
// adapter contract and that it CANNOT be built without a real capability.
{ const { projectLegacyActivationV4, projectLegacyBindingsV4, projectionMatchesCapability } = await import("../run-harness/v4-legacy-projection.mjs");
  const { validateActivation, denyListSemanticGaps } = await import("../provider/activation-schema.mjs");
  let threw = null;
  try { projectLegacyActivationV4({ _stage: "SUPERVISOR_EXECUTION" }, { repository_root: "/r" }, {}, "builder", {}); } catch (e) { threw = e.message; }
  ok("F1 the projection REFUSES to build without a genuine SUPERVISOR_EXECUTION capability", /SUPERVISOR_EXECUTION capability required/.test(threw || ""));
  ok("F1b a fabricated V2 record is not a projection of any capability", projectionMatchesCapability({ schema_version: "lrcq-activation-2", founder_signature: "sig" }, { _stage: "SUPERVISOR_EXECUTION" }) === false);
  ok("F1c the projection's deny-list semantically covers every prohibited class", denyListSemanticGaps((await import("../run-harness/v4-legacy-projection.mjs")).SEMANTIC_DENY).length === 0);
  ok("F1d the projection is explicitly non-authoritative", (await import("../run-harness/v4-legacy-projection.mjs")).NON_AUTHORITATIVE_SIGNATURE === "NON_AUTHORITATIVE_V4_PROJECTION");
  ok("F1e projectLegacyBindingsV4 derives bindings only from capability fields", (() => { const b = projectLegacyBindingsV4({ lrcq_base_sha: "L", provider_identity: "id", evaluated_candidate: "R" }, { nowEpoch: 5 }); return b.lrcq_base_sha === "L" && b.provider_identity === "id" && b.run_harness_candidate_sha === "R" && b.now_epoch === 5 && b.active_run === false && b.recovery_resolved === true; })());
}
// F2b: the real independent checker route returns INSUFFICIENT_EVIDENCE (never invented CLEAN)
// when its routed session does not yield a definitive CLEAN verdict.
{ const { realIndependentCheckerRoute } = SEAMS;
  const route = realIndependentCheckerRoute({ dispatchCheckerSession: async () => ({ verdict: "INSUFFICIENT_EVIDENCE" }) });
  const r = await route(job("x"), { session_id: "b", prompt_digest: "bp" }, 1);
  ok("F2b checker route -> INSUFFICIENT_EVIDENCE when session non-CLEAN (never invents CLEAN)", r.result === "INSUFFICIENT_EVIDENCE");
  const route2 = realIndependentCheckerRoute({}); // no session configured -> fail closed
  ok("F2c checker route with no session configured -> INSUFFICIENT_EVIDENCE (fail-closed)", (await route2(job("y"), { session_id: "b", prompt_digest: "bp" }, 1)).result === "INSUFFICIENT_EVIDENCE");
}

// ---- CF2: realMachineVerifier's OWN check-aggregation (mutation to always-pass must break these) ----
{ const mkGit = (branch, changed, numstat) => (args) => { const k = args.join(" "); if (k.includes("--abbrev-ref")) return branch; if (k === "diff --name-only HEAD") return changed.join("\n"); if (k === "diff --numstat HEAD") return numstat; return ""; };
  const j = { job_id: "mv", branch: "lane/mv", worktree: "/wt/mv", allowed_files: ["src/x/"], forbidden_files: ["secrets"], max_changed_lines: 100, tests: ["t"], required_evidence: [] };
  const pass = SEAMS.realMachineVerifier({ gitRunner: mkGit("lane/mv", ["src/x/mv.mjs"], "3\t1\tsrc/x/mv.mjs"), exists: () => true });
  ok("CF2a real MV PASSES when branch+files+lines+tests all satisfy", (await pass(j, {}, {})).pass === true);
  const wrongBranch = SEAMS.realMachineVerifier({ gitRunner: mkGit("main", ["src/x/mv.mjs"], "3\t1\tsrc/x/mv.mjs"), exists: () => true });
  ok("CF2b real MV FAILS on wrong branch", (await wrongBranch(j, {}, {})).pass === false);
  const outsideAllowed = SEAMS.realMachineVerifier({ gitRunner: mkGit("lane/mv", ["src/OTHER/z.mjs"], "3\t1\tsrc/OTHER/z.mjs"), exists: () => true });
  ok("CF2c real MV FAILS on change outside allowed boundary", (await outsideAllowed(j, {}, {})).pass === false);
  const forbidden = SEAMS.realMachineVerifier({ gitRunner: mkGit("lane/mv", ["src/x/secrets"], "3\t1\tsrc/x/secrets"), exists: () => true });
  ok("CF2d real MV FAILS on forbidden file touched", (await forbidden(j, {}, {})).pass === false);
  const overBudget = SEAMS.realMachineVerifier({ gitRunner: mkGit("lane/mv", ["src/x/mv.mjs"], "900\t900\tsrc/x/mv.mjs"), exists: () => true });
  ok("CF2e real MV FAILS over changed-line budget", (await overBudget(j, {}, {})).pass === false);
}
// disclosure artifact must exist + be honest (regression for CF1)
{ const dp = new URL("../../../../.foundergate/evidence/lrcq-assurance-factory/REAL_RUN_CAPABILITY_DISCLOSURE.json", import.meta.url);
  let d = null; try { d = JSON.parse(readFileSync(dp, "utf8")); } catch { /* */ }
  ok("CF1 disclosure file exists + is a real object (not the string 'undefined')", d && typeof d === "object" && typeof d.NOT_proven_in_preparation === "string" && /not.*(proven|exercised)/i.test(d.NOT_proven_in_preparation));
  const pk = new URL("../../../../.foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json", import.meta.url);
  let p = null; try { p = JSON.parse(readFileSync(pk, "utf8")); } catch { /* */ }
  ok("CF1b packet carries real_run_capability_disclosure", p && p.real_run_capability_disclosure && typeof p.real_run_capability_disclosure.NOT_proven_in_preparation === "string");
}


console.log("\nLRCQ REAL-LAUNCH SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
