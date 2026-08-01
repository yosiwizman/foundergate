// Truthful-state model. A step is WIRED (real backing), LOCAL_SIMULATION (works
// locally via a clearly-labeled simulation), NOT_WIRED (placeholder), or UNKNOWN.
export const STEP_STATES = {
  select_target: 'WIRED', enter_objective: 'WIRED',
  start_check: 'LOCAL_SIMULATION',       // Start now runs a deterministic local simulation
  status: 'WIRED', evidence_freshness: 'WIRED',
  exact_commit: 'WIRED', tests: 'WIRED', checker: 'WIRED', gate_advisor: 'WIRED',
  limitations: 'WIRED', decision: 'WIRED',
  export: 'LOCAL_SIMULATION',            // Export produces a truthful local JSON (not a sealed package)
  sealed_package_export: 'NOT_WIRED',    // real ditto-sealed export stays NOT_WIRED
  stop_pause: 'WIRED',
};
export const ALLOWED = ['WIRED', 'LOCAL_SIMULATION', 'NOT_WIRED', 'UNKNOWN'];
export function validate(states) {
  for (const [k, v] of Object.entries(states)) {
    if (!ALLOWED.includes(v)) throw new Error(`step ${k} has invalid state ${v}`);
    if (v === 'GREEN' || v === 'PASS' || v === 'SHIP' || v === 'OPERATIONAL') throw new Error(`step ${k} claims invented green`);
  }
  return true;
}
