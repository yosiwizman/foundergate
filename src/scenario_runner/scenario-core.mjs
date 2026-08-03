// Local scenario runner adapter. Executes ONLY vetted SYNTHETIC / self-owned scenario fixtures
// (calendar/task/crud/static), via execFileSync array-args (NO shell), timeout, NO network, NO
// dependency install, NO provider, NO real account/calendar/customer/production data.
// Unsafe scenario names are refused BEFORE execution. Statuses are scenario-normalized; never SHIP.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, '..', '..');
const SC = 'tests/fixtures/scenarios';

// key -> { type, runner, rel, preview }
export const SCENARIO_ALLOWLIST = {
  'calendar-app-pass':  { type:'calendar', runner:'node-test', rel:`${SC}/calendar_app_pass/index.test.mjs`, preview:'calendar' },
  'calendar-app-fail':  { type:'calendar', runner:'node-test', rel:`${SC}/calendar_app_fail/index.test.mjs`, preview:'calendar' },
  'task-app-pass':      { type:'task',     runner:'node-test', rel:`${SC}/task_app_pass/index.test.mjs`,     preview:'task' },
  'task-app-fail':      { type:'task',     runner:'node-test', rel:`${SC}/task_app_fail/index.test.mjs`,     preview:'task' },
  'crud-api-pass':      { type:'crud-api', runner:'node-test', rel:`${SC}/crud_api_pass/index.test.mjs`,     preview:'crud' },
  'crud-api-fail':      { type:'crud-api', runner:'node-test', rel:`${SC}/crud_api_fail/index.test.mjs`,     preview:'crud' },
  'static-site-pass':   { type:'static',   runner:'static',    rel:`${SC}/static_site_pass/index.html`,      preview:'static' },
  'static-site-broken': { type:'static',   runner:'node-test', rel:`${SC}/static_site_broken/index.test.mjs`,preview:'static' },
  'no-test-scenario':   { type:'unknown',  runner:'no-test',   rel:`${SC}/no_test_scenario`,                 preview:'none' },
  'dependency-missing-scenario': { type:'node', runner:'node-deps', rel:`${SC}/dependency_missing_scenario`, preview:'none' },
};
// unsafe scenario names refused BEFORE any execution
const UNSAFE_SCENARIO = /customer|private|prod(uction)?|secret|billing|real[-_ ]?account/i;

const CEIL = 'INTERNAL_DEMO_ONLY';
// synthetic preview payloads (NO real data, NO account, NO network)
const PREVIEW = {
  calendar: { kind:'SYNTHETIC_CALENDAR', note:'synthetic events only — no real account, no invites, no emails, no reminders, no sends',
    events:[{title:'Synthetic standup', day:'Mon', time:'09:00'},{title:'Synthetic review', day:'Mon', time:'11:00'}] },
  task:   { kind:'SYNTHETIC_TASKS', note:'synthetic tasks only', items:['Draft outline (synthetic)','Write tests (synthetic)','Ship demo — DISABLED (never ship)'] },
  crud:   { kind:'SYNTHETIC_CRUD', note:'in-memory only — no database, no network', rows:[{id:1,name:'alpha (synthetic)'}] },
  static: { kind:'SYNTHETIC_STATIC', note:'static synthetic page — no backend' },
  none:   { kind:'NONE', note:'no preview for this scenario' },
};

function shape(status, type, explanation, exportEligible, next, preview){
  return { status, scenario_type:type, decision_ceiling:CEIL,
    decision: status==='SCENARIO_PASS'?CEIL:'UNKNOWN',
    explanation, evidence_status: status==='SCENARIO_PASS'?'FRESH (ready to export)':'UNKNOWN',
    export_eligible: !!exportEligible, next_action: next,
    preview_status: preview ? preview.kind : 'NONE', preview: preview || PREVIEW.none,
    limitations:'Local-only, internal, synthetic/self-owned scenario. No real account/calendar/customer/production data. Not production/SaaS/secure/customer-ready.',
    not_proven:'production readiness, security/compliance, real integrations, customer/market/paid validation.' };
}

export function runScenario(key){
  if (typeof key !== 'string' || !key) return shape('UNKNOWN','unknown','No scenario selected.', false, 'Pick a synthetic scenario.', PREVIEW.none);
  if (UNSAFE_SCENARIO.test(key)) return shape('UNSAFE_SCENARIO_REFUSED','unsafe','This scenario name looks unsafe (customer/private/production/real-account). Refused before any execution — no real data is touched.', false, 'Choose a synthetic scenario.', PREVIEW.none);
  const s = SCENARIO_ALLOWLIST[key];
  if (!s) return shape('UNKNOWN','unknown','Unknown scenario — not on the local allowlist.', false, 'Choose a synthetic scenario.', PREVIEW.none);
  const abs = resolve(REPO_ROOT, s.rel);
  if (!abs.startsWith(REPO_ROOT + '/')) return shape('UNKNOWN', s.type, 'Scenario path escapes repo root.', false, 'Choose a synthetic scenario.', PREVIEW.none);
  if (!existsSync(abs)) return shape('UNKNOWN', s.type, 'Scenario fixture missing on disk.', false, 'Nothing was faked.', PREVIEW[s.preview]);
  const prev = PREVIEW[s.preview] || PREVIEW.none;
  if (s.runner === 'static') return shape('SCENARIO_PASS', s.type, 'Synthetic static scenario present (nothing to run).', true, 'You can export scenario evidence.', prev);
  if (s.runner === 'no-test') return shape('NO_TESTS_FOUND', s.type, 'This scenario has no tests to run.', false, 'Nothing was faked.', prev);
  if (s.runner === 'node-deps') {
    // dependency-aware: declared deps + no node_modules -> HOLD (no install)
    if (existsSync(join(abs,'package.json')) && !existsSync(join(abs,'node_modules')))
      return shape('HOLD_DEPENDENCIES_NOT_INSTALLED', s.type, 'This scenario declares dependencies that are not installed (no install is attempted).', false, 'Nothing was faked.', prev);
  }
  const opts = { cwd: REPO_ROOT, timeout: 15000, stdio:['ignore','pipe','pipe'], env:{ PATH: process.env.PATH } };
  const entry = s.runner === 'node-deps' ? join(abs,'index.test.mjs') : abs;
  try { execFileSync('node', [entry], opts); return shape('SCENARIO_PASS', s.type, 'Synthetic scenario tests passed.', true, 'You can export scenario evidence.', prev); }
  catch (e) {
    const m = String(e && e.message || '');
    if (/SyntaxError|Unexpected token|Cannot find module|MODULE_NOT_FOUND/i.test(m)) return shape('BROKEN_SCENARIO', s.type, 'The scenario could not be run (syntax/module error).', false, 'Nothing was faked.', prev);
    if (e && e.signal === 'SIGTERM') return shape('UNKNOWN', s.type, 'The scenario timed out and was stopped safely.', false, 'Nothing was faked.', prev);
    return shape('SCENARIO_FAIL', s.type, 'Synthetic scenario tests failed.', false, 'Nothing was faked. Fix the scenario or pick another.', prev);
  }
}
export function scenarioKeys(){ return Object.keys(SCENARIO_ALLOWLIST); }
