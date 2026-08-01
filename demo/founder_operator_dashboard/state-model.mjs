// Truthful-state model for the founder dashboard. A step is only 'WIRED' if a real
// local backing exists; otherwise NOT_WIRED or UNKNOWN. No step may claim green without backing.
export const STEP_STATES = {
  select_target: 'WIRED',
  enter_objective: 'WIRED',
  start_check: 'NOT_WIRED',      // real run is CLI-backed today
  status: 'WIRED',
  evidence_freshness: 'UNKNOWN', // until a run writes it
  exact_commit: 'WIRED',
  tests: 'WIRED',
  checker: 'WIRED',
  gate_advisor: 'WIRED',
  limitations: 'WIRED',
  decision: 'WIRED',
  export: 'NOT_WIRED',           // real export is packaging-backed
  stop_pause: 'WIRED',
};
export const ALLOWED = ['WIRED', 'NOT_WIRED', 'UNKNOWN'];
export function validate(states) {
  for (const [k, v] of Object.entries(states)) {
    if (!ALLOWED.includes(v)) throw new Error(`step ${k} has invalid state ${v}`);
    if (v === 'GREEN' || v === 'PASS' || v === 'SHIP') throw new Error(`step ${k} claims invented green`);
  }
  return true;
}
