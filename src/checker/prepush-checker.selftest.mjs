#!/usr/bin/env node
// FounderGate — Independent Pre-Push Checker selftest (zero-dependency, hermetic).
//
// CHECKER SCAFFOLD ONLY — final checker claims require independent Checker +
// Advisor verification; a checker cannot self-certify; this checker never
// edits code. This selftest PROVES the scaffold's contract on fixtures; it is
// NOT itself independent verification of any real work.
//
// Proves:
//   1. Every fixtures/reports/*.json is ACCEPTED by checker-report.schema.json.
//   2. Every fixtures/reports/invalid/*.json is REJECTED.
//   3. Every fixtures/events/*.json is ACCEPTED by checker-event.schema.json.
//   4. Every fixtures/events/invalid/*.json is REJECTED.
//   5. The checker maps each snapshot fixture to the expected verdict AND the
//      report it builds validates against the schema.
//   6. READ-ONLY proof (mechanical): prepush-checker.mjs imports no filesystem
//      -write API and runs only read-only git subcommands (status/rev-parse/
//      diff) — no write/commit/push/merge token in real code.
//   7. Doctrine proof: every built report carries the verbatim doctrine,
//      self_certification=false, independent_verification_required=true,
//      checker_self_approval=false.
//   8. Mutation-reject: a checker that tries to emit an invalid report throws.
//
// Run: node src/checker/prepush-checker.selftest.mjs
// Exit 0 = PASS (prints PREPUSH-CHECKER-SELFTEST: PASS); non-zero on failure.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateFile, validateReport } from './validate.mjs';
import {
  DOCTRINE,
  deriveVerdict,
  buildReport,
  runPrePushChecker,
} from './prepush-checker.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FX = join(HERE, 'fixtures');

let failures = 0;
function ok(cond, msg) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
  } else {
    failures += 1;
    console.log(`  FAIL: ${msg}`);
  }
}

const jsonFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith('.json'));

// 1 + 2: report fixtures
const reportDir = join(FX, 'reports');
const reportInvalidDir = join(reportDir, 'invalid');
const validReports = jsonFiles(reportDir);
const invalidReports = jsonFiles(reportInvalidDir);
ok(validReports.length >= 3, `found ${validReports.length} valid report fixture(s) (>=3)`);
for (const f of validReports) {
  const { valid, errors } = validateFile(join(reportDir, f), 'report');
  ok(valid, `ACCEPT report ${f}${valid ? '' : ' — ' + errors.join('; ')}`);
}
ok(invalidReports.length >= 6, `found ${invalidReports.length} invalid report fixture(s) (>=6)`);
for (const f of invalidReports) {
  const { valid } = validateFile(join(reportInvalidDir, f), 'report');
  ok(!valid, `REJECT report invalid/${f}`);
}

// 3 + 4: event fixtures
const eventDir = join(FX, 'events');
const eventInvalidDir = join(eventDir, 'invalid');
const validEvents = jsonFiles(eventDir);
const invalidEvents = jsonFiles(eventInvalidDir);
ok(validEvents.length >= 3, `found ${validEvents.length} valid event fixture(s) (>=3)`);
for (const f of validEvents) {
  const { valid, errors } = validateFile(join(eventDir, f), 'event');
  ok(valid, `ACCEPT event ${f}${valid ? '' : ' — ' + errors.join('; ')}`);
}
ok(invalidEvents.length >= 4, `found ${invalidEvents.length} invalid event fixture(s) (>=4)`);
for (const f of invalidEvents) {
  const { valid } = validateFile(join(eventInvalidDir, f), 'event');
  ok(!valid, `REJECT event invalid/${f}`);
}

// 5: checker maps each snapshot to the expected verdict and builds a valid report
const snapDir = join(FX, 'snapshots');
const readSnap = (name) => JSON.parse(readFileSync(join(snapDir, name), 'utf8'));
const cases = [
  ['clean.snapshot.json', 'CLEAN'],
  ['findings.snapshot.json', 'FINDINGS'],
  ['dirty.snapshot.json', 'DIRTY_WORKTREE'],
  ['blocked-no-baseline.snapshot.json', 'BLOCKED'],
];
for (const [file, expected] of cases) {
  const snap = readSnap(file);
  const verdict = deriveVerdict(snap);
  ok(verdict === expected, `deriveVerdict(${file}) => ${verdict} (expected ${expected})`);
  if (verdict !== 'BLOCKED') {
    // BLOCKED snapshots have a null baseline; buildReport requires a baseline
    // sha, so we only assert report shape for reviewable snapshots.
    const report = runPrePushChecker({ probe: snap });
    const check = validateReport(report);
    ok(check.valid, `built report for ${file} is schema-valid${check.valid ? '' : ' — ' + check.errors.join('; ')}`);
    ok(report.verdict === expected, `built report verdict for ${file} == ${expected}`);
  }
}

// 6: READ-ONLY mechanical proof — scan the real checker module source.
const checkerSrc = readFileSync(join(HERE, 'prepush-checker.mjs'), 'utf8');
const FORBIDDEN_WRITE_IDENTS = [
  'writeFileSync',
  'appendFileSync',
  'writeFile(',
  'createWriteStream',
  'unlinkSync',
  'rmSync',
  'rmdirSync',
  'mkdirSync',
  'renameSync',
  'truncateSync',
  'writeSync',
];
for (const tok of FORBIDDEN_WRITE_IDENTS) {
  ok(!checkerSrc.includes(tok), `checker source has NO filesystem-write API: ${tok}`);
}
// git subcommand allowlist: every git([...]) call's first arg must be read-only.
const READONLY_GIT = new Set(['status', 'rev-parse', 'diff']);
const gitCalls = [...checkerSrc.matchAll(/git\(\[\s*'([a-z-]+)'/g)].map((m) => m[1]);
ok(gitCalls.length >= 3, `checker uses git read-only probe (${gitCalls.length} call site(s))`);
const badGit = gitCalls.filter((c) => !READONLY_GIT.has(c));
ok(badGit.length === 0, `all git subcommands are read-only (offenders: ${badGit.join(', ') || 'none'})`);

// 7: doctrine + non-self-certification proof on a built report
const cleanReport = runPrePushChecker({ probe: readSnap('clean.snapshot.json') });
ok(cleanReport.doctrine === DOCTRINE, 'built report carries the verbatim scaffold doctrine');
ok(/cannot self-certify/.test(cleanReport.doctrine), "doctrine states a checker 'cannot self-certify'");
ok(cleanReport.self_certification === false, 'self_certification is false');
ok(cleanReport.independent_verification_required === true, 'independent_verification_required is true');
ok(cleanReport.checker_self_approval === false, 'checker_self_approval is false (no self-approved restriction)');
ok(
  cleanReport.read_only_assertion.self_write_count === 0 &&
    cleanReport.read_only_assertion.self_commit_count === 0 &&
    cleanReport.read_only_assertion.self_push_count === 0,
  'read_only_assertion is all-zero (checker wrote/committed/pushed nothing)',
);
ok(cleanReport.no_edit_attestation.files_written_by_checker === 0, 'no_edit_attestation: files_written_by_checker == 0');

// 8: mutation-reject — a snapshot that would yield an invalid report makes the
// checker THROW rather than emit a malformed report.
let threw = false;
try {
  buildReport({ ...readSnap('clean.snapshot.json'), headSha: 'NOT-HEX' });
} catch {
  threw = true;
}
ok(threw, 'buildReport THROWS on a snapshot that would produce an invalid report (bad head SHA)');

console.log('');
if (failures === 0) {
  console.log('PREPUSH-CHECKER-SELFTEST: PASS');
  process.exit(0);
} else {
  console.log(`PREPUSH-CHECKER-SELFTEST: FAIL (${failures})`);
  process.exit(1);
}
