// FounderGate LRCQ — generate + freeze executable backlog v2 (FG-LRCQ-ACT-010). 25 WIDE_SAFE
// ENDURANCE_FIXTURE jobs with deterministic branch/worktree templates, executable argv tests
// against the IMMUTABLE fixture verifier, expected outputs within allowed_files, immutable evidence,
// and per-session cost caps whose plan-level sum stays under $10. Validated by validateAll25.
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateAll25, resolveRunPlan, runPlanDigest } from "../../../src/v8b/lrcq/run-harness/run-plan.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const P = (p) => resolve(REPO, p);
const VERIFIER = "tools/terminal0/lrcq/verifiers/fixture-verifier.mjs";

const jobs = [];
for (let i = 0; i < 25; i++) {
  const id = "frr2-" + i;
  const out = "src/v8b/lrcq/frr2/" + id + ".mjs";
  jobs.push({
    job_id: id,
    objective: "ENDURANCE_FIXTURE: emit a deterministic FounderGate LRCQ fixture note for endurance job " + i + " (no product claim)",
    done_meaning: "the fixture file exists, is non-empty, and carries the ENDURANCE_FIXTURE marker; the immutable verifier passes",
    risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS",
    classification: "ENDURANCE_FIXTURE",
    dependencies: i >= 1 && i % 5 === 0 ? [("frr2-" + (i - 1))] : [],
    allowed_files: [out], forbidden_files: ["secrets", "PR#182", "PR#186", "protected main", "AKIOR", "M1"],
    branch_suffix: id, worktree_suffix: id,
    test_commands: [["node", VERIFIER, out]],
    negative_test_commands: [],
    expected_output_paths: [out],
    required_evidence_files: [{ path: id + "-verified.json", mode: "must_exist" }],
    evidence_validation_mode: "must_exist",
    max_files: 2, max_changed_lines: 60,
    builder_cost_cap_usd: 0.25, checker_cost_cap_usd: 0.08,
    checker_criteria: ["diff_within_allowed", "tests_executed", "fixture_marker_present"],
    gate_trigger: "NONE",
    rollback_action: "remove the registered worktree + branch for " + id + "; preserve evidence",
  });
}
const backlog = { schema: "lrcq-frr-backlog-2", version: "v2", total: jobs.length, frozen: true, no_live_effects: true, all_endurance_fixtures: true, total_estimated_minutes: 300, jobs };

const manifest = JSON.parse(execFileSync("cat", [P(".foundergate/run-materials/first-internal-5h/run-manifest.json")], { encoding: "utf8" }));
const v = validateAll25(backlog, manifest, { exists: (t) => { try { execFileSync("test", ["-e", P(t)]); return true; } catch { return false; } } });
if (!v.valid) { console.error("BACKLOG V2 INVALID:\n" + v.refusals.join("\n")); process.exit(1); }
const path = ".foundergate/backlog/first-real-five-hour-run-v2.json";
writeFileSync(P(path), JSON.stringify(backlog, null, 2) + "\n");
const digest = "sha256:" + createHash("sha256").update(JSON.stringify(backlog)).digest("hex");
const plans = jobs.map((j) => resolveRunPlan(j, "REAL-RUN", manifest));
console.log("wrote", path, "| jobs:", jobs.length, "| all-25 valid:", v.valid, "| digest:", digest.slice(0, 24));
console.log("plan-cost upper bound: $" + jobs.reduce((s, j) => s + j.builder_cost_cap_usd + j.checker_cost_cap_usd, 0).toFixed(2) + " (<= $10)");
console.log("resolved-plan digest:", runPlanDigest(plans).slice(0, 24), "| sample branch:", plans[0].branch, "| sample worktree:", plans[0].worktree);
