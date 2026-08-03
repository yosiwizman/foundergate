// FounderGate — Continuous Boundary Monitoring (LOCAL / SYNTHETIC record system, NOT a live production monitor).
// Compares a baseline snapshot to a current snapshot per dimension and emits a drift record + recommended action.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export const DIMENSIONS = Object.freeze(['network', 'process', 'tool', 'permission', 'mount', 'secret', 'environment', 'runtime_policy']);
export const ACTION = Object.freeze(['CONTINUE', 'PAUSE', 'STOP', 'QUARANTINE']);

// severity → action. secret/network drift is most severe (QUARANTINE); unknown → PAUSE; benign drift → STOP for review.
function actionFor(dim, drift, known) {
  if (!known) return 'PAUSE';
  if (!drift) return 'CONTINUE';
  if (dim === 'secret' || dim === 'network') return 'QUARANTINE';
  return 'STOP';
}

export function monitorDimension(dim, baseline, current) {
  const known = baseline !== undefined && current !== undefined && baseline !== null && current !== null;
  const drift = known && sha256(String(baseline)) !== sha256(String(current));
  const action = actionFor(dim, drift, known);
  return { record_type: 'boundary_drift', dimension: dim, baseline_hash: known ? sha256(String(baseline)).slice(0, 16) : null, current_hash: known ? sha256(String(current)).slice(0, 16) : null, known, drift: !!drift, status: !known ? 'UNKNOWN' : (drift ? 'DRIFT' : 'STABLE'), action };
}

export function monitorBoundaries(input = {}) {
  const base = input.baseline || {}, cur = input.current || {};
  const records = DIMENSIONS.map((d) => monitorDimension(d, base[d], cur[d]));
  const worst = records.reduce((w, r) => {
    const rank = { CONTINUE: 0, PAUSE: 1, STOP: 2, QUARANTINE: 3 };
    return rank[r.action] > rank[w] ? r.action : w;
  }, 'CONTINUE');
  return { record_type: 'boundary_monitoring', records, drifts: records.filter((r) => r.drift).length, unknown: records.filter((r) => !r.known).length, overall_action: worst, status: worst === 'CONTINUE' ? 'STABLE' : worst };
}
