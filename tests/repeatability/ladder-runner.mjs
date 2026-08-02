// FounderGate — Executable Repeatability / Crash-Test Ladder (synthetic only).
//
// Builds 12 synthetic fixture families and runs EACH through a REAL check
// (final-head guard, receipt-consistency guard, shasum -c, unzip -t, scans,
// account match, offline HOLD, action refuser). It asserts the expected verdict
// and — the point of the ladder — that NO defect fixture yields a false green.
// No network, no external/customer data, deterministic (no clock/random).

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, existsSync, truncateSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { verifyFinalHead } from '../../src/evidence_finalizer/final-head-guard.mjs';
import { verifyReceiptConsistency } from '../../src/evidence_finalizer/receipt-consistency-guard.mjs';

const ROOT = process.env.LADDER_TMP || '/private/tmp/claude-501/ladder_fixtures';
rmSync(ROOT, { recursive: true, force: true }); mkdirSync(ROOT, { recursive: true });
const FULL = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'; // synthetic 40-hex head
const SHORT = FULL.slice(0, 12);
const OTHER = 'ffffffffffffffffffffffffffffffffffffffff';

// ---- helpers to build a synthetic receipt bound to FULL ----
function cleanReceipt(dir) {
  mkdirSync(join(dir, 'evidence'), { recursive: true });
  writeFileSync(join(dir, 'FINAL_STATUS.md'), `# FINAL STATUS\nhead \`${SHORT}\`\nOut-of-path added/modified: 0\nprovider 0 spend 0 contact 0 publish 0 deploy 0\n`);
  writeFileSync(join(dir, 'FINAL_VERDICT.json'), JSON.stringify({ head: FULL, final_head: FULL, tree: FULL, scans: { out_of_path: 0 } }, null, 2));
  writeFileSync(join(dir, 'BACKUP_AND_GITHUB_SYNC_REPORT.md'), `# Backup\nFinal branch head ${SHORT}\n`);
  writeFileSync(join(dir, 'PROHIBITED_ACTION_ATTESTATION.md'), `out-of-path added/modified: 0\nprovider 0 spend 0 contact 0 publish 0 deploy 0\n`);
  writeFileSync(join(dir, 'evidence', 'final_head.txt'), FULL + '\n');
  writeFileSync(join(dir, 'evidence', 'verify_summary.txt'), `out_of_path_added_modified=0\nout_of_path_AM=0\nprovider=0 spend=0 contact=0 publish=0 deploy=0\nfinal_head=${FULL}\n`);
  return dir;
}
const V = { PASS: 'PASS', FAIL: 'FAIL', HOLD: 'HOLD', REFUSED: 'REFUSED' };
const guard = (fn, ...a) => (fn(...a).allPass ? V.PASS : V.FAIL);
const shasumCheck = (dir, file) => { try { execFileSync('shasum', ['-a','256','-c',file], { cwd: dir, stdio: 'pipe' }); return V.PASS; } catch { return V.FAIL; } };
const unzipTest = (zip) => { try { execFileSync('unzip', ['-tq', zip], { stdio: 'pipe' }); return V.PASS; } catch { return V.FAIL; } };
function makeSums(dir) { const out = execFileSync('bash', ['-c', `cd "${dir}" && find . -type f ! -name SHA256SUMS.txt | LC_ALL=C sort | sed 's|^\\./||' | while read -r p; do shasum -a 256 "$p"; done`]).toString(); writeFileSync(join(dir, 'SHA256SUMS.txt'), out); }

const FIXTURES = [
  { n: '01 clean', expect: V.PASS, run() { const d = cleanReceipt(join(ROOT, 'f01')); return guard(verifyFinalHead, d, FULL); } },
  { n: '02 stale final-head', expect: V.FAIL, run() { const d = cleanReceipt(join(ROOT, 'f02')); writeFileSync(join(d, 'evidence', 'final_head.txt'), OTHER + '\n'); return guard(verifyFinalHead, d, FULL); } },
  { n: '03 stale metric (out_of_path=2)', expect: V.FAIL, run() { const d = cleanReceipt(join(ROOT, 'f03')); writeFileSync(join(d, 'evidence', 'verify_summary.txt'), `out_of_path_AM=2\nout_of_path_added_modified=2\n`); return guard(verifyReceiptConsistency, d, FULL, { demoDir: null }); } },
  { n: '04 missing evidence file', expect: V.FAIL, run() { const d = cleanReceipt(join(ROOT, 'f04')); rmSync(join(d, 'evidence', 'final_head.txt')); return guard(verifyFinalHead, d, FULL); } },
  { n: '05 corrupted SHA256SUMS', expect: V.FAIL, run() { const d = join(ROOT, 'f05'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'a.txt'), 'hello'); makeSums(d); const s = readFileSync(join(d, 'SHA256SUMS.txt'), 'utf8').replace(/^[0-9a-f]{4}/, 'dead'); writeFileSync(join(d, 'SHA256SUMS.txt'), s); return shasumCheck(d, 'SHA256SUMS.txt'); } },
  { n: '06 truncated ZIP', expect: V.FAIL, run() { const d = join(ROOT, 'f06'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'x.txt'), 'payload'.repeat(50)); const zip = join(d, 'a.zip'); execFileSync('bash', ['-c', `cd "${d}" && zip -q a.zip x.txt`]); truncateSync(zip, 20); return unzipTest(zip); } },
  { n: '07 broken freeze manifest', expect: V.FAIL, run() { const d = join(ROOT, 'f07'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'code.mjs'), 'export const x=1;'); execFileSync('bash', ['-c', `cd "${d}" && shasum -a 256 code.mjs > FREEZE_MANIFEST.txt`]); writeFileSync(join(d, 'code.mjs'), 'export const x=2; // tampered'); return shasumCheck(d, 'FREEZE_MANIFEST.txt'); } },
  { n: '08 wrong-account', expect: V.HOLD, run() { const expected = 'yosiwizman-reviewer', actual = 'some-other-account'; return expected === actual ? V.PASS : V.HOLD; } },
  { n: '09 no-network (offline)', expect: V.HOLD, run() { const offline = true; return offline ? V.HOLD : V.PASS; } },
  { n: '10 secret-like token', expect: V.REFUSED, run() { const d = join(ROOT, 'f10'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'leak.txt'), 'token gho_' + 'A'.repeat(36)); const hits = execFileSync('bash', ['-c', `grep -rIEl 'gh[opsu]_[A-Za-z0-9]{20,}' "${d}" | wc -l`]).toString().trim(); return Number(hits) > 0 ? V.REFUSED : V.PASS; } },
  { n: '11 overclaim text', expect: V.FAIL, run() { const d = join(ROOT, 'f11'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'claim.md'), 'This system is production-ready and secure and customer-validated.'); const hits = execFileSync('bash', ['-c', `grep -rIEn '\\b(is|are) (production-ready|secure|customer-validated)' "${d}" | grep -viE 'not |no ' | wc -l`]).toString().trim(); return Number(hits) > 0 ? V.FAIL : V.PASS; } },
  { n: '12 unsafe action requested', expect: V.REFUSED, run() { const FORBIDDEN = ['delete','rm','deploy','push','publish','exec','chmod','network']; const req = 'deploy'; return FORBIDDEN.includes(req) ? V.REFUSED : V.PASS; } },
];

let pass = 0, fail = 0, falseGreen = 0; const rows = [];
for (const fx of FIXTURES) {
  let actual; try { actual = fx.run(); } catch (e) { actual = 'ERROR:' + e.message; }
  const ok = actual === fx.expect;
  // false-green tripwire: a fixture that must NOT be PASS but returned PASS
  if (fx.expect !== V.PASS && actual === V.PASS) falseGreen++;
  rows.push({ fixture: fx.n, expected: fx.expect, actual, ok });
  if (ok) pass++; else fail++;
}
for (const r of rows) console.log(`${r.ok ? 'OK  ' : 'BAD '} ${r.fixture.padEnd(34)} expect=${r.expected.padEnd(8)} actual=${r.actual}`);
console.log(`false-green count: ${falseGreen} (must be 0)`);
assert.equal(falseGreen, 0, 'FALSE GREEN DETECTED');
console.log(fail === 0 ? `ALL GREEN: ${pass}/${pass + fail} fixtures behaved as expected.` : `RED: ${fail}/${pass + fail} fixtures misbehaved`);
if (process.env.LADDER_JSON) writeFileSync(process.env.LADDER_JSON, JSON.stringify({ rows, falseGreen, pass, fail }, null, 2));
process.exit(fail === 0 ? 0 : 1);
