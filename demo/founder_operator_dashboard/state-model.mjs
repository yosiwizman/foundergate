// Truthful-state model. WIRED (real backing) · REAL_LOCAL (real CLI-backed, browser loads result)
// · LOCAL_SIMULATION (labeled fallback) · NOT_WIRED · UNKNOWN.
export const STEP_STATES = {
  select_target: 'WIRED', enter_objective: 'WIRED',
  start_check: 'REAL_LOCAL',            // browser loads the REAL_LOCAL_RUN produced by the CLI runner (sim fallback)
  status: 'WIRED', evidence_freshness: 'WIRED',
  exact_commit: 'REAL_LOCAL', tests: 'REAL_LOCAL', checker: 'WIRED', gate_advisor: 'WIRED',
  limitations: 'WIRED', decision: 'WIRED',
  export_json: 'WIRED',
  sealed_package_export: 'REAL_LOCAL',  // real sealed ZIP via CLI export tool
  stop_pause: 'WIRED',
};
export const ALLOWED = ['WIRED', 'REAL_LOCAL', 'LOCAL_SIMULATION', 'NOT_WIRED', 'UNKNOWN'];
export function validate(states) {
  for (const [k, v] of Object.entries(states)) {
    if (!ALLOWED.includes(v)) throw new Error(`step ${k} has invalid state ${v}`);
    if (['GREEN','PASS','SHIP','OPERATIONAL'].includes(v)) throw new Error(`step ${k} claims invented green`);
  }
  return true;
}
