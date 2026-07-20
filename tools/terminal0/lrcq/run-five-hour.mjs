#!/usr/bin/env node
// FounderGate LRCQ — THE ONLY launcher for the first internal five-hour WIDE-SAFE run.
//
// There is exactly one launcher and one provider route. This entry point:
//   1. mechanically resolves the exact bindings (SHAs / trees / digests / provider identity);
//   2. loads a founder-SIGNED activation record from --activation <path>;
//   3. wires the ONE governed provider adapter (real-provider.runJob, which spawns the
//      founder-approved executable_path) as the harness dispatch seam;
//   4. runs the single orchestrator (run-harness/harness.mjs).
//
// SAFETY: without a complete, SIGNED, non-stale activation record whose bindings match the
// mechanically-resolved candidate, the harness refuses BEFORE any dispatch. This launcher
// therefore CANNOT invoke Claude during preparation: the unsigned packet has
// founder_signature: null and is rejected at validate_activation. It never pushes, merges,
// writes protected main, contacts M1/AKIOR, or touches customer data.
//
// Usage:
//   run-five-hour.mjs --resolve-only          # print resolved bindings, do nothing else
//   run-five-hour.mjs --activation <path>      # attempt a run (refused unless signed+matching)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runHarness } from "../../../src/v8b/lrcq/run-harness/harness.mjs";
import { runJob } from "../../../src/v8b/lrcq/provider/real-provider.mjs";
import { createHash } from "node:crypto";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();
const sha256 = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");

// Mechanically resolve the exact three-layer candidate + backlog digests + provider identity.
export function resolveBindings() {
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const masterDigest = sha256(readFileSync(resolve(REPO, ".foundergate/backlog/assurance-control-master-v1.json")));
  const frrDigest = sha256(readFileSync(resolve(REPO, ".foundergate/backlog/first-real-five-hour-run-v1.json")));
  return {
    lrcq_base_sha: "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5",
    lrcq_base_tree: git("rev-parse", "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5^{tree}"),
    provider_candidate_sha: "50e18e55863b4abc0f0c2ef036b790ef15001ac5",
    provider_candidate_tree: git("rev-parse", "50e18e55863b4abc0f0c2ef036b790ef15001ac5^{tree}"),
    run_harness_candidate_sha: head,
    run_harness_candidate_tree: tree,
    assurance_control_backlog_digest: masterDigest,
    first_real_run_backlog_digest: frrDigest,
    // provider identity is filled from the founder-approved executable at run time
    provider_path: null, provider_identity: null,
    now_epoch: null, // intrinsic live clock supplied at run time only
  };
}

// The ONE governed provider route. Spawns the founder-approved executable via the hardened
// adapter. Only reachable AFTER the harness accepts a signed activation record.
async function realDispatch(job, { activation, bindings }) {
  const outcome = await runJob(activation, job, bindings, {});
  return {
    ok: outcome.outcome === "SUCCESS",
    machine_verified: outcome.outcome === "SUCCESS",
    uncertain: outcome.outcome === "UNKNOWN_FAILURE" || outcome.outcome === "TEARDOWN_FAILED",
    obs: { dispatch_exists: true, process_alive: false, definitive_result: outcome.outcome === "SUCCESS" },
    provider_outcome: outcome,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const bindings = resolveBindings();
  if (args.includes("--resolve-only") || args.length === 0) {
    console.log(JSON.stringify({ resolved_bindings: bindings, launcher: "run-five-hour.mjs", single_launcher: true }, null, 2));
    console.log("\nNo activation record supplied — nothing dispatched. This launcher refuses to run without a founder-signed activation record.");
    return 0;
  }
  const ai = args.indexOf("--activation");
  if (ai < 0 || !args[ai + 1]) { console.error("usage: run-five-hour.mjs --activation <path> | --resolve-only"); return 2; }
  const activation = JSON.parse(readFileSync(args[ai + 1], "utf8"));
  const nowEpoch = Math.floor(Date.now() / 1000); // intrinsic live clock at runtime
  const runBindings = { ...bindings, now_epoch: nowEpoch, provider_path: activation.provider_executable_path, provider_identity: activation.provider_executable_identity, candidate_stack: bindings.run_harness_candidate_sha };
  // The harness refuses unless the signed record matches these bindings and is unexpired.
  const result = await runHarness({
    run_id: activation.run_id, activation, bindings: runBindings,
    now: nowEpoch, deadlineEpoch: activation.hard_deadline_epoch, maxWidth: activation.max_parallel_width,
    master_digest: bindings.assurance_control_backlog_digest, lease_digest: activation.capability_lease_digest, blast_digest: activation.blast_radius_budget_digest,
    lease: null, blast_budget: null, backlog: [], // supplied from the signed manifest in a real run
    dispatch: realDispatch,
  });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

main().then((c) => process.exit(c)).catch((e) => { console.error("launcher error:", e.message); process.exit(3); });
