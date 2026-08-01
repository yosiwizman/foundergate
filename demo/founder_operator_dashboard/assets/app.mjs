import { runLocalSimulation, assertNeverShips, toExportJSON } from './runner.mjs';
let lastRun = null;
const $ = (id) => document.getElementById(id);
function render(run, sourceLabel){
  assertNeverShips(run);
  $('run-status').textContent = (run.status || run.mode) + ' · mode=' + run.mode + ' · source=' + sourceLabel;
  $('evidence-freshness').textContent = run.commit ? 'FRESH ('+sourceLabel+')' : 'UNKNOWN';
  $('commit-val').textContent = run.commit_short || run.commit || '—';
  const t = run.tests;
  $('tests-val').textContent = t ? ((t.result || (t.demo||'')) + (t.failures!=null?(' · '+t.failures+' failures'):'')) : '—';
  $('checker-val').textContent = run.checker || '—';
  $('advisor-val').textContent = run.advisor || '—';
  $('decision-val').textContent = run.decision + ' — never SHIP';
  $('limitations-val').textContent = (run.limitations||[]).join('; ');
  $('next-action-val').textContent = run.nextSafeAction || '—';
  $('export-btn').disabled = !(run && run.commit);
}
async function loadRealRun(){
  try {
    const res = await fetch('./runs/last-run.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('no real run file');
    const run = await res.json();
    if (run.mode !== 'REAL_LOCAL_RUN') throw new Error('not a real run');
    lastRun = run; render(run, 'REAL_LOCAL_RUN (CLI)');
    $('start-status').textContent = 'Loaded REAL_LOCAL_RUN produced by the local CLI runner (real commit + real tests).';
    return true;
  } catch { return false; }
}
window.addEventListener('DOMContentLoaded', () => {
  $('start-btn').addEventListener('click', async () => {
    // prefer a real CLI-produced run; fall back to a clearly-labeled simulation
    const gotReal = await loadRealRun();
    if (!gotReal) {
      lastRun = runLocalSimulation($('objective').value, $('target').value);
      render(lastRun, 'LOCAL_SIMULATION (no real run file present)');
      $('start-status').textContent = 'Started (LOCAL_SIMULATION fallback) — run the local CLI runner to get a REAL run.';
    }
  });
  $('export-btn').addEventListener('click', () => {
    if (!lastRun) return;
    const json = toExportJSON(lastRun);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'local_run_export.json'; a.click();
    URL.revokeObjectURL(url);
    $('export-status').textContent = 'LOCAL_EXPORT JSON downloaded. A REAL sealed ZIP is produced by the CLI export tool (src/evidence_viewer/export-package.mjs).';
  });
  $('stop-btn').addEventListener('click', () => { $('start-status').textContent = 'Stopped/paused safely (no live process to interrupt).'; });
});
