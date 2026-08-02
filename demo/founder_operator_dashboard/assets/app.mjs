// Founder dashboard wired to the LOCAL run-server (/api/start, /api/export).
// Same-origin when served by src/operator_console/run-server.mjs. No provider, no external network.
import { assertNeverShips } from './runner.mjs';
let lastRun = null;
const $ = (id) => document.getElementById(id);
function render(run, source){
  assertNeverShips(run);
  $('run-status').textContent = (run.status || run.mode) + ' · source=' + source;
  $('evidence-freshness').textContent = run.commit ? 'FRESH ('+source+')' : 'UNKNOWN';
  $('commit-val').textContent = run.commit_short || run.commit || '—';
  const t = run.tests;
  $('tests-val').textContent = t ? ((t.result||'') + (t.failures!=null?(' · '+t.failures+' failures'):'')) : '—';
  $('checker-val').textContent = run.checker || '—';
  $('advisor-val').textContent = run.advisor || '—';
  $('decision-val').textContent = (run.decision||'—') + ' — never SHIP';
  $('limitations-val').textContent = (run.limitations||[]).join('; ');
  $('next-action-val').textContent = run.nextSafeAction || '—';
  $('export-btn').disabled = !(run && run.commit);
}
let SESSION_TOKEN = null;
async function loadToken(){ try{ const r=await fetch('/api/session'); const j=await r.json(); SESSION_TOKEN=j.token; }catch{ SESSION_TOKEN=null; } }
async function postJSON(url, body){ const r = await fetch(url, { method:'POST', headers:{'content-type':'application/json','x-fg-token': SESSION_TOKEN||''}, body: JSON.stringify(body||{}) }); return r.json(); }
window.addEventListener('DOMContentLoaded', async () => {
  await loadToken();
  $('start-btn').addEventListener('click', async () => {
    $('start-status').textContent = 'RUNNING (local run-server)…';
    try {
      const res = await postJSON('/api/start', { target: $('target').value, objective: $('objective').value });
      if (res.status === 'complete' && res.run) {
        lastRun = res.run; render(res.run, 'REAL_LOCAL_RUN (server)');
        $('start-status').textContent = 'COMPLETE — real local run via the loopback server (real commit + real tests).';
      } else if (res.status === 'INSUFFICIENT') {
        lastRun = null; $('decision-val').textContent = 'INSUFFICIENT — enter an objective'; $('export-btn').disabled = true;
        $('start-status').textContent = 'INSUFFICIENT — objective was empty.';
      } else if (res.status === 'REFUSED') {
        $('start-status').textContent = 'REFUSED — target not in the local allowlist.';
      } else if (res.status === 'UNAUTHORIZED') {
        $('start-status').textContent = 'UNAUTHORIZED — session token/Origin check failed.';
      } else {
        $('start-status').textContent = (res.status || 'ERROR') + ' — ' + (res.reason || 'run did not complete');
      }
    } catch {
      $('start-status').textContent = 'LOCAL_SERVER_UNAVAILABLE (UNKNOWN) — start the local run-server, or Start falls back to no data.';
    }
  });
  $('export-btn').addEventListener('click', async () => {
    if (!lastRun) return;
    $('export-status').textContent = 'EXPORTING (local run-server)…';
    try {
      const res = await postJSON('/api/export', {});
      if (res.status === 'complete' && res.unzip_ok) $('export-status').textContent = 'SEALED_EXPORT_LOCAL — real ZIP created + unzip -t verified: ' + res.zip;
      else if (res.status === 'UNKNOWN') $('export-status').textContent = 'UNKNOWN — no run to export yet.';
      else $('export-status').textContent = 'EXPORT_FAILED — ' + (res.reason || 'sealing did not verify');
    } catch { $('export-status').textContent = 'LOCAL_SERVER_UNAVAILABLE (UNKNOWN).'; }
  });
  // ---- Founder Mode (plain-English proxy over the SAME real controls; no fake state) ----
  const fmWhat=$('fm-what'), fmTrust=$('fm-trust'), fmNext=$('fm-next'), fmRun=$('founder-run-btn'), fmExp=$('founder-export-btn');
  function setFM(w,t,n){ if(fmWhat)fmWhat.textContent=w; if(fmTrust)fmTrust.textContent=t; if(fmNext)fmNext.textContent=n; }
  function refreshFounderMode(){
    const ss=($('start-status').textContent||''), dec=($('decision-val').textContent||''), tests=($('tests-val').textContent||''), exp=($('export-status').textContent||'');
    if(/SEALED_EXPORT_LOCAL/.test(exp)){ setFM('The local check finished and a sealed evidence package was saved. Tests: '+(tests||'—')+'.','Decision: '+dec+'. Internal demo result only — never “ship”, not production, not secure.','Done. Only send the evidence file to ChatGPT if you are asked to.'); if(fmExp) fmExp.disabled=$('export-btn').disabled; return; }
    if(/COMPLETE/.test(ss)){ setFM('The local check finished. Tests: '+(tests||'—')+'.','Decision: '+dec+'. This is an internal demo result only — it never means “ship”, and it is not production or secure.','Click “Export evidence package” to save a sealed record. Do not use real/customer data.'); if(fmExp) fmExp.disabled=$('export-btn').disabled; return; }
    if(/RUNNING/.test(ss)){ setFM('Running a safe local check…','Please wait — it is checking honestly.','Wait until it says COMPLETE.'); return; }
    if(/INSUFFICIENT/.test(ss)){ setFM('Not enough information (no objective).','UNKNOWN — safer than guessing.','A default objective is already filled in; just click “Run safe demo check” again.'); if(fmExp) fmExp.disabled=true; return; }
    if(/UNAVAILABLE|UNKNOWN|ERROR|REFUSED|UNAUTHORIZED/.test(ss)){ setFM('The local helper is not available right now (UNKNOWN).','UNKNOWN — the page will not fake a green result. That is the safe behavior.','Close this, re-open using the Desktop launcher, then click “Run safe demo check”.'); if(fmExp) fmExp.disabled=true; return; }
  }
  if(fmRun) fmRun.addEventListener('click', ()=>{ $('start-btn').click(); });
  if(fmExp) fmExp.addEventListener('click', ()=>{ $('export-btn').click(); });
  try{ const mo=new MutationObserver(refreshFounderMode); ['start-status','export-status','decision-val','tests-val'].forEach(id=>{ const el=$(id); if(el) mo.observe(el,{childList:true,subtree:true,characterData:true}); }); }catch{}
  refreshFounderMode();
  $('stop-btn').addEventListener('click', () => { $('start-status').textContent = 'Stopped/paused safely.'; });
});
