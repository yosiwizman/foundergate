// Evidence Confidence self-test — proofs 28–30. LOCAL / DETERMINISTIC.
import { computeEvidenceConfidence } from '../../src/assurance_core/evidence-confidence.mjs';
import { aiConfigurationManifest, modelQualification, evaluationGovernance } from '../../src/assurance_core/ai-assurance-records.mjs';
let p=0,f=0; const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 28 confidence drops with unknowns/stale/violations
const hi = computeEvidenceConfidence({ artifact_verified:true, checker_verified:true, terminal_advisor_verified:true, runtime_evidence:true, environment_seal:true, context_snapshot:true, exact_state_binding:true, verified_assumptions:23 });
const lo = computeEvidenceConfidence({ artifact_verified:true, violations:1 });
const unk = computeEvidenceConfidence({ artifact_verified:true, unknown_states:2 });
ok(hi.level === 'HIGH' && lo.level === 'NONE' && unk.level === 'NONE', '28 confidence drops to NONE with violations/unknowns; HIGH with full evidence');
// 29 AI confidence not used as evidence confidence
const withAi = computeEvidenceConfidence({ artifact_verified:true, checker_verified:true, ai_confidence: 0.99, model_confidence: 1.0 });
const withoutAi = computeEvidenceConfidence({ artifact_verified:true, checker_verified:true });
ok(withAi.uses_ai_confidence === false && withAi.ignored_ai_confidence === true && withAi.level === withoutAi.level, '29 AI/model confidence is ignored (not used as evidence confidence)');
// 30 real provider / private repo / Gate 8 remain blocked (via AI assurance records)
ok(aiConfigurationManifest({}).real_provider_enabled === false && modelQualification({ real_provider:true }).status === 'HOLD_REQUIRES_FOUNDER_GATE' && modelQualification({}).can_self_certify === false && evaluationGovernance({}).status === 'PLANNED_WITH_SCHEMA', '30 real provider blocked; model cannot self-certify; eval = planned schema');
console.log(f===0?`\nALL GREEN: ${p}/${p} evidence-confidence proofs passed.`:`\nRED: ${f}/${p+f} failed.`);
process.exit(f===0?0:1);
