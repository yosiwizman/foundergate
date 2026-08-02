// Convergence prototype (Wave 2): the deck-style Founder operating environment wired to the
// REAL local run-server (/api/session, /api/start, /api/export). Same-origin when served by
// src/operator_console/run-server.mjs. No provider, no external network, no fake state.
// Panels (Preview, Evidence, Decisions) reflect the SAME real run state as the Truth Dashboard.
const $ = (id) => document.getElementById(id);
let TOKEN = null, lastRun = null, exported = false;
async function loadToken(){ try{ const r=await fetch('/api/session'); TOKEN=(await r.json()).token; }catch{ TOKEN=null; } }
async function post(url, body){ const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-fg-token':TOKEN||''},body:JSON.stringify(body||{})}); return r.json(); }
async function health(){ try{ const r=await fetch('/api/health'); return (await r.json()).status==='ok'; }catch{ return false; } }
function setAlive(on, text){ $('alive-dot').classList.toggle('on', !!on); $('alive-text').textContent=text; }

// ---- panel navigation (keyboard accessible, no reload, no backend) ----
function showPanel(name){
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'panel-'+name));
  document.querySelectorAll('.nav').forEach(b => {
    const on = b.dataset.panel === name;
    b.classList.toggle('on', on);
    if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
}

// ---- render the REAL run state across every panel ----
function renderRun(run){
  const t = run.tests;
  const testsTxt = t ? (t.result||'—') : '—';
  const decision = run.decision || '—';
  // Truth Dashboard
  $('chip-tests').textContent = testsTxt;
  $('chip-decision').textContent = decision + ' (never SHIP)';
  $('chip-evidence').textContent = run.commit ? 'FRESH (ready to export)' : 'UNKNOWN';
  $('what').textContent = 'The local check finished. Tests: ' + testsTxt + '. Decision: ' + decision + ' — internal demo only, never ship.';
  $('next').textContent = 'Click “Export evidence package” to save a sealed record. Do not use real/customer data.';
  // Preview
  $('preview-status').textContent = 'Complete — real local run (synthetic / self-owned demo only).';
  $('preview-result').textContent = 'Tests ' + testsTxt + ' · Decision ' + decision + ' (never SHIP). No sends, no payments, no deploy.';
  // Evidence
  $('evi-state').textContent = run.commit ? 'Ready to export a sealed local package.' : 'UNKNOWN — run did not produce a build.';
  // Decisions
  $('dec-current').textContent = decision + ' — never SHIP. View only; no real-world action authorized here.';
  // Technical
  $('t-status').textContent = 'status: ' + (run.status||run.mode||'—');
  $('t-commit').textContent = 'build: ' + (run.commit_short || '—');
  // enable both export buttons only after a real run with a real commit
  const canExport = !!(run && run.commit);
  $('export-btn').disabled = !canExport;
  $('export-btn2').disabled = !canExport;
}

async function doExport(){
  if(!lastRun) return;
  $('t-export').textContent='export: EXPORTING…';
  $('evi-state').textContent='Exporting…';
  try{
    const res = await post('/api/export', {});
    if(res.status==='complete' && res.unzip_ok){
      exported = true;
      $('t-export').textContent='export: SEALED_EXPORT_LOCAL — '+res.zip;
      $('chip-evidence').textContent='SEALED_EXPORT_LOCAL';
      $('evi-state').textContent='SEALED_EXPORT_LOCAL — a sealed evidence package was saved locally.';
      $('evi-receipt').textContent='Saved: a sealed, integrity-verified evidence package. Plain-English: your local demo check ran, tests + decision were recorded, and the package was sealed. Send the ZIP to ChatGPT only if asked.';
      $('next').textContent='Done — a sealed evidence package was saved. Only share it if you choose to (separate decision).';
    }
    else if(res.status==='UNKNOWN'){ $('t-export').textContent='export: UNKNOWN — no run to export yet.'; $('evi-state').textContent='UNKNOWN — run first.'; }
    else { $('t-export').textContent='export: EXPORT_FAILED — '+(res.reason||'sealing did not verify'); $('evi-state').textContent='EXPORT_FAILED — sealing did not verify.'; }
  }catch{ $('t-export').textContent='export: LOCAL BACKEND UNAVAILABLE (UNKNOWN).'; $('evi-state').textContent='LOCAL BACKEND UNAVAILABLE (UNKNOWN).'; }
}

window.addEventListener('DOMContentLoaded', async ()=>{
  document.querySelectorAll('.nav').forEach(b => b.addEventListener('click', ()=> showPanel(b.dataset.panel)));

  const ok = await health();
  $('server-state').textContent = ok ? 'reachable (127.0.0.1)' : 'not reachable — UNKNOWN';
  $('chip-status').textContent = ok ? 'reachable (127.0.0.1)' : 'UNAVAILABLE (UNKNOWN)';
  await loadToken();

  $('run-btn').addEventListener('click', async ()=>{
    setAlive(false,'Running a safe local check…'); $('t-status').textContent='status: RUNNING';
    $('preview-status').textContent='Running a safe local check…';
    try{
      const res = await post('/api/start', { target:'self-owned demo target', objective:'Add input validation and prove tests pass' });
      if(res.status==='complete' && res.run){ lastRun=res.run; renderRun(res.run); setAlive(true,'Complete — real local run (real commit + real tests).'); }
      else if(res.status==='INSUFFICIENT'){ setAlive(false,'INSUFFICIENT — nothing guessed.'); $('what').textContent='Not enough information. UNKNOWN is safer than guessing.'; }
      else if(res.status==='REFUSED'){ setAlive(false,'REFUSED — target not on the local allowlist.'); }
      else if(res.status==='UNAUTHORIZED'){ setAlive(false,'UNAUTHORIZED — session token/Origin check failed.'); }
      else { setAlive(false,(res.status||'ERROR')+' — '+(res.reason||'run did not complete')); }
    }catch{ setAlive(false,'LOCAL BACKEND UNAVAILABLE (UNKNOWN) — it will not fake a green result.'); $('chip-evidence').textContent='UNKNOWN'; }
  });

  $('export-btn').addEventListener('click', doExport);
  $('export-btn2').addEventListener('click', doExport);
});
