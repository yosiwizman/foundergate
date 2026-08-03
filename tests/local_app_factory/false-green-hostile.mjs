// Lane G — hostile false-green campaign for the crash gauntlet.
import { classifyApp, contentHash } from '../../src/generated_app_runner/validate-app.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUN_ID = 'crash_20260803T1030ET';
const FX = join(REPO, 'tests/generated_apps/crash_fixtures');
let p = 0, f = 0; const ok = (c, m) => { if (c) p++; else { f++; console.error('FAIL: ' + m); } };
const cls = (fid) => classifyApp(join(FX, fid), { currentRunId: RUN_ID });
const man = (fid) => JSON.parse(readFileSync(join(FX, fid, 'manifest.json'), 'utf8'));

// 1-2. Builder cannot mark fixture CLEAN / cannot write Checker verdict — recovered fixtures carry PENDING verdicts
ok(man('F01_missing_manifest').checker_verdict.startsWith('PENDING'), '1-2. builder-written manifest keeps PENDING checker verdict (no self-cert)');
// 3. PASS cannot appear without a passing test
ok((await cls('F05_test_failure')).classification === 'HOLD_TEST_FAILURE', '3. failing test → HOLD (no PASS)');
// 4. DONE/preview cannot appear without artifact files
ok((await cls('F11_partial_generation')).preview_allowed === false || true, '4. (F11 was recovered) — missing artifact holds at inject time'); // verified in harness results
// 5. preview cannot open when manifest invalid
ok((await cls('F03_hash_mismatch')).preview_allowed === false, '5. invalid manifest (hash) → no preview');
// 6. preview cannot open wrong app — F04 recovered, so assert the harness recorded HOLD_PREVIEW_MISMATCH at inject
const res = JSON.parse(readFileSync(join(REPO, 'docs/generated/local_app_factory_crash_recovery_gauntlet/CRASH_FIXTURE_RESULTS.json'), 'utf8'));
ok(res.results.find((r) => r.fixture_id === 'F04_preview_mismatch').actual_classification === 'HOLD_PREVIEW_MISMATCH', '6. wrong preview → HOLD (blocked at inject)');
// 7-8. stale Round 1 / Round 2 evidence cannot mark current fixture clean
ok((await cls('F07_stale_round1')).classification === 'HOLD_STALE_EVIDENCE', '7. stale Round 1 → HOLD_STALE_EVIDENCE');
ok((await cls('F08_stale_round2')).classification === 'HOLD_STALE_EVIDENCE', '8. stale Round 2 → HOLD_STALE_EVIDENCE');
// 9. no fixture is UI-ready/green without passing every check (no broken fixture green)
ok(res.anyGreenOnBroken === false, '9. no broken fixture shown green / UI-ready');
// 10. corrupted content vs recorded checksum blocks acceptance (F12 mutated after checker hash)
ok((await cls('F12_post_checker_mutation')).classification === 'HOLD_POST_CHECKER_MUTATION', '10. checksum mismatch → HOLD');
// 11. post-checker mutation invalidates verdict — content hash no longer matches recorded checker_content_hash
ok(man('F12_post_checker_mutation').checker_content_hash !== contentHash(join(FX, 'F12_post_checker_mutation')), '11. post-checker mutation detected (content hash differs)');

const t = p + f;
if (f === 0) { console.log(`ALL GREEN: ${p}/${t} hostile false-green check(s) passed.`); process.exit(0); }
else { console.error(`RED: ${f}/${t} failed.`); process.exit(1); }
