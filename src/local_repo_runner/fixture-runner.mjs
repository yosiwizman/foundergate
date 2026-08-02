// Local per-fixture execution adapter. Executes ONLY vetted synthetic/self-owned fixtures from a
// strict allowlist, via execFileSync array-args (NO shell → no injection), with a hard timeout and
// NO network / NO dependency install / NO provider / NO spend. Normalizes to founder-safe statuses.
// Unknown key -> HOLD_REFUSED. Unsafe-name key -> UNSAFE_SOURCE_REFUSED (never executed).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, '..', '..');
const FIX = 'tests/fixtures/local_product_loop';

// key -> { kind, runner: 'node-test'|'python'|'static', rel }
export const FIXTURE_ALLOWLIST = {
  'node-pass':    { kind:'node',   runner:'node-test', rel:`${FIX}/passing_node/index.test.mjs` },
  'node-fail':    { kind:'node',   runner:'node-test', rel:`${FIX}/failing_node/index.test.mjs` },
  'node-no-test': { kind:'node',   runner:'no-test',   rel:`${FIX}/no_test_node` },
  'python-pass':  { kind:'python', runner:'python',    rel:`${FIX}/python_style/main.py` },
  'static-web':   { kind:'static', runner:'static',    rel:`${FIX}/static_web/index.html` },
  'broken':       { kind:'node',   runner:'node-test', rel:`${FIX}/broken_project/index.test.mjs` },
};
// names that must be refused BEFORE any execution (synthetic unsafe-name entries)
const UNSAFE_KEY = /customer|private|prod(uction)?|secret|billing/i;

const CEIL = 'INTERNAL_DEMO_ONLY';
function shape(status, explanation, exportEligible, next){
  return { status, decision_ceiling: CEIL, decision: status==='PASS'?CEIL:'UNKNOWN',
    explanation, evidence_status: status==='PASS'?'FRESH (ready to export)':'UNKNOWN',
    export_eligible: !!exportEligible, next_action: next };
}

export function runFixture(key){
  if (typeof key !== 'string' || !key) return shape('HOLD_REFUSED','No fixture selected.', false, 'Pick a safe fixture.');
  if (UNSAFE_KEY.test(key)) return shape('UNSAFE_SOURCE_REFUSED','This source name looks unsafe (customer/private/production/secret/billing). Refused before any execution.', false, 'Choose a safe synthetic fixture.');
  const f = FIXTURE_ALLOWLIST[key];
  if (!f) return shape('HOLD_REFUSED','Unknown fixture — not on the local allowlist.', false, 'Choose a safe synthetic fixture, or ask ChatGPT.');
  const abs = resolve(REPO_ROOT, f.rel);
  if (!abs.startsWith(REPO_ROOT + '/')) return shape('HOLD_REFUSED','Fixture path escapes the repo root.', false, 'Choose a safe synthetic fixture.');
  if (!existsSync(abs)) return shape('UNKNOWN','Fixture is missing on disk.', false, 'Nothing was faked. Ask ChatGPT.');

  // static: nothing to execute — presence check only
  if (f.runner === 'static') return shape('PASS','Static web fixture is present (no tests to run).', true, 'You can export evidence.');
  // no-test node project: honest NO_TESTS_FOUND
  if (f.runner === 'no-test') return shape('NO_TESTS_FOUND','This project has no tests to run.', false, 'Nothing was faked. Add tests or pick another fixture.');

  const opts = { cwd: REPO_ROOT, timeout: 15000, stdio: ['ignore','pipe','pipe'], env: { PATH: process.env.PATH } };
  try {
    if (f.runner === 'node-test') { execFileSync('node', [abs], opts); return shape('PASS','Node tests passed.', true, 'You can export evidence.'); }
    if (f.runner === 'python') {
      const py = pythonBin(); if (!py) return shape('UNKNOWN','No local python available (and no install is attempted).', false, 'Nothing was faked.');
      execFileSync(py, [abs], opts); return shape('PASS','Python fixture passed.', true, 'You can export evidence.');
    }
    return shape('UNKNOWN','Unknown project type.', false, 'Nothing was faked.');
  } catch (e) {
    const msg = String(e && e.message || '');
    if (/SyntaxError|Unexpected token|Cannot find module|MODULE_NOT_FOUND/i.test(msg)) return shape('BROKEN_PROJECT','The project could not be run (syntax/module error).', false, 'Nothing was faked. Fix the project or pick another fixture.');
    if (e && e.signal === 'SIGTERM') return shape('UNKNOWN','The check timed out and was stopped safely.', false, 'Nothing was faked.');
    return shape('FAIL','Tests failed.', false, 'Nothing was faked. Fix the project or pick another fixture.');
  }
}
function pythonBin(){ for (const b of ['python3','python']) { try { execFileSync(b, ['--version'], { stdio:'ignore', timeout:4000 }); return b; } catch {} } return null; }
