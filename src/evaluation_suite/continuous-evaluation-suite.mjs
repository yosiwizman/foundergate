// LANE W4 — Continuous Evaluation Suite (LOCAL / DETERMINISTIC). Provider comparison stays schema/planned (no real provider).
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export function benchmark(i={}){const versioned=i.version!=null;return {record_type:'benchmark',version:i.version||null,status:versioned?'OK':'HOLD_UNVERSIONED_BENCHMARK'};}
export function regressionDetection(i={}){const worse=(i.current_score!=null&&i.baseline_score!=null&&i.current_score<i.baseline_score);const ignored=worse&&i.acknowledged!==true;return {record_type:'regression_detection',regressed:worse,status:ignored?'HOLD_REGRESSION_IGNORED':'OK'};}
export function goldenSet(i={}){const leaked=i.in_training===true;return {record_type:'golden_test_set',status:leaked?'HOLD_LEAKED_GOLDEN_SET':'OK',items:(i.items||[]).length};}
export function adversarialLibrary(i={}){return {record_type:'adversarial_test_library',cases:(i.cases||[]).length,status:'OK'};}
export function hallucination(i={}){const scored=i.score!=null;return {record_type:'hallucination_evaluation',status:scored?'OK':'HOLD_HALLUCINATION_UNSCORED'};}
export function retrievalQuality(i={}){return {record_type:'retrieval_quality_evaluation',status:i.score!=null?'OK':'HOLD_UNSCORED'};}
export function toolCallEval(i={}){return {record_type:'tool_call_evaluation',status:i.evaluated?'OK':'HOLD'};}
export function planningEval(i={}){return {record_type:'planning_evaluation',status:i.evaluated?'OK':'HOLD'};}
export function reflectionEval(i={}){return {record_type:'reflection_evaluation',status:i.evaluated?'OK':'HOLD'};}
export function selfCorrectionEval(i={}){return {record_type:'self_correction_evaluation',status:i.evaluated?'OK':'HOLD'};}
export function costAccuracy(i={}){return {record_type:'cost_vs_accuracy_evaluation',status:'SCHEMA'};}
export function latencyAccuracy(i={}){return {record_type:'latency_vs_accuracy_evaluation',status:'SCHEMA'};}
export function providerComparison(i={}){const real=i.real_provider_evidence===true;return {record_type:'multi_provider_comparison',real_provider_evidence:false,status:real?'INTEGRATED':'PLANNED_WITH_SCHEMA'};}
export function driftDetection(i={}){const known=i.drift_state!=null;return {record_type:'ai_drift_detection',status:!known?'HOLD_DRIFT_UNKNOWN':(i.drift_state==='drift'?'HOLD_DRIFT_DETECTED':'STABLE')};}
export function suiteCoverage(){return {total:14,implemented:12,schema_only:2};}
