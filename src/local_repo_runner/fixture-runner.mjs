// Local per-fixture execution adapter. Executes ONLY vetted synthetic/self-owned fixtures from a
// strict allowlist, via execFileSync array-args (NO shell → no injection), with a hard timeout and
// NO network / NO dependency install / NO provider / NO spend. Normalizes to founder-safe statuses.
// Unknown key -> HOLD_REFUSED. Unsafe-name key -> UNSAFE_SOURCE_REFUSED (never executed).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, '..', '..');
const FIX = 'tests/fixtures/local_product_loop';

// key -> { kind, runner, rel }
export const FIXTURE_ALLOWLIST = {
  'node-pass':    { kind:'node',   runner:'node-test', rel:`${FIX}/passing_node/index.test.mjs` },
  'node-fail':    { kind:'node',   runner:'node-test', rel:`${FIX}/failing_node/index.test.mjs` },
  'node-no-test': { kind:'node',   runner:'no-test',   rel:`${FIX}/no_test_node` },
  'python-pass':  { kind:'python', runner:'python',    rel:`${FIX}/python_style/main.py` },
  'static-web':   { kind:'static', runner:'static',    rel:`${FIX}/static_web/index.html` },
  'broken':       { kind:'node',   runner:'node-test', rel:`${FIX}/broken_project/index.test.mjs` },
  // Wave 5: toolchain / monorepo / dependency-aware / unsupported
  'go-style':     { kind:'go',     runner:'toolchain', tool:'go',    rel:`${FIX}/go_style` },
  'rust-style':   { kind:'rust',   runner:'toolchain', tool:'cargo', rel:`${FIX}/rust_style` },
  'java-style':   { kind:'java',   runner:'java',      tool:'javac', rel:`${FIX}/java_style/Main.java` },
  'monorepo':     { kind:'monorepo',runner:'monorepo', rel:`${FIX}/monorepo` },
  'deps-present': { kind:'node',   runner:'node-deps', rel:`${FIX}/deps_present` },
  'deps-missing': { kind:'node',   runner:'node-deps', rel:`${FIX}/deps_missing` },
  'py-deps-missing':{ kind:'python',runner:'py-deps',  rel:`${FIX}/py_deps_missing` },
  'install-requested':{ kind:'node',runner:'install-refused', rel:`${FIX}/deps_missing` },
  'unsupported':  { kind:'unsupported', runner:'unsupported', rel:`${FIX}/unsupported` },
};
function hasTool(bin){ try{ execFileSync(bin, ['--version'], { stdio:'ignore', timeout:5000 }); return true; }catch{ return false; } }
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
  // install explicitly requested -> refused (never installs)
  if (f.runner === 'install-refused') return shape('REFUSED_NEEDS_AUTHORIZATION','Installing dependencies is not allowed here; it needs founder authorization.', false, 'Run a fixture whose dependencies are already present, or ask ChatGPT.');
  // unsupported project type
  if (f.runner === 'unsupported') return shape('UNKNOWN','Unsupported project type — no safe local adapter.', false, 'Nothing was faked. Ask ChatGPT.');

  const opts = { cwd: REPO_ROOT, timeout: 20000, stdio: ['ignore','pipe','pipe'], env: { PATH: process.env.PATH } };

  // toolchain adapters (go/rust): honest UNKNOWN_RUNTIME_MISSING when the toolchain is absent
  if (f.runner === 'toolchain') {
    if (!hasTool(f.tool)) return shape('UNKNOWN_RUNTIME_MISSING', `The ${f.tool} toolchain is not installed locally (no install is attempted).`, false, 'Nothing was faked. Install the toolchain yourself if you want, or pick another fixture.');
    try {
      if (f.tool === 'go') execFileSync('go', ['test', './...'], { ...opts, cwd: abs });
      else execFileSync('cargo', ['test'], { ...opts, cwd: abs });
      return shape('PASS', `${f.tool} tests passed.`, true, 'You can export evidence.');
    } catch { return shape('FAIL', `${f.tool} tests failed.`, false, 'Nothing was faked.'); }
  }
  // java: needs javac; compile+run a trivial Main (no deps, no network)
  if (f.runner === 'java') {
    if (!hasTool('javac')) return shape('UNKNOWN_RUNTIME_MISSING', 'The Java (javac) toolchain is not installed locally.', false, 'Nothing was faked.');
    try {
      const dir = dirname(abs);
      execFileSync('javac', [abs], { ...opts, cwd: dir });
      execFileSync('java', ['-cp', dir, 'Main'], { ...opts, cwd: dir });
      return shape('PASS', 'Java fixture compiled and passed.', true, 'You can export evidence.');
    } catch (e) { const m=String(e&&e.message||''); return shape(/error:|cannot find/i.test(m)?'BROKEN_PROJECT':'FAIL', 'Java fixture did not pass.', false, 'Nothing was faked.'); }
  }
  // monorepo: run each package's node test, aggregate honestly
  if (f.runner === 'monorepo') {
    const pkgs = ['packages/pkgA/index.test.mjs','packages/pkgB/index.test.mjs'];
    const results = pkgs.map(rel => { try { execFileSync('node', [join(abs, rel)], opts); return 'PASS'; } catch { return 'FAIL'; } });
    const pass = results.filter(r=>r==='PASS').length;
    const allPass = pass === results.length;
    return shape(allPass?'PASS':'FAIL', `Monorepo: ${pass}/${results.length} packages passed (pkgA ${results[0]}, pkgB ${results[1]}).`, allPass, allPass?'You can export evidence.':'Nothing was faked. Fix the failing package.');
  }
  // node with dependency awareness (NO install)
  if (f.runner === 'node-deps') {
    const pkg = safeJson(join(abs,'package.json'));
    const hasDeps = pkg && pkg.dependencies && Object.keys(pkg.dependencies).length > 0;
    const installed = existsSync(join(abs,'node_modules'));
    if (hasDeps && !installed) return shape('HOLD_DEPENDENCIES_NOT_INSTALLED','This project declares dependencies but they are not installed (no install is attempted).', false, 'Nothing was faked. Provide a fixture with deps already present, or ask ChatGPT.');
    try { execFileSync('node', [join(abs,'index.test.mjs')], opts); return shape('PASS','Node tests passed (dependencies already present).', true, 'You can export evidence.'); }
    catch { return shape('FAIL','Node tests failed.', false, 'Nothing was faked.'); }
  }
  // python dependency awareness (NO install)
  if (f.runner === 'py-deps') {
    if (existsSync(join(abs,'requirements.txt')) && !existsSync(join(abs,'.venv')) && !existsSync(join(abs,'venv')))
      return shape('HOLD_DEPENDENCIES_NOT_INSTALLED','Python requirements are declared but not installed (no install is attempted).', false, 'Nothing was faked.');
    return shape('UNKNOWN','Could not determine python dependency state.', false, 'Nothing was faked.');
  }
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
function safeJson(p){ try { return JSON.parse(readFileSync(p,'utf8')); } catch { return null; } }
