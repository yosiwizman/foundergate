#!/usr/bin/env node
// REAL deterministic local run: executes the demo target's self-test via child_process,
// binds the real git HEAD SHA, and writes a real evidence JSON. No provider, no network.
// Honesty law: decision never returns "SHIP".
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const objective = process.argv[2] || 'run self-owned demo target self-test';
const targetTest = process.argv[3] || 'publish_candidates/self_owned_demo_repo/tests/task-ledger.selftest.mjs';
const outPath = process.argv[4] || join(repoRoot, 'demo', 'founder_operator_dashboard', 'runs', 'last-run.json');

function realHead() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }).toString().trim(); }
  catch { return null; }
}
function runTests() {
  try {
    const out = execFileSync('node', [targetTest], { cwd: repoRoot }).toString();
    const m = out.match(/ALL GREEN:\s*(\d+)\/(\d+)/);
    if (m) return { ok: true, passed: Number(m[1]), total: Number(m[2]), failures: 0, raw: out.trim() };
    const rm = out.match(/RED:\s*(\d+)\/(\d+)\s*passed,\s*(\d+)\s*failed/);
    if (rm) return { ok: false, passed: Number(rm[1]), total: Number(rm[2]), failures: Number(rm[3]), raw: out.trim() };
    return { ok: false, passed: 0, total: 0, failures: null, raw: out.trim() };
  } catch (e) {
    const out = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
    return { ok: false, passed: 0, total: 0, failures: null, raw: out.trim() || String(e.message) };
  }
}
function decide(t) {
  if (!t || t.total === 0) return 'INSUFFICIENT';
  if (!t.ok || t.failures > 0) return 'DO_NOT_SHIP';
  return 'INTERNAL_DEMO_ONLY'; // strongest honest local label; NEVER 'SHIP'
}

export function runRealCheck() {
  const head = realHead();
  const tests = runTests();
  const decision = decide(tests);
  if (decision === 'SHIP') throw new Error('runner produced forbidden SHIP');
  return {
    mode: 'REAL_LOCAL_RUN',
    objective,
    target: targetTest,
    commit: head,                        // REAL git HEAD
    commit_short: head ? head.slice(0, 12) : null,
    tests: { passed: tests.passed, total: tests.total, failures: tests.failures, result: tests.ok ? `${tests.passed}/${tests.total}` : 'RED' },
    checker: 'not-run (this is the runner; Checker is a separate review)',
    advisor: 'not-run (separate review)',
    decision,                            // never SHIP
    limitations: ['REAL_LOCAL_RUN of a self-owned target', 'not provider-backed', 'not production/secure/compliant'],
    nextSafeAction: 'export a sealed local evidence package (export-package.mjs)',
    generated_note: 'timestamp omitted for determinism; bind at packaging time',
  };
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const run = runRealCheck();
  writeFileSync(outPath, JSON.stringify(run, null, 2));
  console.log(`REAL_LOCAL_RUN complete: commit=${run.commit_short} tests=${run.tests.result} decision=${run.decision}`);
  console.log(`wrote ${outPath}`);
}
