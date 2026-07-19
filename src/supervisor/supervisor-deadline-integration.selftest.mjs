// PAES-WORKER-DEADLINE-HOTFIX-3 — PRODUCTION-PATH runtime qualification.
// Runs the REAL tools/terminal0/paes/supervisor-session against ISOLATED synthetic
// state (FG_SUP_DIR) with a stub worker (FG_CLAUDE_BIN). Never touches the real
// activation decision or the real Wave-2 queue. Proves the hard deadline law +
// bounded worker execution + process-tree termination through the real executable.
import { spawnSync, execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const SUPERVISOR = join(REPO, "tools", "terminal0", "paes", "supervisor-session");
const EXE = process.execPath;

// One scenario = one isolated synthetic run of the real supervisor.
function runScenario({ deadlineOffsetS, stubSleepS = 0, jobTimeoutS = null, drainMarginS = 0, checkpointDeadlineOffsetS = null }) {
  const root = mkdtempSync(join(tmpdir(), "sup-deadline-"));
  const SUP = join(root, "supervisor");
  mkdirSync(join(SUP, "worker-results"), { recursive: true });
  mkdirSync(join(SUP, "logs"), { recursive: true });
  mkdirSync(join(root, "directives", "paes-session-1"), { recursive: true });   // dcl_capture_verified marker
  writeFileSync(join(root, "directives", "paes-session-1", "prompt.txt"), "synthetic");
  mkdirSync(join(root, "recovery"), { recursive: true });
  const now = Math.floor(Date.now() / 1000);
  const deadline = now + deadlineOffsetS;
  writeFileSync(join(SUP, "current-cycle.json"), JSON.stringify({ run_id: "synthetic", start: now, deadline }));
  if (checkpointDeadlineOffsetS !== null) writeFileSync(join(root, "recovery", "checkpoint.json"), JSON.stringify({ original_deadline: now + checkpointDeadlineOffsetS }));
  const job = { job_id: "synthetic-1", state: "READY", risk_class: "wide_safe", prompt: "noop" };
  if (jobTimeoutS !== null) job.timeout_s = jobTimeoutS;
  writeFileSync(join(SUP, "queue.json"), JSON.stringify({ schema: "supervisor-queue", jobs: [job] }));
  writeFileSync(join(SUP, "handoff.json"), JSON.stringify({ result: "SAFE_TO_LEAVE_UNATTENDED" }));
  writeFileSync(join(SUP, "stop.json"), JSON.stringify({ panic_stop: false }));
  // stub 'claude': sleeps, then (if not killed) prints a success JSON.
  const stub = join(root, "stub-claude.sh");
  writeFileSync(stub, `#!/usr/bin/env bash\nsleep ${stubSleepS}\necho '{"subtype":"success","is_error":false,"total_cost_usd":0.01,"session_id":"stub"}'\n`);
  chmodSync(stub, 0o755);

  const r = spawnSync(EXE, [SUPERVISOR], {
    encoding: "utf8", timeout: 30000,
    env: { ...process.env, FG_SUP_DIR: SUP, FG_CLAUDE_BIN: stub, FG_MAX_CYCLES: "1",
      FG_WARMUP_BEATS: "1", FG_HEARTBEAT_INTERVAL_MS: "300", FG_CYCLE_SLEEP_MS: "300",
      FG_DRAIN_MARGIN_S: String(drainMarginS), ...(jobTimeoutS !== null ? {} : {}) },
  });
  const events = existsSync(join(SUP, "events.jsonl"))
    ? readFileSync(join(SUP, "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const queue = JSON.parse(readFileSync(join(SUP, "queue.json"), "utf8"));
  // any residual stub worker process referencing this root? The bracket trick
  // (stub-cla[u]de) prevents pgrep from matching its OWN command line / the sh -c
  // wrapper (which both contain the pattern string) — a portable self-match guard
  // that bit on the Linux CI runner but not on macOS.
  let residual = "";
  try { residual = execSync(`pgrep -f "${root}/stub-cla[u]de" || true`, { encoding: "utf8" }).trim(); } catch { residual = ""; }
  rmSync(root, { recursive: true, force: true });
  return { events, queue, jobState: queue.jobs[0].state, jobOutcome: queue.jobs[0].last_outcome, residual, stdout: r.stdout, stderr: r.stderr };
}
const ev = (events, evt) => events.find((e) => e.evt === evt);

// A. Worker completes before timeout -> SUCCESS/DONE, heartbeat advanced, no residual.
{
  const s = runScenario({ deadlineOffsetS: 3600, stubSleepS: 0 });
  const wr = ev(s.events, "worker_result");
  ok("01 fast worker -> outcome SUCCESS", wr && wr.outcome === "SUCCESS");
  ok("02 job marked DONE", s.jobState === "DONE");
  ok("03 heartbeat advanced (warmup + cycle beats)", ev(s.events, "warmup_complete") !== undefined);
  ok("04 no residual worker process", s.residual === "");
}

// B. Worker exceeds an authorized job-specific timeout -> WORKER_TIMEOUT, not DONE.
{
  const s = runScenario({ deadlineOffsetS: 3600, stubSleepS: 8, jobTimeoutS: 1 });
  const wr = ev(s.events, "worker_result");
  ok("05 slow worker + job timeout -> WORKER_TIMEOUT", wr && wr.outcome === "WORKER_TIMEOUT");
  ok("06 job NOT marked DONE (FAILED)", s.jobState !== "DONE" && s.jobState === "FAILED");
  ok("07 termination audited (intent + terminated)", ev(s.events, "worker_termination_intent") && ev(s.events, "worker_terminated"));
  ok("08 no residual worker process after timeout", s.residual === "");
}

// D. Run deadline expires while worker runs -> RUN_DEADLINE_EXPIRED, HELD, stop.
// (drain margin 1s so the worker STARTS ~now, then its effective timeout = the
// remaining run time ~3s terminates it as the deadline is crossed.)
{
  const s = runScenario({ deadlineOffsetS: 3, stubSleepS: 8, drainMarginS: 1 });
  const wr = ev(s.events, "worker_result");
  ok("09 worker crosses run deadline -> RUN_DEADLINE_EXPIRED", wr && wr.outcome === "RUN_DEADLINE_EXPIRED");
  ok("10 job PRESERVED (HELD, not DONE)", s.jobState === "HELD");
  ok("11 run_deadline_expired event + scheduling stopped", ev(s.events, "run_deadline_expired") !== undefined);
  ok("12 supervisor state RUN_DEADLINE_EXPIRED", (s.events.filter((e)=>e.evt==="run_deadline_expired").length) === 1);
  ok("13 no residual worker process after deadline termination", s.residual === "");
}

// C. Deadline already expired before spawn -> worker never starts.
{
  const s = runScenario({ deadlineOffsetS: -10, stubSleepS: 8 });
  ok("14 expired-before-start: NO worker_invocation (worker never starts)", ev(s.events, "worker_invocation") === undefined);
  ok("15 expired-before-start: no residual process", s.residual === "");
}

// E. Restart/recovery reuses the ORIGINAL deadline (checkpoint), never a fresh window.
// checkpoint original_deadline is already in the past even though the cycle deadline
// is far in the future -> the immutable original governs -> no worker starts.
{
  const s = runScenario({ deadlineOffsetS: 3600, checkpointDeadlineOffsetS: -10, stubSleepS: 8 });
  const wni = ev(s.events, "worker_not_spawned");
  ok("16 restart honors ORIGINAL (checkpoint) deadline over a fresh cycle window", wni && wni.outcome === "RUN_DEADLINE_EXPIRED");
  ok("17 no worker started under a restart-fresh-window attempt", ev(s.events, "worker_invocation") === undefined && s.residual === "");
}

console.log(`\nSUPERVISOR DEADLINE INTEGRATION SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
