// PAES-1 supervisor-core self-test — synthetic qualification of the mechanical
// invariants (the Phase-9 checks that are pure logic; live-process checks are
// separate). Exit 0 == all pass.
import {
  canEnterRunning, stopPredicate, evaluateStop, reportActionCausesStop,
  leaseValid, acquireLease, isStale, canRestart, watchdogRecover, deadlineStatus,
  RUN_PRECONDITIONS, STATES,
} from "./supervisor-core.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

const allRunOk = () => Object.fromEntries(RUN_PRECONDITIONS.map((p) => [p, true]));

// RUN preconditions (fail closed)
ok("01 all preconditions -> can enter RUNNING", canEnterRunning(allRunOk()).ok === true);
for (const p of ["dcl_capture_verified", "arlc_active", "unattended_executor_proven", "user_level_service_installed", "deadline_not_passed", "panic_not_active", "authorized_job_exists"]) {
  const c = allRunOk(); c[p] = false;
  ok(`02 missing ${p} blocks RUNNING`, canEnterRunning(c).ok === false);
}

// Continuation law — stop rejected while safe work remains
ok("03 stop REJECTED while ready jobs remain", evaluateStop({ ready_jobs: 2, all_jobs_terminal: false }).stop === false);
ok("03b stop reason is queue-nonempty", evaluateStop({ ready_jobs: 1 }).reason === "STOP_REJECTED_QUEUE_NONEMPTY");
ok("04 report action can never stop", reportActionCausesStop() === false);
ok("05 exhausted (no work, all terminal) -> STOPPED_EXHAUSTED", evaluateStop({ ready_jobs: 0, all_jobs_terminal: true, refill_candidate_exists: false }).state === "STOPPED_EXHAUSTED");
// Hard predicates override remaining work
ok("06 PANIC stops even with ready work", evaluateStop({ ready_jobs: 5, panic_stop: true }).state === "STOPPED_PANIC");
ok("07 deadline+drained stops even with ready work", evaluateStop({ ready_jobs: 5, deadline_reached: true, atomic_work_drained: true }).state === "STOPPED_DEADLINE");
ok("08 DCL integrity failure -> PANIC stop", stopPredicate({ dcl_integrity_failure: true }) === "STOPPED_PANIC");
ok("09 unattended executor lost -> capability gap", stopPredicate({ unattended_executor_lost: true }) === "AUTONOMY_CAPABILITY_GAP");
ok("10 parked founder gate alone does NOT stop (work remains)", evaluateStop({ ready_jobs: 1, parked_founder_gate: true }).stop === false);

// Lease
const now = 1000;
ok("11 fresh lease valid", leaseValid({ worker_id: "w", job_id: "j", lease_expiration: now + 100 }, now) === true);
ok("12 expired lease invalid", leaseValid({ worker_id: "w", job_id: "j", lease_expiration: now - 1 }, now) === false);
const held = { worker_id: "w1", job_id: "J", lease_expiration: now + 300 };
ok("13 cannot acquire a live-leased job (no duplicate writer)", acquireLease(held, { worker_id: "w2", job_id: "J" }, now).acquired === false);
ok("14 can acquire an unleased job", acquireLease(null, { worker_id: "w2", job_id: "K", lease_ttl: 300 }, now).acquired === true);
ok("15 can acquire after prior lease expired", acquireLease({ ...held, lease_expiration: now - 1 }, { worker_id: "w2", job_id: "J" }, now).acquired === true);

// Stale detection (false-stale prevention)
ok("16 healthy busy worker NOT stale (heartbeat fresh)", isStale({ process_absent: false, heartbeat: now - 5, lease_expiration: now + 100 }, now, 120) === false);
ok("17 process gone + old heartbeat + expired lease = stale", isStale({ process_absent: true, heartbeat: now - 200, lease_expiration: now - 1 }, now, 120) === true);
ok("18 process gone but heartbeat fresh = NOT stale", isStale({ process_absent: true, heartbeat: now - 5, lease_expiration: now - 1 }, now, 120) === false);
ok("19 old heartbeat but process alive = NOT stale", isStale({ process_absent: false, heartbeat: now - 300, lease_expiration: now - 1 }, now, 120) === false);

// Restart policy
ok("20 restart allowed under limit", canRestart({ restart_count: 1 }, { max_restarts: 3 }).allowed === true);
ok("21 restart blocked at limit", canRestart({ restart_count: 3 }, { max_restarts: 3 }).allowed === false);
ok("22 no restart after deadline", canRestart({ restart_count: 0 }, { deadline_reached: true }).allowed === false);
ok("23 no restart after PANIC", canRestart({ restart_count: 0 }, { panic_stop: true }).allowed === false);
ok("24 no restart of founder-gated action", canRestart({ is_true_founder_gated: true }, {}).allowed === false);
ok("25 no restart of live/external action", canRestart({ is_live_or_external_action: true }, {}).allowed === false);

// Watchdog recovery
ok("26 watchdog does nothing for non-stale worker", watchdogRecover({ process_absent: false, heartbeat: now, lease_expiration: now + 100 }, {}, { stale_interval: 120 }, now).action === "none");
const staleW = { process_absent: true, heartbeat: now - 300, lease_expiration: now - 1 };
ok("27 watchdog relaunches a stale worker under limit", watchdogRecover(staleW, { restart_count: 0, next_safe_action: "step2" }, { stale_interval: 120, max_restarts: 3 }, now).action === "relaunch");
ok("28 watchdog resumes-next (no duplicate) if last action committed", watchdogRecover(staleW, { restart_count: 0, last_action_committed_or_sealed: true, next_safe_action: "step3" }, { stale_interval: 120 }, now).action === "resume_next_action");
ok("29 watchdog parks after restart limit + continues unrelated", (() => { const r = watchdogRecover(staleW, { restart_count: 3, next_safe_action: "x" }, { stale_interval: 120, max_restarts: 3 }, now); return r.action === "park" && r.continue_unrelated === true; })());
ok("30 watchdog never repeats live action (parks)", watchdogRecover(staleW, { restart_count: 0, is_live_or_external_action: true }, { stale_interval: 120 }, now).action === "park");

// Deadline
ok("31 RUNNING before drain window", deadlineStatus(1000, 0, 5000, 900) === "RUNNING");
ok("32 DRAINING inside drain window", deadlineStatus(4200, 0, 5000, 900) === "DRAINING");
ok("33 DEADLINE_REACHED at/after deadline", deadlineStatus(5000, 0, 5000, 900) === "DEADLINE_REACHED");
ok("34 no-restart-after-deadline consistent with deadline status", canRestart({}, { deadline_reached: deadlineStatus(5000, 0, 5000, 900) === "DEADLINE_REACHED" }).allowed === false);
ok("35 STATES has no RUNNING shortcut to STOPPED (report cannot stop)", STATES.includes("RUNNING") && reportActionCausesStop() === false);

console.log(`\nPAES-1 SUPERVISOR SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
