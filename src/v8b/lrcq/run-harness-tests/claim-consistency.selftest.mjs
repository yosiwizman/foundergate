// FounderGate LRCQ — claim-surface consistency verifier (FG-LRCQ-ACT-024). Locks the exact contradiction
// the first real run exposed: a "current status" section still said the activation was NOT consumed / the
// run was NOT performed while durable truth records a consumed activation + a CONTROLLED_HOLD. The verifier
// must REJECT such incompatible current claims and EXEMPT clearly-labeled historical ones.
import { checkClaimConsistency } from "../../../../tools/terminal0/lrcq/claim-consistency.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// Durable truth of the first real run.
const TRUTH = { activation_consumed: true, replay_blocked: true, run_active_reached: true, controlled_hold: true, provider_spawned: false, witness_reached: false, five_hour_passed: false, activation_spent: true };

// The EXACT contradiction discovered on the live PR body (unlabeled current-status section) — MUST FAIL.
const DISCOVERED = `### What is true right now
- **Real provider NOT invoked.** Five-hour run **NOT performed.** Founder signature **NOT provided.** Activation **NOT consumed.** PR **UNMERGED.** Protected \`main\` unchanged.`;
ok("01 REGRESSION FIXTURE: the exact discovered contradiction FAILS (current-status says NOT consumed/performed)", checkClaimConsistency(DISCOVERED, TRUTH).ok === false);
ok("01b the fixture flags multiple incompatible claims", checkClaimConsistency(DISCOVERED, TRUTH).problems.length >= 3);

// The SAME lines under a HISTORICAL heading -> exempt -> passes.
const HISTORICAL = `### (HISTORICAL — PRE-FIRST-RUN STATE, no longer current) What was true before the first run
- At the time this was written: real provider not invoked, no founder signature, no activation consumed. This is now superseded.`;
ok("02 the same facts under a HISTORICAL heading are exempt (pass)", checkClaimConsistency(HISTORICAL, TRUTH).ok === true);

// The corrected current-status story is consistent.
const CORRECT = `## First real run — CONTROLLED_HOLD
- One founder authorization was consumed once; replay is blocked; the run reached RUN_ACTIVE and held on job 1; 0 productive jobs; real Claude was never spawned; the 12-minute witness was not reached; a retry requires a NEW authorization. PR UNMERGED; protected main unchanged.`;
ok("03 the corrected current-truth story passes", checkClaimConsistency(CORRECT, TRUTH).ok === true);

// Other incompatible current claims must fail.
ok("04 'run passed / clean completion' (current) -> FAIL under a controlled hold", checkClaimConsistency("The five-hour run completed successfully.", TRUTH).ok === false);
ok("05 'HEALTHY_CONTINUE achieved' (current) -> FAIL when the witness was not reached", checkClaimConsistency("The witness HEALTHY_CONTINUE was achieved.", TRUTH).ok === false);
ok("06 'awaiting first activation' (current) -> FAIL after consumption", checkClaimConsistency("Status: awaiting a founder activation.", TRUTH).ok === false);
ok("07 'real Claude was spawned' (current) -> FAIL when zero provider spawn", checkClaimConsistency("Real Claude was invoked successfully for the jobs.", TRUTH).ok === false);
ok("08 'same activation remains available' (current) -> FAIL when spent", checkClaimConsistency("The same activation remains available for reuse.", TRUTH).ok === false);

// A pre-run truth (no run yet) legitimately allows the 'not consumed' statement.
const PRERUN_TRUTH = { activation_consumed: false, run_active_reached: false, controlled_hold: false, provider_spawned: false, witness_reached: false, activation_spent: false };
ok("09 before any run, 'activation NOT consumed' is consistent (no false positive)", checkClaimConsistency(DISCOVERED, PRERUN_TRUTH).ok === true);

console.log("\nLRCQ CLAIM-CONSISTENCY SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
