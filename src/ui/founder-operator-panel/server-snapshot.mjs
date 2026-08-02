// Adapter: loopback run-server JSON -> founder-operator-panel snapshot (honest, no invention).
// Missing/unknown server signals map to omitted snapshot fields, which the panel renders UNKNOWN.
export function snapshotFromServer({ health, start, exportResult } = {}) {
  const snap = {};
  // status line derives from the run lifecycle, never invented
  const st = start && start.status;
  if (st === 'complete') {
    const run = start.run || {};
    // tests: only if the runner reported a numeric pass/total
    if (run.tests && Number.isInteger(run.tests.passed) && Number.isInteger(run.tests.total)) {
      snap.tests = { passed: run.tests.passed, total: run.tests.total };
    }
    // evidence freshness: fresh only when a completed run + a good export exist
    if (exportResult && exportResult.status === 'complete' && exportResult.unzip_ok === true) snap.evidenceFreshness = 'fresh';
    // decision must never be SHIP; expose acceptedBeta + a short build label if provided
    if (run.decision && run.decision !== 'SHIP') snap.decisionOk = true;
    if (run.buildLabel) snap.buildLabel = run.buildLabel;
    if (exportResult && exportResult.status === 'complete') snap.evidenceZip = { available: true, label: 'Download evidence ZIP' };
  } else if (st === 'INSUFFICIENT' || st === 'REFUSED' || st === 'UNKNOWN' || st === 'ERROR' || st === 'UNAUTHORIZED') {
    snap.blockedReason = serverReason(st, start && start.reason);
  }
  if (health && health.status !== 'ok') snap.blockedReason = 'Local run-server is not healthy.';
  return snap;
}
function serverReason(status, reason) {
  const map = {
    INSUFFICIENT: 'Not enough information to run — nothing is being guessed.',
    REFUSED: 'The requested action was refused by the safety gate.',
    UNKNOWN: 'A required input is missing — shown as UNKNOWN, not guessed.',
    ERROR: 'The run did not complete.',
    UNAUTHORIZED: 'The local run-server rejected an unauthorized request.',
  };
  return (map[status] || 'Not ready.') + (reason ? ` (${reason})` : '');
}
