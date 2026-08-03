// Lane H — P1 falsification / hostile tests. Every hostile input MUST fail closed (HOLD/UNKNOWN/REFUSED). No PASS.
import * as AC from '../../src/assurance_core/assurance-core.mjs';
const T = '2026-08-03T18:20:00-04:00';
const cases = [];
const add = (name, observed) => cases.push({ name, observed });

// missing runtime manifest
add('missing runtime manifest', AC.validateRuntimeManifest(null).status);
// stale context snapshot (content changed since snapshot)
const snap = AC.makeImmutableContextSnapshot('orig', { captured_at: T });
add('stale context snapshot', AC.verifyImmutableSnapshot(snap, 'orig-MUTATED').status);
// changed config fingerprint (tamper)
const cfg = AC.makeConfigManifest({ model_id: 'm', provider_id: 'p', captured_at: T });
const tampered = { ...cfg, model_id: 'evil' };
add('changed config fingerprint', AC.validateConfigManifest(tampered).status);
// unknown scan completeness
add('unknown scan completeness', AC.scanCompleteness({ scanned: 0, total: 0 }).state);
// provider self-certification attempt
add('provider self-certification attempt', AC.providerQualification({ provider_id: 'hostile', real_provider: true }).status);
// missing function preservation record
add('missing function preservation record', AC.functionPreservation({ before: 'only-before' }).status);
// security patch accepted without validation
add('security patch accepted without validation', AC.securityFindingLifecycle({ finding: { by: 'r' }, patch: { by: 'p' }, acceptance: { by: 'p' } }).status);
// risk budget exceeded
add('risk budget exceeded', AC.riskBudget({ cap_usd: 0, spent_usd: 5, network_calls: 3 }).status);
// tool capability unknown
add('tool capability unknown', AC.classifyTool({ id: 'mystery_tool' }).allowed === false ? 'HOLD' : 'PASS');
// MCP capability unknown
add('MCP capability unknown', AC.classifyMcp({ id: 'mystery_mcp' }).allowed === false ? 'HOLD' : 'PASS');
// bonus: real provider enabled in config
add('real provider enabled in config', AC.validateConfigManifest({ ...cfg, real_provider_enabled: true }).status);
// bonus: forbidden protected action requested
add('protected action requested (gate 8)', AC.assertProtectedActionsBlocked(['gate_8_real_evaluator']).status);

const rec = AC.mutationFalsificationRecord(cases);
for (const c of rec.cases) console.log((c.passed_closed ? 'OK   ' : 'BAD  ') + `${c.name} → ${c.observed}`);
console.log(rec.all_fail_closed ? `\nALL FAIL-CLOSED: ${rec.cases.length}/${rec.cases.length} hostile cases held/unknown/refused; 0 PASS.` : `\nRED: a hostile case did NOT fail closed.`);
process.exit(rec.all_fail_closed ? 0 : 1);
