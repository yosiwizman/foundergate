// Assumption Verification Engine self-test — proofs 22–23 (+ package). LOCAL / DETERMINISTIC.
import * as A from '../../src/assumption_verification/assumption-engine.mjs';
let p = 0, f = 0; const ok = (c, m) => { if (c) { p++; console.log('OK   ' + m); } else { f++; console.log('BAD  ' + m); } };

// 22 status VERIFIED / UNKNOWN / STALE / VIOLATED works
ok(A.verifyAssumption({ id: 'X', declared_assumption: 'x', expected_state: 'ok', observed_state: 'ok' }).status === 'VERIFIED', '22a VERIFIED when observed==expected');
ok(A.verifyAssumption({ id: 'X', expected_state: 'ok', observed_state: null }).status === 'UNKNOWN', '22b UNKNOWN when no observation');
ok(A.verifyAssumption({ id: 'X', expected_state: 'ok', observed_state: 'bad' }).status === 'VIOLATED', '22c VIOLATED when observed!=expected');
// 23 expiration works (STALE)
ok(A.verifyAssumption({ id: 'X', expected_state: 'ok', observed_state: 'ok', expiration_index: 5, now_index: 9 }).status === 'STALE', '23 assumption expiration → STALE');
// violation action mapping
ok(A.verifyAssumption({ id: 'X', expected_state: 'ok', observed_state: 'bad', violation_action: 'QUARANTINE' }).violation_action === 'QUARANTINE', 'violation_action honored');
// package: 10 sample assumptions all verified → summary line
const pkg = A.packageAssumptions(A.sampleAssumptions());
ok(pkg.declared === 10 && pkg.violations === 0 && pkg.verified === 10 && pkg.all_clear === true, `package: ${pkg.summary}`);
ok(/assumptions declared;.*verified;.*violations; evidence package generated\./.test(pkg.summary) && pkg.package_action === 'CONTINUE', 'package summary + CONTINUE action');
// package with a forced violation → QUARANTINE
const pkg2 = A.packageAssumptions(A.sampleAssumptions({ A07: { observed_state: 'ALLOWED' } }));
ok(pkg2.violations === 1 && pkg2.package_action === 'QUARANTINE' && pkg2.all_clear === false, 'forced violation → QUARANTINE, not all_clear');
// monitoring items surface as MONITORING_REQUIRED
const monPkg = A.verifyAssumptions([{ id: 'M', declared_assumption: 'watch', expected_state: 'ok', observed_state: 'ok', continuous_monitoring_required: true }]);
ok(monPkg.monitoring_required === 1, 'continuous monitoring → MONITORING_REQUIRED');

console.log(f === 0 ? `\nALL GREEN: ${p}/${p} assumption-engine proofs passed.` : `\nRED: ${f}/${p + f} failed.`);
process.exit(f === 0 ? 0 : 1);
