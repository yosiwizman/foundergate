// FounderGate — AI Assurance Records (LOCAL / DETERMINISTIC). Context provenance, AI config manifest,
// threat-model governance, evaluation governance, model qualification. Where no real dataset/provider exists,
// the record is PLANNED_WITH_SCHEMA — never INTEGRATED.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export function contextProvenanceRecord(i = {}) {
  const docs = (i.retrieved_documents || []).map((d) => ({ id: d.id, hash: sha256(String(d.content ?? d.id)) }));
  return { record_type: 'context_provenance', retrieved_documents: docs, tool_results: (i.tool_results || []).map((t) => ({ id: t.id, hash: sha256(String(t.result ?? t.id)) })), memory_sources: i.memory_sources || [], context_ordering: i.context_ordering || docs.map((d) => d.id), context_freshness_index: i.freshness_index ?? null, context_compression: i.compression || 'none', context_version: i.context_version || 'v1', provenance_hash: sha256(docs.map((d) => d.id + ':' + d.hash).join('|')) };
}

export function aiConfigurationManifest(i = {}) {
  const m = { record_type: 'ai_configuration_manifest', prompt_version: i.prompt_version || 'unspecified', tool_version: i.tool_version || 'unspecified', model_version: i.model_version || 'unspecified', provider_version: i.provider_version || 'simulated', guardrail_version: i.guardrail_version || 'unspecified', evaluator_version: i.evaluator_version || 'unspecified', memory_version: i.memory_version || 'unspecified', retrieval_version: i.retrieval_version || 'unspecified', real_provider_enabled: false };
  m.manifest_fingerprint = 'aicfg_' + sha256(m).slice(0, 24);
  return m;
}

export function threatModelGovernance(i = {}) {
  const approved = i.approved === true, stale = i.stale === true;
  return { record_type: 'threat_model_governance', threat_model_version: i.version || 'FG-TM-2026.08.03', approved, stale, evidence_ref: i.evidence_ref || null, status: stale ? 'STALE' : (approved ? 'APPROVED' : 'HOLD_UNAPPROVED') };
}

export function evaluationGovernance(i = {}) {
  const hasRealData = i.real_dataset === true;
  return { record_type: 'evaluation_governance', eval_version: i.eval_version || 'v1', expected_outputs: i.expected_outputs || 'schema_only', scoring_rules: i.scoring_rules || 'schema_only', adversarial_cases: i.adversarial_cases || 'schema_only', leakage_detection: i.leakage_detection || 'schema_only', eval_provenance: i.eval_provenance || 'local_synthetic', status: hasRealData ? 'INTEGRATED' : 'PLANNED_WITH_SCHEMA', real_dataset_present: hasRealData };
}

export function modelQualification(i = {}) {
  const real = i.real_provider === true;
  return { record_type: 'model_qualification', provider_comparison: i.provider_comparison || 'schema_only', drift_analysis: i.drift_analysis || 'schema_only', regression_detection: i.regression_detection || 'schema_only', cost_comparison: i.cost_comparison || 'schema_only', latency_comparison: i.latency_comparison || 'schema_only', rollback_qualification: i.rollback_qualification || 'schema_only', real_provider: false, status: real ? 'HOLD_REQUIRES_FOUNDER_GATE' : 'PLANNED_WITH_SCHEMA', can_self_certify: false };
}

export function aiAssuranceBundle(i = {}) {
  return {
    record_type: 'ai_assurance_bundle',
    context_provenance: contextProvenanceRecord(i.context || {}),
    ai_configuration_manifest: aiConfigurationManifest(i.config || {}),
    threat_model_governance: threatModelGovernance(i.threat || {}),
    evaluation_governance: evaluationGovernance(i.eval || {}),
    model_qualification: modelQualification(i.model || {}),
  };
}
