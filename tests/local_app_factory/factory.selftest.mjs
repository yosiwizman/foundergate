// Local App Factory unit tests: request→artifact binding, deterministic selection, manifest integrity,
// and that the Builder cannot set the Checker/Terminal verdicts. Zero-dep; spawns node for one app's selftest.
import { generateAndTest, selectArchetypes } from '../../src/local_app_builder/app-factory.mjs';
import { ARCHETYPE_IDS } from '../../src/local_app_builder/archetypes.mjs';
import { requestHash, classifyRequest } from '../../src/idea_builder/template-registry.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let p = 0, f = 0; const ok = (c, m) => { if (c) p++; else { f++; console.error('FAIL: ' + m); } };

// deterministic selection: same seed → same 4; distinct; excludes calculator/task_planner
const pool = ARCHETYPE_IDS.filter((id) => id !== 'calculator' && id !== 'task_planner');
const s1 = selectArchetypes('20260803T0835ET', pool, 4);
const s2 = selectArchetypes('20260803T0835ET', pool, 4);
ok(JSON.stringify(s1) === JSON.stringify(s2), 'selection deterministic for same seed');
ok(new Set(s1).size === 4, 'selection picks 4 distinct apps');
ok(!s1.includes('calculator') && !s1.includes('task_planner'), 'selection excludes calculator + task_planner');
ok(selectArchetypes('different-seed', pool, 4).join() !== s1.join() || pool.length === 4, 'different seed can change selection');

// generate one app and verify binding + real files
const m = generateAndTest('notes_board');
ok(m.request_id === 'req_' + m.request_hash, 'request_id binds to request_hash');
ok(m.request_hash === requestHash(m.request_text), 'request_hash matches text');
ok(existsSync(join(REPO, m.generated_app_path, 'index.html')), 'index.html exists on disk');
ok(existsSync(join(REPO, m.generated_app_path, 'core.mjs')), 'core.mjs exists on disk');
ok(existsSync(join(REPO, m.test_plan)), 'app-specific test file exists on disk');
ok(m.preview_url.includes(m.request_id), 'preview_url is inside THIS app folder (bound, not hardcoded)');
ok(/^PASS \d+\/\d+$/.test(m.test_results.result), 'PASS only reported after tests actually ran+passed');
ok(m.final_status === 'BUILT_AND_PASSED', 'final_status BUILT_AND_PASSED (files + tests)');
// Builder cannot certify: verdict fields are PENDING, not set by the factory
ok(m.checker_verdict.startsWith('PENDING'), 'checker_verdict is PENDING (builder cannot self-certify)');
ok(m.terminal_advisor_verdict.startsWith('PENDING'), 'terminal_advisor_verdict is PENDING');
// wrong-app impossible: a different archetype → different request_id + different preview folder
const m2 = generateAndTest('score_keeper');
ok(m2.request_id !== m.request_id && !m2.preview_url.includes(m.request_id), 'distinct app → distinct bound preview (no cross-app)');

// unsupported / held requests must NOT become a factory app
ok(classifyRequest('build an app that emails customers from Google Calendar').kind === 'UNSUPPORTED_LOCAL_TEMPLATE', 'emails+calendar app → UNSUPPORTED');
ok(classifyRequest('deploy my notes app to production').kind === 'HELD_REQUIRES_FOUNDER_GATE', 'deploy → HELD');
ok(classifyRequest('an app using real customer production data').kind === 'UNSUPPORTED_LOCAL_TEMPLATE', 'production data → UNSUPPORTED');

const t = p + f;
if (f === 0) { console.log(`ALL GREEN: ${p}/${t} factory selftest(s) passed.`); process.exit(0); }
else { console.error(`RED: ${f}/${t} failed.`); process.exit(1); }
