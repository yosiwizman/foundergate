// Lane G — P1 Assurance Core self-test (17 required proofs). LOCAL / DETERMINISTIC. No network.
import * as AC from '../../src/assurance_core/assurance-core.mjs';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };

const T = '2026-08-03T18:20:00-04:00';
const cfg = AC.makeConfigManifest({ model_id: 'claude-opus-4-8', provider_id: 'claude_code_simulated', mode: 'simulated', tools: ['read', 'write'], mcp_servers: ['fs'], captured_at: T });

// 1 config manifest validates
ok(AC.validateConfigManifest(cfg).valid, '1 config manifest validates');
// 2 runtime manifest validates
const snap = AC.makeImmutableContextSnapshot('context-A', { captured_at: T });
const rt = AC.makeRuntimeManifest({ config_manifest: cfg, context_snapshot_hash: snap.snapshot_hash, scan_completeness_state: 'COMPLETE', risk_budget_status: 'WITHIN_BUDGET', evidence_confidence: 'HIGH', captured_at: T });
ok(AC.validateRuntimeManifest(rt).valid, '2 runtime manifest validates');
// 3 context provenance validates
const prov = AC.makeContextProvenance({ captured_at: T, sources: [{ id: 'roadmap', kind: 'doc', content: 'roadmap-bytes' }, { id: 'harness', kind: 'evidence', content: 'harness-bytes' }] });
ok(AC.validateContextProvenance(prov).valid, '3 context provenance validates');
// 4 immutable snapshot hash changes when content changes
const snapB = AC.makeImmutableContextSnapshot('context-B', { captured_at: T });
ok(snap.snapshot_hash !== snapB.snapshot_hash && AC.verifyImmutableSnapshot(snap, 'context-A').valid && !AC.verifyImmutableSnapshot(snap, 'context-CHANGED').valid, '4 immutable snapshot hash changes on content change + detects tamper');
// 5 fingerprint is deterministic
const cfg2 = AC.makeConfigManifest({ model_id: 'claude-opus-4-8', provider_id: 'claude_code_simulated', mode: 'simulated', tools: ['write', 'read'], mcp_servers: ['fs'], captured_at: 'DIFFERENT-TIME' });
ok(cfg.config_fingerprint === cfg2.config_fingerprint, '5 fingerprint deterministic (order/time-independent over material)');
// 6 tool capability classification works
const tGood = AC.classifyTool({ id: 'read_file', capability: 'READ_ONLY_LOCAL' });
const tNet = AC.classifyTool({ id: 'http_get', capability: 'NETWORK', network: true });
ok(tGood.allowed === true && tNet.allowed === false, '6 tool capability classification (local allowed, network blocked)');
// 7 MCP capability classification works
const mGood = AC.classifyMcp({ id: 'fs', capability: 'WRITE_LOCAL' });
const mUnknown = AC.classifyMcp({ id: 'mystery' });
ok(mGood.allowed === true && mUnknown.capability === 'UNKNOWN' && mUnknown.allowed === false, '7 MCP capability classification (unknown → not allowed)');
// 8 provider-neutral interface labels simulated/real-disabled
const pn = AC.providerNeutralInterface('codex_openai_simulated');
ok(pn.real_disabled === true && pn.can_self_certify === false && /SIMULATED/.test(pn.label), '8 provider-neutral interface labels simulated/real-disabled');
// 9 action trace records actions
let trace = AC.newActionTrace('adoption_p1');
AC.recordAction(trace, { actor: 'builder', action: 'build_local_synthetic_app', target: 'assurance_core', at: T });
AC.recordAction(trace, { actor: 'builder', action: 'run_local_tests', at: T });
ok(AC.validateActionTrace(trace).valid && trace.actions.length === 2, '9 action trace records actions');
// 10 evidence confidence rejects missing evidence
const confMissing = AC.evidenceConfidence({ artifact_present: false, tests_run: false });
const confFull = AC.evidenceConfidence({ artifact_present: true, tests_run: true, independent_checker: true, context_snapshot: true, not_overclaimed: true });
ok(confMissing.accepted === false && confMissing.level === 'NONE' && confFull.level === 'HIGH', '10 evidence confidence rejects missing evidence');
// 11 risk budget fails closed when exceeded
const rbOk = AC.riskBudget({ cap_usd: 0, spent_usd: 0, network_calls: 0 });
const rbBad = AC.riskBudget({ cap_usd: 0, spent_usd: 0.01, network_calls: 1 });
ok(rbOk.proceed === true && rbBad.proceed === false && rbBad.status === 'EXCEEDED_FAIL_CLOSED', '11 risk budget fails closed when exceeded');
// 12 scan completeness distinguishes COMPLETE/PARTIAL/UNKNOWN
ok(AC.scanCompleteness({ scanned: 10, total: 10, errors: 0 }).state === 'COMPLETE' && AC.scanCompleteness({ scanned: 3, total: 10 }).state === 'PARTIAL' && AC.scanCompleteness({ scanned: 0, total: 0 }).state === 'UNKNOWN', '12 scan completeness COMPLETE/PARTIAL/UNKNOWN');
// 13 threat model version recorded
ok(AC.threatModelVersion().recorded === true && !!AC.threatModelVersion().version, '13 threat model version recorded');
// 14 function preservation record required
const fpMissing = AC.functionPreservation({ before: 'x' });
const fpOk = AC.functionPreservation({ before: 'behavior', after: 'behavior' });
ok(fpMissing.status === 'HOLD_MISSING' && fpOk.status === 'PRESERVED', '14 function preservation record required');
// 15 security patch acceptance requires separate validation
const patchNoVal = AC.patchSafetyValidation({ validated: false, patched_by: 'a' });
const patchOk = AC.patchSafetyValidation({ validated: true, validated_by: 'b', patched_by: 'a', function_preservation: { preserved: true } });
ok(patchNoVal.status === 'HOLD' && patchOk.status === 'SAFE_TO_ACCEPT', '15 security patch acceptance requires separate validation');
// also: accepted-without-validation is caught in the lifecycle
const lifeBad = AC.securityFindingLifecycle({ finding: { by: 'r' }, acceptance: { by: 'x' } });
ok(lifeBad.status === 'HOLD' && lifeBad.problems.includes('accepted without validation'), '15b lifecycle rejects accept-without-validation');
// 16 provider cannot self-certify
const q = AC.providerQualification({ provider_id: 'hermes_simulated', real_provider: false });
ok(q.can_self_certify === false && AC.providerNeutralInterface('x').can_self_certify === false, '16 provider cannot self-certify');
// 17 Gate 8 / real provider / private repo / protected actions remain blocked
const guard = AC.assertProtectedActionsBlocked(['gate_8_real_evaluator', 'private_repo_access']);
const guardClean = AC.assertProtectedActionsBlocked(['build_local_synthetic_app']);
ok(guard.status === 'REFUSED' && guard.violations.length === 2 && guardClean.status === 'OK' && AC.BLOCKED_GATES.includes('real_provider_activation'), '17 Gate8/real-provider/private-repo/protected actions blocked');

console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} assurance-core self-tests passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
