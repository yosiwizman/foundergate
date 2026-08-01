// Core logic for the local operator run-server. Loopback-only intent; this module
// is the request-handling logic (testable without opening a socket). It spawns ONLY
// the approved runner/export scripts via execFile array-args (NO shell → no injection).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, '..', '..');
const RUNNER = join(REPO_ROOT, 'src', 'live_run_console', 'run-check.mjs');
const EXPORTER = join(REPO_ROOT, 'src', 'evidence_viewer', 'export-package.mjs');
const RUN_JSON = join(REPO_ROOT, 'demo', 'founder_operator_dashboard', 'runs', 'last-run.json');
const SEALED_ZIP = join(REPO_ROOT, 'demo', 'founder_operator_dashboard', 'runs', 'sealed_export.zip');

// STRICT allowlist: only these logical targets → fixed vetted test paths. Raw paths / URLs never accepted.
export const ALLOWLIST_TARGETS = {
  'self-owned demo target': 'publish_candidates/self_owned_demo_repo/tests/task-ledger.selftest.mjs',
  'local fixture': 'fixtures/local_operator_server_session/fixture.selftest.mjs',
};
export const MAX_OBJECTIVE_LEN = 200;

export function validateObjective(objective) {
  if (typeof objective !== 'string' || objective.trim() === '') return { ok: false, code: 'INSUFFICIENT', reason: 'empty objective' };
  if (objective.length > MAX_OBJECTIVE_LEN) return { ok: false, code: 'REFUSED', reason: 'objective too long' };
  return { ok: true, value: objective.trim() };
}
export function validateTarget(target) {
  // Only accept exact allowlist KEYS. Anything else (raw path, ../, http://, file://) is refused.
  if (!Object.prototype.hasOwnProperty.call(ALLOWLIST_TARGETS, target)) return { ok: false, code: 'REFUSED', reason: 'target not in allowlist' };
  const rel = ALLOWLIST_TARGETS[target];
  const abs = resolve(REPO_ROOT, rel);
  if (!abs.startsWith(REPO_ROOT + '/')) return { ok: false, code: 'REFUSED', reason: 'target escapes repo root' };
  if (!existsSync(abs)) return { ok: false, code: 'UNKNOWN', reason: 'target test missing' };
  return { ok: true, rel };
}

export function handleStart(body) {
  const o = validateObjective(body && body.objective);
  if (!o.ok) return { status: o.code, decision: o.code === 'INSUFFICIENT' ? 'INSUFFICIENT' : undefined, reason: o.reason };
  const tgt = validateTarget(body && body.target);
  if (!tgt.ok) return { status: tgt.code, reason: tgt.reason };
  if (!existsSync(RUNNER)) return { status: 'UNKNOWN', reason: 'runner missing' };
  try {
    // execFile array-args → NO shell interpretation of the objective (metacharacters are inert)
    execFileSync('node', [RUNNER, o.value, tgt.rel, RUN_JSON], { cwd: REPO_ROOT });
    const run = JSON.parse(readFileSync(RUN_JSON, 'utf8'));
    if (run.decision === 'SHIP') return { status: 'ERROR', reason: 'runner emitted forbidden SHIP' };
    return { status: 'complete', run };
  } catch (e) {
    return { status: 'ERROR', reason: 'run failed', detail: String(e.message).slice(0, 200) };
  }
}
export function handleExport() {
  if (!existsSync(RUN_JSON)) return { status: 'UNKNOWN', reason: 'no run to export' };
  if (!existsSync(EXPORTER)) return { status: 'UNKNOWN', reason: 'exporter missing' };
  try {
    execFileSync('node', [EXPORTER, RUN_JSON, SEALED_ZIP], { cwd: REPO_ROOT });
    const verify = execFileSync('unzip', ['-tq', SEALED_ZIP]).toString();
    const unzip_ok = /No errors detected/.test(verify);
    if (!unzip_ok) return { status: 'EXPORT_FAILED', reason: 'unzip -t failed' };
    return { status: 'complete', zip: 'runs/sealed_export.zip', unzip_ok: true };
  } catch (e) {
    return { status: 'EXPORT_FAILED', reason: String(e.message).slice(0, 200) };
  }
}
