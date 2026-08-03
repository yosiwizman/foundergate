// Repo evidence workflow selftest: local allowlisted folders OK; private/remote HELD; no network.
import { checkRepo } from '../../src/repo_evidence/repo_check.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let p = 0, f = 0; const ok = (c, m) => { if (c) p++; else { f++; console.error('FAIL: ' + m); } };

// local generated app (has tests) → OK with limits, no network
const a = checkRepo('tests/generated_apps/provider_runs/claude_code_simulated', { repoRoot: REPO });
ok(/LOCAL_REPO_(OK_WITH_LIMITS|NO_TESTS)/.test(a.classification) && a.network_used === false, 'local generated app → local repo classification, no network');
// self-owned demo folder → OK-ish, allowlisted
const b = checkRepo('publish_candidates/self_owned_demo_repo', { repoRoot: REPO });
ok(!/HELD/.test(b.classification) && b.private_repo_accessed === false, 'self-owned demo folder → allowlisted (not held)');
// private / remote → HELD
ok(checkRepo('https://github.com/x/private-repo', { repoRoot: REPO }).classification === 'HELD_UNSUPPORTED_OR_PRIVATE', 'remote github → HELD');
ok(checkRepo('/some/private/customer/data', { repoRoot: REPO }).classification === 'HELD_UNSUPPORTED_OR_PRIVATE', 'private/customer path → HELD');
ok(checkRepo('../../etc/passwd', { repoRoot: REPO }).classification === 'HELD_UNSUPPORTED_OR_PRIVATE', 'path traversal → HELD');
// non-allowlisted local path → HELD
ok(checkRepo('src/operator_console', { repoRoot: REPO }).classification === 'HELD_UNSUPPORTED_OR_PRIVATE', 'non-allowlisted local → HELD');

const t = p + f;
if (f === 0) { console.log(`ALL GREEN: ${p}/${t} repo-check selftest(s) passed.`); process.exit(0); }
else { console.error(`RED: ${f}/${t} failed.`); process.exit(1); }
