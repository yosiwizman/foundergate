// Convergence prototype (Wave 3 hardening): the deck-style Founder operating environment wired to
// the REAL local run-server (/api/session, /api/start, /api/export). Same-origin when served by
// src/operator_console/run-server.mjs. No provider, no external network, no fake state.
// Wave 3 adds honest failure-mode behavior: server-off → UNKNOWN, run/export failure → HOLD/ERROR,
// run timeout → HOLD, every run resets to UNKNOWN first (no stale green across repeats/failures).
const $ = (id) => document.getElementById(id);
let TOKEN = null, lastRun = null, exported = false, healthy = false, running = false;
const RUN_TIMEOUT_MS = () => (window.__FG_RUN_TIMEOUT_MS || 120000);

async function loadToken(){ try{ const r=await fetch('/api/session'); TOKEN=(await r.json()).token; return true; }catch{ TOKEN=null; return false; } }
async function post(url, body, signal){ const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-fg-token':TOKEN||''},body:JSON.stringify(body||{}),signal}); return r.json(); }
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

// ---- reset every panel to UNKNOWN (prevents stale green across repeated / failed runs) ----
function resetRunState(){
  lastRun = null; exported = false;
  $('chip-tests').textContent = 'UNKNOWN';
  $('chip-decision').textContent = 'UNKNOWN (never SHIP)';
  $('chip-evidence').textContent = 'UNKNOWN';
  $('export-btn').disabled = true; $('export-btn2').disabled = true;
  $('preview-result').textContent = 'No result yet — run from the Truth Dashboard.';
  $('evi-state').textContent = 'UNKNOWN — no run/export yet.';
  $('evi-receipt').textContent = 'Run a safe demo check, then export. A sealed evidence package will be saved locally.';
  $('dec-current').textContent = 'UNKNOWN — run first. (After a run: INTERNAL_DEMO_ONLY — never SHIP.)';
  $('t-export').textContent = 'export: not exported';
}

// ---- render the REAL run state across every panel (only on a real completed run) ----
function renderRun(run){
  const t = run.tests;
  const testsTxt = t ? (t.result||'—') : '—';
  const decision = run.decision || '—';
  $('chip-tests').textContent = testsTxt;
  $('chip-decision').textContent = decision + ' (never SHIP)';
  $('chip-evidence').textContent = run.commit ? 'FRESH (ready to export)' : 'UNKNOWN';
  $('what').textContent = 'The local check finished. Tests: ' + testsTxt + '. Decision: ' + decision + ' — internal demo only, never ship.';
  $('next').textContent = 'Click “Export evidence package” to save a sealed record. Do not use real/customer data.';
  $('preview-status').textContent = 'Complete — real local run (synthetic / self-owned demo only).';
  $('preview-result').textContent = 'Tests ' + testsTxt + ' · Decision ' + decision + ' (never SHIP). No sends, no payments, no deploy.';
  $('evi-state').textContent = run.commit ? 'Ready to export a sealed local package.' : 'UNKNOWN — run did not produce a build.';
  $('dec-current').textContent = decision + ' — never SHIP. View only; no real-world action authorized here.';
  $('t-status').textContent = 'status: ' + (run.status||run.mode||'—');
  $('t-commit').textContent = 'build: ' + (run.commit_short || '—');
  const canExport = !!(run && run.commit);
  $('export-btn').disabled = !canExport;
  $('export-btn2').disabled = !canExport;
}

// ---- reflect local backend health honestly; enable/disable Run accordingly ----
function applyHealth(ok){
  healthy = ok;
  $('server-state').textContent = ok ? 'reachable (127.0.0.1)' : 'not reachable — UNKNOWN';
  $('chip-status').textContent = ok ? 'reachable (127.0.0.1)' : 'UNAVAILABLE (UNKNOWN)';
  if(!running) $('run-btn').disabled = !ok;
  if(!ok && !running){
    setAlive(false, 'Local backend unavailable (UNKNOWN). Start it from the Desktop launcher, or ask ChatGPT.');
    $('next').textContent = 'The local backend is not running. Open it from “FounderGate_Start_Here”, or stop and ask ChatGPT. Nothing is faked.';
  }
}

async function doExport(){
  if(!lastRun){ $('evi-state').textContent='UNKNOWN — run first (nothing to export).'; return; }
  $('t-export').textContent='export: EXPORTING…'; $('evi-state').textContent='Exporting…';
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
    else { $('t-export').textContent='export: EXPORT_FAILED — '+(res.reason||'sealing did not verify'); $('evi-state').textContent='EXPORT_FAILED (HOLD) — sealing did not verify. Nothing was faked. Stop and ask ChatGPT.'; }
  }catch{ $('t-export').textContent='export: LOCAL BACKEND UNAVAILABLE (UNKNOWN).'; $('evi-state').textContent='LOCAL BACKEND UNAVAILABLE (UNKNOWN). Nothing was faked.'; }
}

async function doRun(){
  running = true; resetRunState();
  setAlive(false,'Running a safe local check…'); $('t-status').textContent='status: RUNNING';
  $('preview-status').textContent='Running a safe local check…'; $('run-btn').disabled = true;
  // re-check health first (handles server started late / stopped since load)
  if(!(await health())){ running=false; applyHealth(false); $('what').textContent='Local backend unavailable — nothing was run and nothing was faked.'; return; }
  if(!TOKEN) await loadToken();
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), RUN_TIMEOUT_MS());
  try{
    const res = await post('/api/start', { target:'self-owned demo target', objective:'Add input validation and prove tests pass' }, ctrl.signal);
    clearTimeout(timer);
    if(res.status==='complete' && res.run){ lastRun=res.run; renderRun(res.run); setAlive(true,'Complete — real local run (real commit + real tests).'); }
    else if(res.status==='INSUFFICIENT'){ setAlive(false,'HOLD — INSUFFICIENT (nothing guessed).'); $('what').textContent='Not enough information. UNKNOWN is safer than guessing. Stop and ask ChatGPT.'; }
    else if(res.status==='REFUSED'){ setAlive(false,'HOLD — REFUSED (target not on the local allowlist).'); $('what').textContent='The run was refused for safety. Nothing was faked. Stop and ask ChatGPT.'; }
    else if(res.status==='UNAUTHORIZED'){ setAlive(false,'HOLD — UNAUTHORIZED (session/Origin check failed).'); $('what').textContent='Session check failed. Reload and try once, or ask ChatGPT.'; }
    else { setAlive(false,'ERROR — '+(res.reason||'run did not complete')+'.'); $('what').textContent='The run did not complete. Nothing was faked; export stays disabled. Stop and ask ChatGPT.'; }
  }catch(e){
    clearTimeout(timer);
    if(e && e.name==='AbortError'){ setAlive(false,'HOLD — run took too long and was stopped safely (timeout).'); $('what').textContent='The run took too long and was stopped. Nothing was faked. Stop and ask ChatGPT.'; }
    else { setAlive(false,'LOCAL BACKEND UNAVAILABLE (UNKNOWN) — it will not fake a green result.'); $('what').textContent='Local backend unavailable. Nothing was run or faked.'; }
  }finally{
    running = false; $('run-btn').disabled = !healthy;
  }
}

window.addEventListener('DOMContentLoaded', async ()=>{
  document.querySelectorAll('.nav').forEach(b => b.addEventListener('click', ()=> showPanel(b.dataset.panel)));
  resetRunState();
  applyHealth(await health());
  await loadToken();
  $('run-btn').addEventListener('click', doRun);
  $('export-btn').addEventListener('click', doExport);
  $('export-btn2').addEventListener('click', doExport);
  // lightweight health poll so a late-started / stopped backend is reflected honestly
  setInterval(async ()=>{ if(!running) applyHealth(await health()); }, 4000);
});
