// Truthful-state model. SERVER_LOCAL = real run via the local loopback run-server.
export const STEP_STATES = {
  select_target: 'WIRED', enter_objective: 'WIRED',
  start_check: 'SERVER_LOCAL',           // browser Start -> local run-server -> real runner
  status: 'WIRED', evidence_freshness: 'WIRED',
  exact_commit: 'SERVER_LOCAL', tests: 'SERVER_LOCAL', checker: 'WIRED', gate_advisor: 'WIRED',
  limitations: 'WIRED', decision: 'WIRED',
  export: 'SERVER_LOCAL',                // browser Export -> local run-server -> real sealed ZIP
  reviewer_drawer: 'SERVER_LOCAL',
  stop_pause: 'WIRED',
};
export const ALLOWED = ['WIRED', 'SERVER_LOCAL', 'REAL_LOCAL', 'LOCAL_SIMULATION', 'NOT_WIRED', 'UNKNOWN'];
export function validate(states) {
  for (const [k,v] of Object.entries(states)) {
    if (!ALLOWED.includes(v)) throw new Error(`step ${k} invalid state ${v}`);
    if (['GREEN','PASS','SHIP','OPERATIONAL'].includes(v)) throw new Error(`step ${k} claims invented green`);
  }
  return true;
}
