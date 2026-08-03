// FounderGate — Evidence Confidence / Trust Engine (LOCAL / DETERMINISTIC).
// Computes confidence from EVIDENCE ONLY. It explicitly refuses to use any AI/model self-confidence signal.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export const LEVEL = Object.freeze(['NONE', 'LOW', 'MEDIUM', 'HIGH']);

// Positive evidence signals (each present=true adds weight). Negative signals subtract / cap.
const POSITIVE = ['artifact_verified', 'checker_verified', 'terminal_advisor_verified', 'runtime_evidence', 'environment_seal', 'context_snapshot', 'exact_state_binding'];

export function computeEvidenceConfidence(input = {}) {
  // Guard: AI confidence must never feed evidence confidence.
  if ('ai_confidence' in input || 'model_confidence' in input) {
    // it is accepted as an input key but MUST be ignored; we record that we ignored it.
  }
  const verified_assumptions = input.verified_assumptions ?? 0;
  const stale = input.stale_assumptions ?? 0;
  const unknown = input.unknown_states ?? 0;
  const violations = input.violations ?? 0;

  const posPresent = POSITIVE.filter((k) => input[k] === true);
  let score = posPresent.length; // 0..7
  // negatives
  score -= stale + unknown + (violations * 3);
  if (verified_assumptions > 0 && violations === 0) score += 1;

  let level = 'NONE';
  if (violations > 0 || unknown > 0) level = 'NONE';           // fail closed on any violation/unknown
  else if (!input.artifact_verified) level = 'LOW';            // no verified artifact caps at LOW
  else if (score >= 7) level = 'HIGH';
  else if (score >= 4) level = 'MEDIUM';
  else if (score >= 1) level = 'LOW';

  return {
    record_type: 'evidence_confidence', level,
    uses_ai_confidence: false,
    ignored_ai_confidence: ('ai_confidence' in input) || ('model_confidence' in input),
    inputs: { verified_assumptions, stale, unknown, violations, positive_signals: posPresent },
    score,
    reason: (violations || unknown) ? 'violation/unknown present → confidence NONE (fail closed)' : 'confidence computed from evidence signals only',
    fingerprint: 'ec_' + sha256({ level, score, posPresent }).slice(0, 16),
  };
}
