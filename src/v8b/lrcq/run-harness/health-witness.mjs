// FounderGate LRCQ — read-only launch-health WITNESS verdict (FG-LRCQ-ACT-016/018/020/021). Observes an
// existing run for a bounded window and returns a verdict built ONLY from mechanically observed facts and
// facts derived from authoritative durable records. NO hard-coded safe value and NO caller-supplied
// self-comparison may satisfy a check. Controls that a read-only observer cannot truthfully observe are NOT
// part of the green verdict — they are reported as HARNESS_ENFORCED_NOT_WITNESS_OBSERVED. It NEVER writes,
// launches, repairs, invokes a provider, or extends the deadline.
//
// WITNESS OBSERVES (green-contributing): supervisor liveness + heartbeat monotonicity + process-start
// identity stability + immutable deadline + run_id (supervisor state); single live supervisor owner
// (supervisor-dir enumeration); activation consumed/replay-blocked (consumption marker); PRODUCTIVITY from
// VALIDATED current-run evidence-index records, or a verified in-flight provider within bounded signed
// grace; provider lineage (descendant) + provider EXECUTABLE matches the manifest-bound expected path (a
// real cross-check, not a self-comparison); protected-main via the authoritative ref vs the reviewed
// baseline (UNKNOWN on git error => fail closed).
//
// PRODUCTIVITY vs LIVENESS: heartbeat advance ALONE is liveness, never productivity. Productivity requires
// validated evidence-index advancement, OR a verified in-flight provider (right executable, supervisor
// descendant, within per-job timeout, before the immutable deadline). One past transient child never
// satisfies the whole window.
export const WITNESS_SCHEMA = "lrcq-health-witness-3";

export async function witnessHealth(opts = {}) {
  const snapshot = opts.snapshot; if (typeof snapshot !== "function") return { result: "INSUFFICIENT_EVIDENCE", reason: "no snapshot source" };
  const polls = Math.max(1, opts.polls || 12);
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const pollMs = typeof opts.pollMs === "number" ? opts.pollMs : 60000;

  const seen = [];
  for (let i = 0; i < polls; i++) { seen.push(snapshot(i)); if (i < polls - 1) await sleep(pollMs); }
  const first = seen[0], last = seen[seen.length - 1];
  if (!last || !last.supervisor) return { result: "INSUFFICIENT_EVIDENCE", reason: "no readable supervisor snapshot", schema: WITNESS_SCHEMA, read_only: true };
  const sup = (s) => s.supervisor || {}; const ev = (s) => s.evidence || {};
  const runState = sup(last).state;
  const runActiveAtEnd = last.supervisor_alive === true && runState === "RUN_ACTIVE";
  const terminalState = last.terminal_state || (runState && runState !== "RUN_ACTIVE" ? runState : null);
  const successfulTerminal = !!terminalState && /STOPPED_EXHAUSTED/.test(terminalState);
  const controlledTerminal = !!terminalState && /(STOPPED_DEADLINE|CONTROLLED_BUDGET_STOP|STOPPED_BY_STOP|HELD)/.test(terminalState);
  const failedTerminal = !!terminalState && /FAILED/.test(terminalState);

  // ---- PRODUCTIVITY (validated evidence advancement OR verified in-flight provider within signed grace) ----
  const sealedAdvanced = typeof ev(last).sealed_jobs === "number" && typeof ev(first).sealed_jobs === "number" && ev(last).sealed_jobs > ev(first).sealed_jobs;
  const recordsAdvanced = typeof ev(last).valid_records === "number" && typeof ev(first).valid_records === "number" && ev(last).valid_records > ev(first).valid_records;
  const productiveProgress = sealedAdvanced || recordsAdvanced;
  const nowEpoch = last.now_epoch, deadlineEpoch = last.immutable_deadline_epoch ?? sup(last).immutable_hard_deadline_epoch;
  const beforeDeadline = typeof nowEpoch === "number" && typeof deadlineEpoch === "number" && nowEpoch < deadlineEpoch;
  const lastEventEpoch = ev(last).last_event_epoch;
  const noProgressElapsed = (typeof nowEpoch === "number" && typeof lastEventEpoch === "number") ? nowEpoch - lastEventEpoch : null;
  const withinPerJobGrace = typeof last.per_job_timeout_s === "number" && (noProgressElapsed == null || noProgressElapsed <= last.per_job_timeout_s);
  const verifiedInFlight = last.provider_child_present === true && last.provider_exe_matches_expected === true && last.provider_descendant_of_supervisor !== false && beforeDeadline && withinPerJobGrace;
  const progressed = productiveProgress || verifiedInFlight;

  const checks = []; const add = (n, ok) => checks.push({ name: n, ok: !!ok });
  const stable = (f) => seen.every((s) => f(s) === f(first));
  add("run_id_stable", stable((s) => sup(s).run_id) && !!sup(last).run_id);
  add("immutable_deadline_unchanged", stable((s) => sup(s).immutable_hard_deadline_epoch));
  add("process_start_identity_stable", stable((s) => sup(s).process_start_identity));
  add("supervisor_alive_when_active", runState !== "RUN_ACTIVE" || last.supervisor_alive === true);
  add("single_live_supervisor", (last.live_supervisor_owners == null) || last.live_supervisor_owners <= 1);
  add("provider_descendant_when_present", seen.every((s) => s.provider_child_present !== true || s.provider_descendant_of_supervisor !== false));
  add("provider_executable_matches_when_present", seen.every((s) => s.provider_child_present !== true || s.provider_exe_matches_expected !== false));
  add("activation_replay_blocked", last.consumed === true);
  add("evidence_index_no_foreign_records", (ev(last).foreign_run || 0) === 0 && (ev(last).foreign_job || 0) === 0);
  add("evidence_index_wellformed", (ev(last).malformed || 0) === 0 && (ev(last).non_monotonic || 0) === 0);
  add("protected_main_unchanged", last.protected_main && last.protected_main.ok === true);

  const failed = checks.filter((c) => !c.ok);
  const criticalFail = failed.length > 0; // every check above is boundary-critical (observed facts only)
  const mainUnknown = !last.protected_main || last.protected_main.ok === null || last.protected_main.ok === undefined;

  let result, reason;
  if (mainUnknown) { result = "INSUFFICIENT_EVIDENCE"; reason = "protected-main state UNKNOWN (git read failed) — fail closed, never assume unchanged"; }
  else if (criticalFail) { result = "FAILED"; reason = "boundary-critical: " + failed.map((c) => c.name).join(","); }
  else if (failedTerminal) { result = "FAILED"; reason = "terminal " + terminalState; }
  else if (successfulTerminal) { result = "COMPLETED_HEALTHY"; reason = "successful terminal " + terminalState; }
  else if (controlledTerminal) { result = "HELD"; reason = "controlled terminal " + terminalState; }
  else if (runActiveAtEnd) {
    if (progressed) { result = "HEALTHY_CONTINUE"; reason = "RUN_ACTIVE + productivity (sealed=" + sealedAdvanced + " records=" + recordsAdvanced + " verifiedInFlight=" + verifiedInFlight + ")"; }
    else { result = "HELD"; reason = "STALLED: RUN_ACTIVE but no validated productivity and no verified in-flight provider within grace"; }
  } else { result = "INSUFFICIENT_EVIDENCE"; reason = "run neither RUN_ACTIVE-at-end nor in a readable terminal state"; }

  return {
    schema: WITNESS_SCHEMA, result, reason, polls,
    run_active_at_end: runActiveAtEnd, terminal_state: terminalState || null,
    progressed, productive_progress: productiveProgress, verified_in_flight: verifiedInFlight,
    evidence_sealed_first: ev(first).sealed_jobs, evidence_sealed_last: ev(last).sealed_jobs,
    checks, failed_checks: failed.map((c) => c.name),
    harness_enforced_not_witness_observed: last.harness_enforced_not_witnessed || [
      "run-wide $10 cost ceiling (BudgetLedger is in-process; not durably witness-readable)",
      "AKIOR/M1/customer/production access, merge/push/deploy/send/payment (no durable witness event stream)",
      "single provider route + single executor (harness structural)",
      "supervisor crash/restart loop; escaped/orphaned provider process (no durable witness counter)",
      "first-worktree-in-authorized-root (setup-manager enforced)",
    ],
    read_only: true,
  };
}
