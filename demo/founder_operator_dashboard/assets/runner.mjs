// Deterministic LOCAL_SIMULATION runner for the founder dashboard.
// Pure, offline, no provider, no network. Produces a truthful run object.
// It is a SIMULATION of a governed check — clearly labeled LOCAL_SIMULATION —
// not a provider-backed run. It never emits "SHIP".
export function runLocalSimulation(objective, target = 'self-owned demo target') {
  const obj = String(objective || '').trim();
  if (obj === '') {
    return { mode: 'LOCAL_SIMULATION', status: 'INSUFFICIENT', reason: 'no objective entered',
      target, commit: null, tests: null, checker: null, advisor: null,
      decision: 'INSUFFICIENT', limitations: ['no objective provided'], nextSafeAction: 'enter a plain-English objective' };
  }
  // Deterministic sample evidence (fixed values — this is a simulation, not a live run).
  return {
    mode: 'LOCAL_SIMULATION',
    status: 'COMPLETE_SIMULATED',
    target,
    objective: obj,
    commit: '547de7344147', // sample; a real run would bind the actual SHA
    tests: { demo: '30/30', full: '114/114', failures: 0 },
    checker: 'CLEAN (simulated)',
    advisor: 'PASS_WITH_LIMITS (simulated)',
    decision: 'INTERNAL_DEMO_ONLY', // never SHIP
    limitations: ['LOCAL_SIMULATION — not a provider-backed run', 'not production/secure/compliant', 'sample evidence values'],
    nextSafeAction: 'export the local run JSON, or run a real deterministic check via the CLI',
  };
}
export function assertNeverShips(run) {
  if (run && (run.decision === 'SHIP' || run.status === 'SHIP')) throw new Error('simulation emitted forbidden SHIP');
  return true;
}
export function toExportJSON(run) {
  return JSON.stringify({ _note: 'LOCAL_EXPORT — a truthful local run summary, NOT a sealed evidence package', run }, null, 2);
}
