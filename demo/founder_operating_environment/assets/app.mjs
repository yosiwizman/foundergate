// Convergence prototype: the deck-style Truth Dashboard wired to the REAL local
// run-server (/api/session, /api/start, /api/export). Same-origin when served by
// src/operator_console/run-server.mjs. No provider, no external network, no fake state.
const $ = (id) => document.getElementById(id);
let TOKEN = null, lastRun = null;
async function loadToken(){ try{ const r=await fetch('/api/session'); TOKEN=(await r.json()).token; }catch{ TOKEN=null; } }
async function post(url, body){ const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-fg-token':TOKEN||''},body:JSON.stringify(body||{})}); return r.json(); }
async function health(){ try{ const r=await fetch('/api/health'); return (await r.json()).status==='ok'; }catch{ return false; } }
function setAlive(on, text){ $('alive-dot').classList.toggle('on', !!on); $('alive-text').textContent=text; }
function renderRun(run){
  const t=run.tests;
  $('chip-tests').textContent = t ? (t.result||'—') : '—';
  $('chip-decision').textContent = (run.decision||'—') + ' (never SHIP)';
  $('chip-fresh').textContent = run.commit ? 'FRESH' : 'UNKNOWN';
  $('chip-checker').textContent = 'separate review';
  $('chip-advisor').textContent = 'separate review';
  $('t-status').textContent = 'status: ' + (run.status||run.mode||'—');
  $('t-commit').textContent = 'build: ' + (run.commit_short || '—');
  $('what').textContent = 'The local check finished. Tests: ' + (t?t.result:'—') + '. Decision: ' + (run.decision||'—') + ' — internal demo only, never ship.';
  $('next').textContent = 'Click “Export evidence package” to save a sealed record. Do not use real/customer data.';
  $('export-btn').disabled = !(run && run.commit);
}
window.addEventListener('DOMContentLoaded', async ()=>{
  $('server-state').textContent = (await health()) ? 'reachable (127.0.0.1)' : 'not reachable — UNKNOWN';
  await loadToken();
  $('run-btn').addEventListener('click', async ()=>{
    setAlive(false,'Running a safe local check…'); $('t-status').textContent='status: RUNNING';
    try{
      const res = await post('/api/start', { target:'self-owned demo target', objective:'Add input validation and prove tests pass' });
      if(res.status==='complete' && res.run){ lastRun=res.run; renderRun(res.run); setAlive(true,'Complete — real local run (real commit + real tests).'); }
      else if(res.status==='INSUFFICIENT'){ setAlive(false,'INSUFFICIENT — nothing guessed.'); $('what').textContent='Not enough information. UNKNOWN is safer than guessing.'; }
      else if(res.status==='REFUSED'){ setAlive(false,'REFUSED — target not on the local allowlist.'); }
      else if(res.status==='UNAUTHORIZED'){ setAlive(false,'UNAUTHORIZED — session token/Origin check failed.'); }
      else { setAlive(false,(res.status||'ERROR')+' — '+(res.reason||'run did not complete')); }
    }catch{ setAlive(false,'LOCAL BACKEND UNAVAILABLE (UNKNOWN) — it will not fake a green result.'); $('chip-fresh').textContent='UNKNOWN'; }
  });
  $('export-btn').addEventListener('click', async ()=>{
    if(!lastRun) return; $('t-export').textContent='export: EXPORTING…';
    try{
      const res = await post('/api/export', {});
      if(res.status==='complete' && res.unzip_ok){ $('t-export').textContent='export: SEALED_EXPORT_LOCAL — '+res.zip; $('next').textContent='Done — a sealed evidence package was saved. Only share it if you choose to (separate decision).'; }
      else if(res.status==='UNKNOWN'){ $('t-export').textContent='export: UNKNOWN — no run to export yet.'; }
      else { $('t-export').textContent='export: EXPORT_FAILED — '+(res.reason||'sealing did not verify'); }
    }catch{ $('t-export').textContent='export: LOCAL BACKEND UNAVAILABLE (UNKNOWN).'; }
  });
});
