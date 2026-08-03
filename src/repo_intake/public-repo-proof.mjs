// Public self-owned multi-repo proof (Wave 8). Anonymous READ-ONLY clone of PUBLIC repos under
// founder-controlled namespaces ONLY; classify; run EXISTING tests ONLY when no install is needed;
// otherwise HOLD. NEVER installs deps, NEVER logs in, NEVER pushes, NEVER commits cloned code.
// Usage: node src/repo_intake/public-repo-proof.mjs <cloneDir>   (prints a JSON results array)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

// ALLOWLIST: only these PUBLIC, self-owned (non-fork) repos are touched.
const ALLOWED_NS = /^(yosiwizman|yosiwizman-reviewer)$/;
const REPOS = [
  { ns:'yosiwizman',          name:'task-ledger-demo',                  note:'baseline (already proven)' },
  { ns:'yosiwizman-reviewer', name:'task-ledger-demo-reviewer-proof',   note:'cross-account reviewer proof' },
  { ns:'yosiwizman',          name:'officebuddy',                       note:'small JS candidate' },
  { ns:'yosiwizman',          name:'akior-health-check',                note:'small Python candidate' },
  { ns:'yosiwizman',          name:'s4a-hello-world',                   note:'minimal candidate' },
];

const cloneDir = resolve(process.argv[2] || '/tmp/fg-w8-clones');
function git(args, opts={}) { return execFileSync('git', args, { timeout: 60000, stdio:['ignore','pipe','pipe'], env:{ PATH: process.env.PATH, GIT_TERMINAL_PROMPT:'0' }, ...opts }).toString(); }
function has(p){ return existsSync(p); }
function readJson(p){ try{ return JSON.parse(readFileSync(p,'utf8')); }catch{ return null; } }
function findFirst(dir, re){ try{ return execFileSync('bash',['-c',`find '${dir}' -type f -not -path '*/.git/*' | head -400`],{timeout:15000}).toString().split('\n').filter(f=>re.test(f)); }catch{ return []; } }

function classifyAndRun(dir){
  const pkg = readJson(join(dir,'package.json'));
  const hasReq = has(join(dir,'requirements.txt')) || has(join(dir,'pyproject.toml'));
  const pyFiles = findFirst(dir, /\.py$/);
  const testFiles = findFirst(dir, /(test|selftest|spec)[^/]*\.(mjs|js|ts|py)$/i);
  const nodeModules = has(join(dir,'node_modules'));
  const opts = { cwd: dir, timeout: 20000, stdio:['ignore','pipe','pipe'], env:{ PATH: process.env.PATH } };

  // ---- Node project ----
  if (pkg) {
    const deps = { ...(pkg.dependencies||{}), ...(pkg.devDependencies||{}) };
    const nDeps = Object.keys(deps).length;
    const testScript = pkg.scripts && pkg.scripts.test;
    const cls = 'node';
    if (!testScript && testFiles.length===0) return { project_type:cls, deps:nDeps, result:'NO_TESTS_FOUND', explanation:'No test script and no test files.' };
    if (nDeps>0 && !nodeModules) return { project_type:cls, deps:nDeps, result:'HOLD_DEPENDENCIES_NOT_INSTALLED', explanation:`Declares ${nDeps} dependency(ies) but node_modules absent; no install performed.` };
    // zero-dep (or deps already vendored): run the existing test via node on the test file (no npm install)
    const entry = testFiles.find(f=>/\.(mjs|js)$/.test(f)) || (testScript && /node\s+(\S+)/.exec(testScript)?.[1]);
    if (!entry) return { project_type:cls, deps:nDeps, result:'HOLD_UNSAFE_TO_RUN', explanation:'Test present but not a plain node entry; not run without a framework.' };
    try { const out = execFileSync('node', [entry.replace(dir+'/','')], opts).toString();
      const m = out.match(/(\d+\s*\/\s*\d+)|(\d+)\s+(pass(ing|ed)?)/i);
      return { project_type:cls, deps:nDeps, result:'PASS', summary: m?m[0]:'tests passed', explanation:'Existing node test passed (no install).' };
    } catch(e){ const msg=String(e.stdout||''+e.stderr||''+e.message);
      if (/Cannot find module|MODULE_NOT_FOUND/i.test(msg)) return { project_type:cls, deps:nDeps, result:'HOLD_DEPENDENCIES_NOT_INSTALLED', explanation:'Test needs an uninstalled module; no install performed.' };
      if (/SyntaxError|Unexpected token/i.test(msg)) return { project_type:cls, deps:nDeps, result:'HOLD_UNSAFE_TO_RUN', explanation:'Test could not be parsed; not run further.' };
      return { project_type:cls, deps:nDeps, result:'FAIL', explanation:'Existing node test failed.' };
    }
  }
  // ---- Python project ----
  if (pyFiles.length>0) {
    const cls='python';
    if (hasReq) return { project_type:cls, result:'HOLD_DEPENDENCIES_NOT_INSTALLED', explanation:'Python requirements present but not installed; no install performed.' };
    const pyTest = testFiles.find(f=>/\.py$/.test(f));
    if (!pyTest) return { project_type:cls, result:'NO_TESTS_FOUND', explanation:'Python files but no test file.' };
    let py=null; for (const b of ['python3','python']){ try{ execFileSync(b,['--version'],{stdio:'ignore',timeout:4000}); py=b; break; }catch{} }
    if (!py) return { project_type:cls, result:'UNKNOWN_RUNTIME_MISSING', explanation:'No local python.' };
    try { execFileSync(py, [pyTest.replace(dir+'/','')], opts); return { project_type:cls, result:'PASS', explanation:'Existing python test passed (no install).' }; }
    catch(e){ const msg=String(e.stdout||''+e.stderr||''+e.message);
      if (/ModuleNotFoundError|No module named/i.test(msg)) return { project_type:cls, result:'HOLD_DEPENDENCIES_NOT_INSTALLED', explanation:'Python test needs an uninstalled module.' };
      return { project_type:cls, result:'FAIL', explanation:'Existing python test failed.' }; }
  }
  // ---- static / empty / unsupported ----
  const anyFiles = findFirst(dir, /\.(html|md|json|txt|css)$/);
  if (testFiles.length===0) return { project_type: anyFiles.length?'static':'unknown', result:'NO_TESTS_FOUND', explanation:'No runnable tests found (static/minimal repo).' };
  return { project_type:'unsupported', result:'UNSUPPORTED_PROJECT', explanation:'No safe local adapter.' };
}

const results = [];
try { if (existsSync(cloneDir)) rmSync(cloneDir, { recursive:true, force:true }); } catch {}
execFileSync('mkdir', ['-p', cloneDir]);
for (const r of REPOS) {
  if (!ALLOWED_NS.test(r.ns)) { results.push({ repo:`${r.ns}/${r.name}`, result:'SKIPPED_WITH_REASON', explanation:'namespace not in founder allowlist' }); continue; }
  const url = `https://github.com/${r.ns}/${r.name}.git`;
  const dir = join(cloneDir, `${r.ns}__${r.name}`);
  let head=null, cloned=false;
  try { git(['-c','credential.helper=','clone','--depth','1','--no-tags',url,dir]); head = git(['-C',dir,'rev-parse','HEAD']).trim(); cloned=true; }
  catch { results.push({ repo:`${r.ns}/${r.name}`, url, note:r.note, result:'CLONE_FAILED', explanation:'anonymous clone failed (repo missing/renamed/private).' }); continue; }
  const cr = classifyAndRun(dir);
  results.push({ repo:`${r.ns}/${r.name}`, url, head, note:r.note, ...cr, decision_ceiling:'INTERNAL_DEMO_ONLY', never_ship:true, install_performed:false, private:false });
}
console.log(JSON.stringify(results, null, 2));
