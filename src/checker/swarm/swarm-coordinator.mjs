#!/usr/bin/env node
// FounderGate — Checker Swarm Coordinator (zero-dependency, offline, pure).
//
// SCAFFOLD / SPEC ONLY — NOT a live checker runtime. This module orchestrates a BOUNDED
// checker swarm over pre-provided fixture checker-reports. It does NOT spawn a process, open a
// socket, contact a host, read a provider, or authorize anything. It fans out to at most
// max_fanout checkers per loop, runs at most max_loops (hard-capped at 2) loops, dedupes the
// resulting verdicts by (target, dimension), and returns a single aggregate. The aggregate is a
// REPORT, not an authorization: an undrained queue can never come back PASS, and nothing here
// greens a lane — a founder / Terminal-0 sheriff still decides.
//
// The authoritative contracts are checker-queue.schema.json and checker-report.schema.json in
// this folder. This file carries a small, dependency-free interpreter of the JSON-Schema subset
// those schemas use (type/const/enum/required/properties/additionalProperties/items/minItems/
// maxItems/uniqueItems/pattern/minLength/maxLength/minimum/maximum) so CI can validate with no
// npm install and no network — matching a static, offline safety posture.
//
// Design invariants (proven by swarm-coordinator.selftest.mjs):
//   1. CAPPED FANOUT   — per loop, at most max_fanout checkers are dispatched; total dispatched
//                        never exceeds max_fanout * loops_run. No uncontrolled swarm.
//   2. HARD MAX 2 LOOPS — loops_run is always <= 2 and <= the queue's max_loops. A queue that
//                        cannot drain within the loop/fanout budget stops and reports
//                        loops_exhausted with the leftover checkers named in skipped_over_cap.
//   3. DEDUPED VERDICT  — reports on the same (target, dimension) collapse: identical verdicts
//                        become one; disagreeing verdicts escalate to CONFLICT.
//   4. FAIL-CLOSED      — an undrained queue (any skipped_over_cap) can never aggregate to PASS;
//                        it returns HELD. authorization is always 'none'.
//
// Programmatic:
//   import { validateQueue, validateReport, coordinate } from './swarm-coordinator.mjs'
//   coordinate(queue, { loadReport })  // loadReport(report_ref) -> report object (hermetic)
//
// CLI (offline, describe-only): node swarm-coordinator.mjs <queue.json>
//   resolves report_ref against ./fixtures/reports and prints the aggregate as JSON.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const QUEUE_SCHEMA_PATH = join(HERE, 'checker-queue.schema.json');
const REPORT_SCHEMA_PATH = join(HERE, 'checker-report.schema.json');

// Absolute hard ceilings enforced in code regardless of what a document claims. Defense in depth:
// even a queue that somehow slipped past the schema cannot make the coordinator loop forever or
// fan out without bound.
export const HARD_MAX_LOOPS = 2;
export const HARD_MAX_FANOUT = 16;

// ----------------------------------------------------------------------------------------------
// Minimal JSON-Schema-subset validator (self-contained; no dependencies).
// ----------------------------------------------------------------------------------------------
function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v; // 'string' | 'number' | 'boolean' | 'object'
}

function typeMatches(value, type) {
  const t = typeOf(value);
  if (type === 'number') return t === 'number' || t === 'integer';
  if (type === 'integer') return t === 'integer';
  return t === type;
}

function check(value, s, path, errors) {
  if (s === true || s === undefined) return;
  if (s === false) {
    errors.push(`${path}: schema is false (nothing is valid here)`);
    return;
  }

  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some((t) => typeMatches(value, t))) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${typeOf(value)}`);
      return;
    }
  }

  if (Object.prototype.hasOwnProperty.call(s, 'const')) {
    if (JSON.stringify(value) !== JSON.stringify(s.const)) {
      errors.push(`${path}: must equal const ${JSON.stringify(s.const)}`);
    }
  }

  if (Array.isArray(s.enum)) {
    const ok = s.enum.some((e) => JSON.stringify(e) === JSON.stringify(value));
    if (!ok) errors.push(`${path}: ${JSON.stringify(value)} not in enum [${s.enum.join(', ')}]`);
  }

  const t = typeOf(value);

  if (t === 'string') {
    if (typeof s.minLength === 'number' && value.length < s.minLength)
      errors.push(`${path}: string shorter than minLength ${s.minLength}`);
    if (typeof s.maxLength === 'number' && value.length > s.maxLength)
      errors.push(`${path}: string longer than maxLength ${s.maxLength}`);
    if (typeof s.pattern === 'string' && !new RegExp(s.pattern).test(value))
      errors.push(`${path}: string does not match pattern /${s.pattern}/`);
  }

  if (t === 'number' || t === 'integer') {
    if (typeof s.minimum === 'number' && value < s.minimum)
      errors.push(`${path}: ${value} < minimum ${s.minimum}`);
    if (typeof s.maximum === 'number' && value > s.maximum)
      errors.push(`${path}: ${value} > maximum ${s.maximum}`);
  }

  if (t === 'array') {
    if (typeof s.minItems === 'number' && value.length < s.minItems)
      errors.push(`${path}: array shorter than minItems ${s.minItems}`);
    if (typeof s.maxItems === 'number' && value.length > s.maxItems)
      errors.push(`${path}: array longer than maxItems ${s.maxItems}`);
    if (s.uniqueItems === true) {
      const seen = new Set();
      for (const item of value) {
        const k = JSON.stringify(item);
        if (seen.has(k)) { errors.push(`${path}: array items must be unique`); break; }
        seen.add(k);
      }
    }
    if (s.items) value.forEach((item, i) => check(item, s.items, `${path}[${i}]`, errors));
  }

  if (t === 'object') {
    if (Array.isArray(s.required)) {
      for (const req of s.required)
        if (!Object.prototype.hasOwnProperty.call(value, req))
          errors.push(`${path}: missing required property '${req}'`);
    }
    const props = s.properties || {};
    if (s.additionalProperties === false) {
      for (const key of Object.keys(value))
        if (!Object.prototype.hasOwnProperty.call(props, key))
          errors.push(`${path}: additional property '${key}' is not allowed`);
    }
    for (const [key, subschema] of Object.entries(props))
      if (Object.prototype.hasOwnProperty.call(value, key))
        check(value[key], subschema, `${path}.${key}`, errors);
  }
}

export function validateQueue(queue, schema = loadJson(QUEUE_SCHEMA_PATH)) {
  const errors = [];
  check(queue, schema, '$', errors);
  // Semantic check beyond the schema subset: checker_id must be unique within the queue.
  if (Array.isArray(queue && queue.checkers)) {
    const seen = new Set();
    for (const c of queue.checkers) {
      const id = c && c.checker_id;
      if (typeof id === 'string') {
        if (seen.has(id)) errors.push(`$.checkers: duplicate checker_id '${id}'`);
        seen.add(id);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateReport(report, schema = loadJson(REPORT_SCHEMA_PATH)) {
  const errors = [];
  check(report, schema, '$', errors);
  return { valid: errors.length === 0, errors };
}

// ----------------------------------------------------------------------------------------------
// Verdict aggregation.
// ----------------------------------------------------------------------------------------------
// Severity ordering, most-severe first. Aggregation is fail-closed: the worst deduped verdict wins.
// CONFLICT and HELD are coordinator-derived only (a raw checker never emits them).
const SEVERITY = ['CONFLICT', 'FAIL', 'INSUFFICIENT', 'GATED', 'HOLD', 'PASS'];

function worse(a, b) {
  const ia = SEVERITY.indexOf(a);
  const ib = SEVERITY.indexOf(b);
  return ia <= ib ? a : b; // lower index = more severe
}

function groupKey(target, dimension) {
  return `${target} ${dimension}`;
}

// Collapse raw reports into one verdict per (target, dimension). Identical verdicts on the same
// group become one; disagreeing verdicts escalate that group to CONFLICT.
function dedupeVerdicts(reports) {
  const groups = new Map();
  for (const r of reports) {
    const key = groupKey(r.target, r.dimension);
    if (!groups.has(key)) {
      groups.set(key, { target: r.target, dimension: r.dimension, verdicts: new Set() });
    }
    groups.get(key).verdicts.add(r.verdict);
  }
  const deduped = [];
  for (const g of groups.values()) {
    const distinct = [...g.verdicts];
    const verdict = distinct.length > 1 ? 'CONFLICT' : distinct[0];
    deduped.push({ target: g.target, dimension: g.dimension, verdict, distinct });
  }
  return deduped;
}

/**
 * Run the bounded checker swarm.
 *
 * @param {object} queue  A checker-queue document (should already be schema-valid).
 * @param {object} opts
 * @param {(report_ref: string) => object} opts.loadReport  Hermetic loader: given a report_ref,
 *        returns the checker-report object. No IO is performed by coordinate() itself.
 * @returns {object} aggregate result (a report, never an authorization).
 */
export function coordinate(queue, { loadReport } = {}) {
  if (!queue || typeof queue !== 'object') {
    throw new TypeError('coordinate: queue must be an object');
  }
  if (typeof loadReport !== 'function') {
    throw new TypeError('coordinate: opts.loadReport must be a function');
  }

  // Clamp both budgets by the absolute in-code ceilings, independent of the document.
  const declaredFanout = Number.isInteger(queue.max_fanout) ? queue.max_fanout : 1;
  const declaredLoops = Number.isInteger(queue.max_loops) ? queue.max_loops : 1;
  const fanoutCap = Math.max(1, Math.min(declaredFanout, HARD_MAX_FANOUT));
  const loopCap = Math.max(1, Math.min(declaredLoops, HARD_MAX_LOOPS));

  const allCheckers = Array.isArray(queue.checkers) ? queue.checkers.slice() : [];
  const pending = allCheckers.slice();

  const rawVerdicts = [];
  const dispatched = [];
  const perLoopCounts = [];
  let loopsRun = 0;

  // Drain the pending queue loop by loop. Each loop dispatches at most fanoutCap checkers. Hard
  // stop after loopCap loops even if pending remains — this is the max-2-loops guarantee.
  while (pending.length > 0 && loopsRun < loopCap) {
    loopsRun += 1;
    const batch = pending.splice(0, fanoutCap); // capped fanout for this loop
    perLoopCounts.push(batch.length);
    for (const task of batch) {
      const report = loadReport(task.report_ref);
      dispatched.push(task.checker_id);
      rawVerdicts.push({
        checker_id: task.checker_id,
        target: report.target,
        dimension: report.dimension,
        verdict: report.verdict,
        loop: loopsRun,
      });
    }
  }

  // Anything still pending was left undispatched by the fanout*loop budget.
  const skippedOverCap = pending.map((t) => t.checker_id);
  const loopsExhausted = pending.length > 0;

  const dedupedVerdicts = dedupeVerdicts(rawVerdicts);

  // Fail-closed aggregation. Start optimistic, fold in the worst deduped verdict.
  let worstVerdict = 'PASS';
  for (const d of dedupedVerdicts) {
    worstVerdict = worse(worstVerdict, d.verdict);
  }

  // An undrained queue (or a queue that dispatched nothing) can NEVER be PASS — it is HELD.
  const complete = !loopsExhausted && dispatched.length === allCheckers.length && allCheckers.length > 0;
  const aggregate = complete ? worstVerdict : 'HELD';

  return {
    queue_id: queue.queue_id,
    fanout_cap: fanoutCap,
    loop_cap: loopCap,
    loops_run: loopsRun,
    per_loop_dispatch: perLoopCounts,
    total_declared: allCheckers.length,
    dispatched,
    skipped_over_cap: skippedOverCap,
    loops_exhausted: loopsExhausted,
    complete,
    raw_verdicts: rawVerdicts,
    deduped_verdicts: dedupedVerdicts,
    worst_verdict: worstVerdict,
    aggregate,
    describes_only: true,
    authorization: 'none',
  };
}

// ----------------------------------------------------------------------------------------------
// CLI — offline, describe-only.
// ----------------------------------------------------------------------------------------------
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const queuePath = process.argv[2];
  if (!queuePath) {
    console.error('usage: node swarm-coordinator.mjs <queue.json>');
    process.exit(2);
  }
  const queue = loadJson(queuePath);
  const qcheck = validateQueue(queue);
  if (!qcheck.valid) {
    console.error(`INVALID QUEUE ${queuePath}`);
    for (const e of qcheck.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const reportsDir = join(HERE, 'fixtures', 'reports');
  const result = coordinate(queue, {
    loadReport: (ref) => loadJson(join(reportsDir, ref)),
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
