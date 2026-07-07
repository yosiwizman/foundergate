#!/usr/bin/env node
// FounderGate — Checker Swarm Coordinator selftest (zero-dependency, offline, hermetic).
//
// Proves the four load-bearing invariants of the bounded checker swarm:
//   1. SCHEMA SHAPE  — validateQueue/validateReport ACCEPT every good fixture and REJECT every
//                      malformed fixture (incl. the honesty invariants: max_loops>2, fanout 0 or
//                      >16, default_disposition!='hold', describes_only:false, enforced:true, a
//                      duplicate checker_id, and a raw report claiming CONFLICT or loop 3).
//   2. CAPPED FANOUT — per-loop dispatch never exceeds max_fanout; total dispatched never exceeds
//                      max_fanout * loops_run.
//   3. MAX 2 LOOPS   — loops_run is always <= 2; a queue that cannot drain within the budget stops,
//                      reports loops_exhausted with the leftovers named, and (fail-closed) can never
//                      aggregate to PASS — it returns HELD. Holds even against a lying in-memory
//                      queue that claims max_fanout 999 / max_loops 999 (defense-in-depth clamp).
//   4. DEDUPED VERDICT — identical verdicts on the same (target,dimension) collapse to one;
//                      disagreeing verdicts escalate to CONFLICT; severity folds worst-first.
//
// Run: node harness/checker/swarm/swarm-coordinator.selftest.mjs
// Exit 0 = PASS (prints CHECKER-SWARM-SELFTEST: PASS); non-zero on first failure.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  validateQueue,
  validateReport,
  coordinate,
  HARD_MAX_LOOPS,
  HARD_MAX_FANOUT,
} from './swarm-coordinator.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const QUEUE_DIR = join(HERE, 'fixtures', 'queue');
const QUEUE_INVALID = join(QUEUE_DIR, 'invalid');
const REPORTS_DIR = join(HERE, 'fixtures', 'reports');
const REPORTS_INVALID = join(REPORTS_DIR, 'invalid');

let checks = 0;
function assert(cond, msg) {
  checks += 1;
  if (!cond) {
    console.error(`CHECKER-SWARM-SELFTEST: FAIL — ${msg}`);
    process.exit(1);
  }
}

function jsonFiles(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f));
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Hermetic report loader resolving report_ref against the fixtures/reports directory.
const loadReport = (ref) => loadJson(join(REPORTS_DIR, ref));

// ---------------------------------------------------------------------------------------------
// 1. SCHEMA SHAPE — accept the good, reject the bad.
// ---------------------------------------------------------------------------------------------
for (const f of jsonFiles(QUEUE_DIR)) {
  const { valid, errors } = validateQueue(loadJson(f));
  assert(valid, `expected VALID queue ${f}: ${errors.join('; ')}`);
}
for (const f of jsonFiles(QUEUE_INVALID)) {
  const { valid } = validateQueue(loadJson(f));
  assert(!valid, `expected INVALID queue ${f} but validator accepted it`);
}
for (const f of jsonFiles(REPORTS_DIR)) {
  const { valid, errors } = validateReport(loadJson(f));
  assert(valid, `expected VALID report ${f}: ${errors.join('; ')}`);
}
for (const f of jsonFiles(REPORTS_INVALID)) {
  const { valid } = validateReport(loadJson(f));
  assert(!valid, `expected INVALID report ${f} but validator accepted it`);
}

// ---------------------------------------------------------------------------------------------
// Helper: run a named fixture queue through the coordinator.
// ---------------------------------------------------------------------------------------------
function run(name) {
  const queue = loadJson(join(QUEUE_DIR, name));
  const res = coordinate(queue, { loadReport });
  // Universal invariants that must hold for EVERY run.
  assert(res.loops_run <= HARD_MAX_LOOPS, `${name}: loops_run ${res.loops_run} > HARD_MAX_LOOPS`);
  assert(res.loops_run <= res.loop_cap, `${name}: loops_run exceeds loop_cap`);
  assert(res.fanout_cap <= HARD_MAX_FANOUT, `${name}: fanout_cap exceeds HARD_MAX_FANOUT`);
  for (const n of res.per_loop_dispatch) {
    assert(n <= res.fanout_cap, `${name}: a loop dispatched ${n} > fanout_cap ${res.fanout_cap}`);
  }
  assert(
    res.dispatched.length <= res.fanout_cap * res.loops_run,
    `${name}: total dispatched exceeds fanout_cap * loops_run`,
  );
  for (const rv of res.raw_verdicts) {
    assert(rv.loop <= res.loops_run, `${name}: a verdict claims a loop above loops_run`);
  }
  assert(res.authorization === 'none', `${name}: authorization must be 'none'`);
  assert(res.describes_only === true, `${name}: describes_only must be true`);
  // An undrained queue can never be PASS.
  if (res.skipped_over_cap.length > 0 || res.loops_exhausted) {
    assert(res.aggregate === 'HELD', `${name}: undrained queue must aggregate HELD, got ${res.aggregate}`);
  }
  return res;
}

// ---------------------------------------------------------------------------------------------
// 2. + 4. Exact behavior per fixture.
// ---------------------------------------------------------------------------------------------

// all-pass drains in one loop -> PASS, 3 deduped groups.
{
  const r = run('all-pass-drains.example.json');
  assert(r.fanout_cap === 3 && r.loops_run === 1, 'all-pass: cap 3 / one loop');
  assert(JSON.stringify(r.per_loop_dispatch) === '[3]', 'all-pass: one loop of 3');
  assert(r.dispatched.length === 3 && r.skipped_over_cap.length === 0, 'all-pass: all dispatched');
  assert(r.complete === true && r.loops_exhausted === false, 'all-pass: complete');
  assert(r.deduped_verdicts.length === 3, 'all-pass: 3 deduped groups');
  assert(r.aggregate === 'PASS', 'all-pass: aggregate PASS');
}

// conflict: two disagreeing reports on same (target,dimension) -> one CONFLICT group.
{
  const r = run('conflict-dedup.example.json');
  assert(r.raw_verdicts.length === 2, 'conflict: 2 raw');
  assert(r.deduped_verdicts.length === 1, 'conflict: collapses to 1 group');
  assert(r.deduped_verdicts[0].verdict === 'CONFLICT', 'conflict: group verdict CONFLICT');
  assert(r.aggregate === 'CONFLICT', 'conflict: aggregate CONFLICT');
  assert(r.complete === true, 'conflict: drained');
}

// duplicate identical verdicts collapse: 3 raw -> 2 deduped, still PASS.
{
  const r = run('duplicate-collapse.example.json');
  assert(r.raw_verdicts.length === 3, 'dup: 3 raw');
  assert(r.deduped_verdicts.length === 2, 'dup: collapses to 2 groups');
  const safetyGroup = r.deduped_verdicts.find((d) => d.dimension === 'safety');
  assert(safetyGroup && safetyGroup.verdict === 'PASS', 'dup: safety group PASS');
  assert(safetyGroup.distinct.length === 1, 'dup: identical verdicts collapse to one distinct');
  assert(r.aggregate === 'PASS', 'dup: aggregate PASS');
}

// capped + undrained: 5 checkers, fanout 2, loops 2 -> 4 dispatched, 1 skipped, HELD (all PASS!).
{
  const r = run('capped-undrained.example.json');
  assert(r.fanout_cap === 2 && r.loops_run === 2, 'capped: cap 2 / two loops');
  assert(JSON.stringify(r.per_loop_dispatch) === '[2,2]', 'capped: two loops of 2');
  assert(r.dispatched.length === 4, 'capped: 4 dispatched');
  assert(JSON.stringify(r.skipped_over_cap) === '["c5"]', 'capped: c5 left over cap');
  assert(r.loops_exhausted === true && r.complete === false, 'capped: exhausted, incomplete');
  assert(r.worst_verdict === 'PASS', 'capped: worst dispatched verdict is PASS');
  assert(r.aggregate === 'HELD', 'capped: fail-closed HELD despite all-PASS dispatched');
}

// fanout of one drains in exactly two loops -> PASS.
{
  const r = run('fanout-of-one-drains.example.json');
  assert(r.fanout_cap === 1 && r.loops_run === 2, 'fanout1: cap 1 / two loops');
  assert(JSON.stringify(r.per_loop_dispatch) === '[1,1]', 'fanout1: two loops of 1');
  assert(r.dispatched.length === 2 && r.skipped_over_cap.length === 0, 'fanout1: drained');
  assert(r.loops_exhausted === false && r.complete === true, 'fanout1: complete');
  assert(r.aggregate === 'PASS', 'fanout1: aggregate PASS');
}

// severity fold: HOLD + GATED + PASS -> worst is GATED.
{
  const r = run('severity-fold.example.json');
  assert(r.deduped_verdicts.length === 3, 'severity: 3 groups');
  assert(r.worst_verdict === 'GATED', 'severity: worst folds to GATED');
  assert(r.aggregate === 'GATED', 'severity: aggregate GATED');
  assert(r.complete === true, 'severity: drained');
}

// ---------------------------------------------------------------------------------------------
// 3. DEFENSE-IN-DEPTH — a lying in-memory queue (never schema-valid) cannot break the caps.
//    Even claiming max_fanout 999 / max_loops 999 over 100 checkers, the coordinator clamps to
//    HARD_MAX_FANOUT per loop and HARD_MAX_LOOPS loops, dispatching at most 16*2 = 32, then HELD.
// ---------------------------------------------------------------------------------------------
{
  const lying = {
    schema_version: '1.0.0',
    queue_id: 'q-lying-uncapped',
    max_fanout: 999,
    max_loops: 999,
    default_disposition: 'hold',
    describes_only: true,
    enforced: false,
    checkers: Array.from({ length: 100 }, (_, i) => ({
      checker_id: `x${i}`,
      target: `lane-${i}`,
      dimension: 'lease',
      report_ref: 'lease-A-pass.json',
    })),
  };
  // The schema itself rejects it (proves the spec layer has teeth) ...
  assert(!validateQueue(lying).valid, 'lying queue must be schema-REJECTED');
  // ... and even if it somehow reached the coordinator, the in-code clamp bounds it.
  const r = coordinate(lying, { loadReport });
  assert(r.fanout_cap === HARD_MAX_FANOUT, 'lying: fanout clamped to HARD_MAX_FANOUT');
  assert(r.loop_cap === HARD_MAX_LOOPS, 'lying: loop clamped to HARD_MAX_LOOPS');
  assert(r.loops_run === HARD_MAX_LOOPS, 'lying: exactly HARD_MAX_LOOPS loops run');
  assert(r.dispatched.length === HARD_MAX_FANOUT * HARD_MAX_LOOPS, 'lying: dispatched bounded to 32');
  assert(r.skipped_over_cap.length === 100 - 32, 'lying: 68 left over cap');
  assert(r.loops_exhausted === true, 'lying: loops exhausted');
  assert(r.aggregate === 'HELD', 'lying: fail-closed HELD');
  for (const n of r.per_loop_dispatch) {
    assert(n <= HARD_MAX_FANOUT, 'lying: no loop exceeds HARD_MAX_FANOUT');
  }
}

// ---------------------------------------------------------------------------------------------
// Bad-arg guards.
// ---------------------------------------------------------------------------------------------
{
  let threw = false;
  try { coordinate(null, { loadReport }); } catch { threw = true; }
  assert(threw, 'coordinate(null) must throw');
  threw = false;
  try { coordinate({ checkers: [] }, {}); } catch { threw = true; }
  assert(threw, 'coordinate without loadReport must throw');
}

console.log(`CHECKER-SWARM-SELFTEST: PASS (${checks} checks)`);
process.exit(0);
