// FounderGate — Expected vs Observed Runtime Comparison (LOCAL / SYNTHETIC / DETERMINISTIC).
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

const setEq = (a = [], b = []) => { const A = new Set(a), B = new Set(b); return A.size === B.size && [...A].every((x) => B.has(x)); };
const subset = (a = [], b = []) => { const B = new Set(b); return a.every((x) => B.has(x)); };

// each dimension → MATCH / DRIFT / VIOLATION / UNKNOWN
function cmpSet(expected, observed, extraIsViolation) {
  if (observed === undefined || observed === null) return 'UNKNOWN';
  if (setEq(expected, observed)) return 'MATCH';
  // observed has something NOT expected → VIOLATION (e.g. an unexpected destination/tool/process); else DRIFT
  const unexpected = (observed || []).filter((x) => !(expected || []).includes(x));
  if (unexpected.length && extraIsViolation) return 'VIOLATION';
  return 'DRIFT';
}

export function compareRuntime(expected = {}, observed = {}) {
  const dims = {
    tools: cmpSet(expected.tools, observed.tools, true),
    processes: cmpSet(expected.processes, observed.processes, true),
    destinations: cmpSet(expected.destinations, observed.destinations, true),
    filesystem_writes: cmpSet(expected.filesystem_writes, observed.filesystem_writes, true),
    duration: observed.duration == null ? 'UNKNOWN' : (observed.duration <= (expected.duration ?? Infinity) ? 'MATCH' : 'VIOLATION'),
    evidence_stream: observed.evidence_stream == null ? 'UNKNOWN' : (observed.evidence_stream === expected.evidence_stream ? 'MATCH' : 'DRIFT'),
    stop_state: observed.stop_state == null ? 'UNKNOWN' : (observed.stop_state === (expected.stop_state ?? 'not_required') ? 'MATCH' : 'DRIFT'),
  };
  const vals = Object.values(dims);
  const overall = vals.includes('VIOLATION') ? 'VIOLATION' : (vals.includes('UNKNOWN') ? 'UNKNOWN' : (vals.includes('DRIFT') ? 'DRIFT' : 'MATCH'));
  return { record_type: 'runtime_reality', dimensions: dims, overall, comparison_hash: sha256(dims) };
}
