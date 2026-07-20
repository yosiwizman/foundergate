// FounderGate LRCQ — deterministic shadow run of the assurance harness (Tier-1 item 10).
// Drives setup + builder/checker separation + replay + reconciliation end-to-end with
// deterministic stubs (NO real Claude). Proves the governed flow honestly.
import { runSetup, standardChecks } from "../run-harness/setup-pipeline.mjs";
import { SeparationJob } from "../run-harness/separation.mjs";
import { ReplayStream } from "../run-harness/replay.mjs";
import { reconcile, mayResume, canDispatch } from "../reconciliation/transaction.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// 25 synthetic jobs with scripted outcomes.
const scripted = [];
for (let i = 1; i <= 15; i++) scripted.push({ id: "safe" + i, outcome: "pass" });
scripted.push({ id: "chainA", outcome: "pass" }, { id: "chainB", deps: ["chainA"], outcome: "pass" });
scripted.push({ id: "flaky", outcome: "fail_once" });
scripted.push({ id: "broken", outcome: "fail_always" });
scripted.push({ id: "crashIntent", outcome: "crash_after_intent" });
scripted.push({ id: "crashDispatch", outcome: "crash_after_dispatch" });
scripted.push({ id: "reconHold", outcome: "recon_hold" });
scripted.push({ id: "diagBranch", outcome: "diag_branch" });
scripted.push({ id: "abandoned", outcome: "abandon" });
scripted.push({ id: "founderGate", outcome: "gate" });
scripted.push({ id: "unknownClass", outcome: "unknown" });

const B = { session_id: "b", prompt_digest: "pb", read_only: false };
const mkC = (i) => ({ session_id: "c" + i, prompt_digest: "pc" + i, read_only: true });

// setup must pass first
const env = { host_model: "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: "M", expected_master_digest: "M", frr_digest: "F", expected_frr_digest: "F", provider_identity: "ID", expected_provider_identity: "ID", active_run: false, lock_acquired: true, run_id: "shadow", evidence_root: "/ev", ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true };
const checks = { ...standardChecks(env), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) };
ok("00 setup pipeline READY before scheduling", runSetup(checks, env).ready === true);

const rs = new ReplayStream("shadow");
const results = {};
let dispatchedKeys = {};
for (const s of scripted) {
  if (s.outcome === "gate") { results[s.id] = "HELD_FOUNDER_GATE"; continue; }         // never started
  if (s.outcome === "unknown") { results[s.id] = "HELD_UNKNOWN"; continue; }            // never started
  // intent + idempotent dispatch
  const intent = { transaction_id: "tx-" + s.id, idempotency_key: "k-" + s.id, run_id: "shadow", job_id: s.id, attempt: 1, role: "builder", candidate_stack: "s", backlog_digest: "d", lease_digest: "ld", blast_budget_digest: "bd", prompt_digest: "pd", tool_digests: "td", worktree: "/wt/" + s.id, branch: "lane/" + s.id, pre_action_fingerprint: "fp", deadline_epoch: 9e12, budget_usd: 1, evidence_dir: "/ev", state: "AUTHORIZED" };
  const cd = canDispatch(intent, dispatchedKeys);
  if (!cd.ok) { results[s.id] = "DUPLICATE_PREVENTED"; continue; }
  dispatchedKeys[intent.idempotency_key] = { state: "DISPATCHED" };
  rs.append({ run_id: "shadow", job_id: s.id, attempt: 1, role: "builder", provider: "stub", model_id: null, cli_version: "stub", executable_identity: "stub", policy_version: "pv", candidate_stack: "s", prompt_digest: "pd", allowed_tools_digest: "ad", denied_tools_digest: "dd", lease_digest: "ld", blast_budget_digest: "bd", stdout_digest: "od", stderr_digest: "ed", transcript_digest: "td", branch: "lane/" + s.id, worktree: "/wt/" + s.id, pre_fingerprint: "pf", post_fingerprint: "pf", checkpoint_before: "cb", checkpoint_after: "ca", transaction_state: "DISPATCHED", reconciliation_state: "n/a", evidence_path: "/ev", timestamp: 1 });
  // crash / reconciliation outcomes
  if (s.outcome === "crash_after_intent") { results[s.id] = reconcile({ intent_exists: true, dispatch_exists: false, process_alive: false, worktree_unchanged: true }).state; continue; }
  if (s.outcome === "crash_after_dispatch") { results[s.id] = reconcile({ dispatch_exists: true, process_alive: false, definitive_result: false }).state; continue; }
  if (s.outcome === "recon_hold") { results[s.id] = reconcile({ checkpoint_corrupt: true }).state; continue; }
  if (s.outcome === "diag_branch") { results[s.id] = reconcile({ dispatch_exists: true, process_alive: false, definitive_result: false }).recommend; continue; }
  if (s.outcome === "abandon") { results[s.id] = reconcile({}).recommend; continue; }
  // builder/checker separation to completion
  const j = new SeparationJob(s.id, 3); let done = false, attempt = 0;
  while (!done && attempt < 4) {
    attempt++;
    j.startBuilder(B);
    const builderOk = s.outcome === "pass" || (s.outcome === "fail_once" && attempt >= 2);
    j.builderResult(builderOk);
    j.machineVerification(builderOk);
    if (j.state === "PARKED") break;                // repeated machine-verification failure
    if (j.state === "CORRECTION_PENDING") continue; // machine verification failed -> correction cycle
    j.startChecker(mkC(attempt));
    const checkerClean = s.outcome === "pass" || (s.outcome === "fail_once" && attempt >= 2);
    j.checkerResult(checkerClean);
    if (j.state === "CHECKER_CLEAN") { j.complete(); done = true; }
    if (j.state === "PARKED") break;
  }
  results[s.id] = j.state;
}

ok("01 15 safe jobs COMPLETED", Array.from({ length: 15 }, (_, i) => "safe" + (i + 1)).every((id) => results[id] === "COMPLETED"));
ok("02 dependency chain COMPLETED", results.chainA === "COMPLETED" && results.chainB === "COMPLETED");
ok("03 flaky (fail_once) COMPLETED after correction", results.flaky === "COMPLETED");
ok("04 broken (fail_always) PARKED", results.broken === "PARKED");
ok("05 founder-gate NEVER started (HELD)", results.founderGate === "HELD_FOUNDER_GATE");
ok("06 unknown-class NEVER started (HELD)", results.unknownClass === "HELD_UNKNOWN");
ok("07 crash-after-intent -> SAFE_TO_RESUME", results.crashIntent === "SAFE_TO_RESUME");
ok("08 crash-after-dispatch -> NEEDS_RECONCILIATION (no re-fire)", results.crashDispatch === "NEEDS_RECONCILIATION");
ok("09 recon-hold -> HELD (never green)", results.reconHold === "HELD");
ok("10 diagnostic-branch recommend BRANCH", results.diagBranch === "BRANCH");
ok("11 abandoned recommend ABANDON", results.abandoned === "ABANDON");
ok("12 replay chain intact after run", rs.verifyChain().ok);
ok("13 duplicate dispatch prevented (re-dispatch safe1 key)", canDispatch({ transaction_id: "x", idempotency_key: "k-safe1", run_id: "shadow", job_id: "safe1", attempt: 2, role: "builder", candidate_stack: "s", backlog_digest: "d", lease_digest: "l", blast_budget_digest: "b", prompt_digest: "p", tool_digests: "t", worktree: "/wt", branch: "lane/x", pre_action_fingerprint: "f", deadline_epoch: 9e12, budget_usd: 1, evidence_dir: "/e", state: "AUTHORIZED" }, dispatchedKeys).duplicate === true);
ok("14 no job merged/accepted (separation guards)", new SeparationJob("z").canMerge() === false);
ok("15 RESUME only after no-duplicate proof", mayResume(reconcile({ intent_exists: true, worktree_unchanged: true }), true) && !mayResume(reconcile({ intent_exists: true, worktree_unchanged: true }), false));

console.log("\nLRCQ SHADOW-RUN SELFTEST: " + (n - fails.length) + "/" + n + " passed (25 synthetic jobs)");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
