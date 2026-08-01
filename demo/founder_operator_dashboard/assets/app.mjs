import { runLocalSimulation, assertNeverShips, toExportJSON } from './runner.mjs';
let lastRun = null;
function $(id){ return document.getElementById(id); }
function render(run){
  assertNeverShips(run);
  $('run-status').textContent = run.status + ' · mode=' + run.mode;
  $('evidence-freshness').textContent = run.commit ? 'FRESH (this simulated run)' : 'UNKNOWN';
  $('commit-val').textContent = run.commit || '—';
  $('tests-val').textContent = run.tests ? (run.tests.demo + ' demo · ' + run.tests.full + ' full · ' + run.tests.failures + ' failures') : '—';
  $('checker-val').textContent = run.checker || '—';
  $('advisor-val').textContent = run.advisor || '—';
  $('decision-val').textContent = run.decision + ' — never SHIP';
  $('limitations-val').textContent = run.limitations.join('; ');
  $('next-action-val').textContent = run.nextSafeAction;
  $('export-btn').disabled = !(run && run.commit);
}
window.addEventListener('DOMContentLoaded', () => {
  $('start-btn').addEventListener('click', () => {
    const objective = $('objective').value;
    lastRun = runLocalSimulation(objective, $('target').value);
    render(lastRun);
    $('start-status').textContent = 'Started (LOCAL_SIMULATION) — deterministic, no provider, no network.';
  });
  $('export-btn').addEventListener('click', () => {
    if (!lastRun) return;
    const json = toExportJSON(lastRun);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'local_run_export.json'; a.click();
    URL.revokeObjectURL(url);
    $('export-status').textContent = 'LOCAL_EXPORT ready — downloaded local_run_export.json (a truthful local summary, NOT a sealed package).';
  });
  $('stop-btn').addEventListener('click', () => { $('start-status').textContent = 'Stopped/paused safely (no live process to interrupt).'; });
});
