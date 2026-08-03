// FounderGate — crash/recovery fault-injection harness. Builds a GOOD current-run app, then creates isolated
// broken copies under tests/generated_apps/crash_fixtures/<fixture_id>/, classifies each (never corrupting
// Round 1/2 evidence), attempts recovery ONLY where mechanically safe, retests recovered apps, and records
// original failure + recovery. Local synthetic only.
import { ARCHETYPES } from './archetypes.mjs';
import { requestHash } from '../idea_builder/template-registry.mjs';
import { classifyApp, contentHash } from '../generated_app_runner/validate-app.mjs';
import { writeFileSync, readFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUN_ID = process.env.CRASH_RUN_ID || 'crash_20260803T1030ET';
const DOCS = process.env.RR || join(REPO, 'docs/generated/local_app_factory_crash_recovery_gauntlet');
const LIVE = 'http://127.0.0.1:4880';
const DEAD = 'http://127.0.0.1:4999';           // unreachable endpoint (isolated server-down injection)
const FIXROOT = join(REPO, 'tests/generated_apps/crash_fixtures');
const ARCH = 'reading_list';                     // base archetype for reconstructable fixtures

// write a GOOD app into dir (relative repo path relDir), current run_id, optionally recording checker hash
function generateInto(fixtureId, { recordCheckerHash = false } = {}) {
  const a = ARCHETYPES[ARCH];
  const relDir = `tests/generated_apps/crash_fixtures/${fixtureId}`;
  const absDir = join(REPO, relDir);
  rmSync(absDir, { recursive: true, force: true });
  mkdirSync(join(absDir, 'tests'), { recursive: true });
  writeFileSync(join(absDir, 'core.mjs'), a.core());
  writeFileSync(join(absDir, 'index.html'), a.html());
  writeFileSync(join(absDir, 'tests', a.test_name), a.test());
  writeFileSync(join(absDir, 'LIMITATIONS.md'), `# ${a.title} (crash fixture ${fixtureId}) — local synthetic, never ship.\n`);
  const request_text = a.request_text;
  const request_hash = requestHash(request_text);
  const m = {
    manifest_kind: 'CRASH_FIXTURE_APP', run_id: RUN_ID,
    request_id: 'req_' + request_hash, request_text, request_hash,
    selected_template_id: a.id, generated_app_path: relDir,
    preview_url: `../../${relDir}/index.html`,
    test_plan: `${relDir}/tests/${a.test_name}`,
    builder_identity: 'FounderGate crash harness',
    checker_verdict: 'PENDING_INDEPENDENT_CHECKER', terminal_advisor_verdict: 'PENDING_INDEPENDENT_TERMINAL_ADVISOR',
    final_status: 'BUILT',
  };
  if (recordCheckerHash) m.checker_content_hash = contentHash(absDir);
  writeFileSync(join(absDir, 'manifest.json'), JSON.stringify(m, null, 2));
  return { relDir, absDir, m };
}
const P = (rel) => join(REPO, rel);

async function cls(absDir, opts = {}) { return classifyApp(absDir, { currentRunId: RUN_ID, ...opts }); }

const results = [];
async function record(fixture_id, injected_fault, expected, absDir, classifyOpts, recover) {
  const before = await cls(absDir, classifyOpts);
  let recovery = { attempted: false, action: 'none', after: null, succeeded: false, limitations: '' };
  if (recover) {
    recovery.attempted = true;
    const r = await recover(absDir);
    recovery = { ...recovery, ...r };
  }
  const row = {
    fixture_id, injected_fault, expected_classification: expected,
    actual_classification: before.classification, preview_allowed: before.preview_allowed,
    test_result: before.test_result, reason: before.reason,
    recovery,
  };
  results.push(row);
  console.log(`${fixture_id}: ${before.classification} (expected ${expected}) preview=${before.preview_allowed}${recovery.attempted ? ' | recovery=' + (recovery.succeeded ? recovery.after_classification : 'HELD') : ''}`);
  return row;
}

mkdirSync(FIXROOT, { recursive: true });
mkdirSync(join(DOCS, 'fixtures'), { recursive: true });

// ---- F01 missing manifest (recoverable) ----
{ const { absDir } = generateInto('F01_missing_manifest'); rmSync(join(absDir, 'manifest.json'));
  await record('F01_missing_manifest', 'deleted manifest.json', 'HOLD_MISSING_MANIFEST', absDir, {}, async (d) => {
    generateInto('F01_missing_manifest'); const after = await cls(d); const rt = after.classification === 'OK';
    return { action: 'regenerated manifest+app from archetype (reconstructable)', after_classification: after.classification, succeeded: rt, retested: after.test_result, limitations: 'recovered only because source archetype is deterministic' };
  }); }
// ---- F02 corrupted manifest (recoverable) ----
{ const { absDir } = generateInto('F02_corrupted_manifest'); writeFileSync(join(absDir, 'manifest.json'), '{ this is not : valid json ,,,');
  await record('F02_corrupted_manifest', 'wrote invalid JSON to manifest', 'HOLD_CORRUPTED_MANIFEST', absDir, {}, async (d) => {
    generateInto('F02_corrupted_manifest'); const after = await cls(d);
    return { action: 'refused corrupted manifest; regenerated from archetype', after_classification: after.classification, succeeded: after.classification === 'OK', retested: after.test_result, limitations: 'source artifact intact' };
  }); }
// ---- F03 request_hash mismatch (HOLD, no recovery) ----
{ const { absDir, m } = generateInto('F03_hash_mismatch'); m.request_text = 'build a local habit tracker'; /* keep old request_id */ writeFileSync(join(absDir, 'manifest.json'), JSON.stringify(m, null, 2));
  await record('F03_hash_mismatch', 'request_text changed, request_id left stale', 'HOLD_REQUEST_HASH_MISMATCH', absDir, {}); }
// ---- F04 preview mismatch (recoverable: rebind) ----
{ const { absDir, m } = generateInto('F04_preview_mismatch'); m.preview_url = '../../tests/generated_apps/crash_fixtures/F01_missing_manifest/index.html'; writeFileSync(join(absDir, 'manifest.json'), JSON.stringify(m, null, 2));
  await record('F04_preview_mismatch', 'preview_url points to a different app', 'HOLD_PREVIEW_MISMATCH', absDir, {}, async (d) => {
    const mm = JSON.parse(readFileSync(join(d, 'manifest.json'), 'utf8')); mm.preview_url = `../../${mm.generated_app_path}/index.html`; writeFileSync(join(d, 'manifest.json'), JSON.stringify(mm, null, 2)); const after = await cls(d);
    return { action: 'rebound preview_url to own app folder', after_classification: after.classification, succeeded: after.classification === 'OK', retested: after.test_result, limitations: 'mechanically safe rebind' };
  }); }
// ---- F05 failing app test (HOLD, no fake pass) ----
{ const { absDir } = generateInto('F05_test_failure'); writeFileSync(join(absDir, 'tests', 'reading.selftest.mjs'), 'console.error("FAIL: injected"); process.exit(1);');
  await record('F05_test_failure', 'app test replaced with a failing test', 'HOLD_TEST_FAILURE', absDir, {}); }
// ---- F06 missing index.html (recoverable) ----
{ const { absDir } = generateInto('F06_missing_index'); rmSync(join(absDir, 'index.html'));
  await record('F06_missing_index', 'deleted index.html', 'HOLD_PARTIAL_GENERATION', absDir, {}, async (d) => {
    generateInto('F06_missing_index'); const after = await cls(d);
    return { action: 'regenerated app from archetype', after_classification: after.classification, succeeded: after.classification === 'OK', retested: after.test_result, limitations: '' };
  }); }
// ---- F07 stale Round 1 evidence (HOLD) ----
{ const src = P('tests/generated_apps/factory_runs/req_f436e095'); const absDir = join(FIXROOT, 'F07_stale_round1'); rmSync(absDir, { recursive: true, force: true }); cpSync(src, absDir, { recursive: true });
  await record('F07_stale_round1', 'Round 1 app presented as current crash proof', 'HOLD_STALE_EVIDENCE', absDir, {}, async () => ({ action: 'refused reuse; requires current run_id', after_classification: 'HOLD_STALE_EVIDENCE', succeeded: false, limitations: 'stale evidence is never accepted as current' })); }
// ---- F08 stale Round 2 evidence (HOLD) ----
{ const src = P('tests/generated_apps/factory_round2/req_8b7de6b1'); const absDir = join(FIXROOT, 'F08_stale_round2'); rmSync(absDir, { recursive: true, force: true }); cpSync(src, absDir, { recursive: true });
  await record('F08_stale_round2', 'Round 2 app presented as current crash proof', 'HOLD_STALE_EVIDENCE', absDir, {}, async () => ({ action: 'refused reuse; requires current run_id', after_classification: 'HOLD_STALE_EVIDENCE', succeeded: false, limitations: 'stale evidence is never accepted as current' })); }
// ---- F09 unsupported/unsafe request tries to get preview (HOLD) ----
{ const { absDir, m } = generateInto('F09_unsupported'); m.request_text = 'an app that emails customers from google calendar'; m.request_id = 'req_' + requestHash(m.request_text); writeFileSync(join(absDir, 'manifest.json'), JSON.stringify(m, null, 2));
  await record('F09_unsupported', 'manifest for an unsupported/unsafe request', 'HOLD_UNSUPPORTED_OR_UNSAFE', absDir, {}); }
// ---- F10 server unavailable (recoverable via live server) ----
{ const { absDir } = generateInto('F10_server_unavailable');
  await record('F10_server_unavailable', 'preview server unreachable (dead port)', 'HOLD_SERVER_UNAVAILABLE', absDir, { serverBase: DEAD }, async (d) => {
    const after = await cls(d, { serverBase: LIVE });
    return { action: 'verified owned local server reachable; re-checked preview', after_classification: after.classification, succeeded: after.classification === 'OK', retested: after.test_result, limitations: 'isolated unreachable-endpoint injection (did not kill the shared demo server)' };
  }); }
// ---- F11 partial generation interrupted (recoverable) ----
{ const { absDir } = generateInto('F11_partial_generation'); rmSync(join(absDir, 'core.mjs'));
  await record('F11_partial_generation', 'core.mjs missing (interrupted mid-generation)', 'HOLD_PARTIAL_GENERATION', absDir, {}, async (d) => {
    rmSync(d, { recursive: true, force: true }); generateInto('F11_partial_generation'); const after = await cls(d);
    return { action: 'cleaned isolated partial fixture; regenerated', after_classification: after.classification, succeeded: after.classification === 'OK', retested: after.test_result, limitations: '' };
  }); }
// ---- F12 post-checker mutation invalidates verdict (HOLD) ----
{ const { absDir } = generateInto('F12_post_checker_mutation', { recordCheckerHash: true }); const mm = JSON.parse(readFileSync(join(absDir, 'manifest.json'), 'utf8')); mm.checker_verdict = 'CLEAN_WITH_LIMITS'; writeFileSync(join(absDir, 'manifest.json'), JSON.stringify(mm, null, 2));
  writeFileSync(join(absDir, 'core.mjs'), '// tampered after checker\n' + ARCHETYPES[ARCH].core());
  await record('F12_post_checker_mutation', 'app files mutated after checker recorded content hash', 'HOLD_POST_CHECKER_MUTATION', absDir, {}); }

// summary + machine-readable results + UI index
const holds = results.filter((r) => r.actual_classification.startsWith('HOLD')).length;
const recovered = results.filter((r) => r.recovery.attempted && r.recovery.succeeded).length;
const anyGreenOnBroken = results.some((r) => r.actual_classification !== 'OK' && r.preview_allowed);
const matched = results.filter((r) => r.actual_classification === r.expected_classification).length;
writeFileSync(join(DOCS, 'CRASH_FIXTURE_RESULTS.json'), JSON.stringify({ run_id: RUN_ID, total: results.length, holds, recovered, anyGreenOnBroken, matched, results }, null, 2));

// UI index (crash panel fetches this)
const uiIndex = {
  kind: 'CRASH_INDEX', run_id: RUN_ID,
  fixtures: results.map((r) => ({
    fixture_id: r.fixture_id, fault: r.injected_fault,
    expected: r.expected_classification, actual: r.actual_classification,
    preview_allowed: r.preview_allowed, test_result: r.test_result,
    recovery: r.recovery.attempted ? (r.recovery.succeeded ? 'RECOVERED_WITH_LIMITS' : 'HELD') : 'n/a',
    recovery_after: r.recovery.after_classification || null,
  })),
  disclaimer: 'Local synthetic crash-test fixtures. No broken fixture is ever shown green. Never ship.',
};
mkdirSync(join(REPO, 'demo/founder_operating_environment/assets/crash'), { recursive: true });
writeFileSync(join(REPO, 'demo/founder_operating_environment/assets/crash/crash_index.json'), JSON.stringify(uiIndex, null, 2));

console.log(`\nCRASH_HARNESS total=${results.length} holds=${holds} recovered=${recovered} matched=${matched}/${results.length} anyGreenOnBroken=${anyGreenOnBroken}`);
if (anyGreenOnBroken) { console.error('FATAL: a broken fixture was shown green'); process.exit(1); }
if (matched !== results.length) { console.error('FATAL: a fixture did not classify as expected'); process.exit(1); }
console.log('CRASH_HARNESS_OK');
