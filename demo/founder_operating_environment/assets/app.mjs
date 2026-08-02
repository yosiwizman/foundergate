// End-to-end local operator loop (Wave 3 hardening + intake/classification/governed run/evidence).
// Deck-style Founder operating environment wired to the REAL local run-server
// (/api/session, /api/start, /api/export). Loopback only. No provider, no external network, no fake state.
// Honest failure behavior: server-off → UNKNOWN, run/export failure → HOLD/ERROR, timeout → HOLD,
// every run resets to UNKNOWN first (no stale green). Unsafe source/objective is HELD/REFUSED, never run.
const $ = (id) => document.getElementById(id);
let TOKEN = null, lastRun = null, lastIntake = null, exported = false, healthy = false, running = false;
const history = []; let batchReady = false;
const RUN_TIMEOUT_MS = () => (window.__FG_RUN_TIMEOUT_MS || 120000);
const DEFAULT_OBJ = 'Add input validation and prove tests pass';

// objectives that request a forbidden real-world action → REFUSED
const UNSAFE_OBJ = [
  /deploy/i, /\bbill(ing)?\b/i, /payment|\bpay\b|charge/i, /outreach|contact|email|send to/i,
  /customer data|private repo|production data|prod\b/i, /provider|spend|budget \$/i,
  /\bmerge\b/i, /pr\s*#?\s*200/i, /security|compliance|soc\s?2|hipaa/i, /\bsaas\b|go live|ship it/i,
];
const isSafeDemoPath = (p) => /self_owned_demo_repo|task-ledger\.selftest\.mjs|\/demo\//i.test(p) && !/customer|private|prod(uction)?|secret/i.test(p);

async function loadToken(){ try{ const r=await fetch('/api/session'); TOKEN=(await r.json()).token; return true; }catch{ TOKEN=null; return false; } }
async function post(url, body, signal){ const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-fg-token':TOKEN||''},body:JSON.stringify(body||{}),signal}); return r.json(); }
async function health(){ try{ const r=await fetch('/api/health'); return (await r.json()).status==='ok'; }catch{ return false; } }
function setAlive(on, text){ $('alive-dot').classList.toggle('on', !!on); $('alive-text').textContent=text; }
function setPill(el, text, kind){ el.textContent=text; el.className='pill'+(kind?(' '+kind):''); }

// ---- panel navigation (keyboard accessible, no reload, no backend) ----
function showPanel(name){
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'panel-'+name));
  document.querySelectorAll('.nav').forEach(b => {
    const on = b.dataset.panel === name;
    b.classList.toggle('on', on);
    if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
}

// ---- safety classification of source + objective; sets Run eligibility ----
function classify(){
  const src = $('src-sel').value, path = $('src-path').value.trim(), obj = $('obj-inp').value.trim();
  // source
  let srcOk=false, srcCls, srcKind, target='self-owned demo target';
  if(path){
    if(isSafeDemoPath(path)){ srcOk=true; srcCls='SAFE_LOCAL_DEMO (path)'; srcKind='live'; }
    else { srcCls='HOLD_NEEDS_AUTHORIZATION'; srcKind='hold'; }
  } else if(src==='demo'){ srcOk=true; srcCls='SAFE_LOCAL_DEMO'; srcKind='live'; }
  else if(src==='fixture'){ srcOk=true; srcCls='SAFE_LOCAL_DEMO (fixture)'; srcKind='live'; target='local fixture'; }
  else { srcCls='REFUSED — needs founder authorization'; srcKind='refuse'; }
  // objective
  const effObj = obj || DEFAULT_OBJ;
  let objOk=true, objCls, objKind='live';
  const hit = UNSAFE_OBJ.find(r=>r.test(effObj));
  if(!obj){ objCls='SAFE (using default)'; }
  else if(hit){ objOk=false; objCls='REFUSED — requests a forbidden action'; objKind='refuse'; }
  else objCls='SAFE';
  // eligibility
  let elig, eKind;
  if(!healthy){ elig='UNKNOWN — local backend unavailable'; eKind='hold'; }
  else if(!srcOk){ elig = src==='unknown' ? 'REFUSED' : 'HOLD_NEEDS_AUTHORIZATION'; eKind = src==='unknown'?'refuse':'hold'; }
  else if(!objOk){ elig='REFUSED'; eKind='refuse'; }
  else { elig='READY_LOCAL_DEMO'; eKind='live'; }
  setPill($('cls-src'), srcCls, srcKind); setPill($('cls-obj'), objCls, objKind); setPill($('cls-elig'), elig, eKind);
  const ready = (elig==='READY_LOCAL_DEMO');
  if(!running) $('run-btn').disabled = !ready;
  return { srcCls, objCls, elig, effObj, target, ready };
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
function renderRun(run, intake){
  const t = run.tests, testsTxt = t ? (t.result||'—') : '—', decision = run.decision || '—';
  $('chip-tests').textContent = testsTxt;
  $('chip-decision').textContent = decision + ' (never SHIP)';
  $('chip-evidence').textContent = run.commit ? 'FRESH (ready to export)' : 'UNKNOWN';
  $('what').textContent = 'The local check finished. Source: ' + intake.srcCls + '. Objective: "' + intake.effObj + '". Tests: ' + testsTxt + '. Decision: ' + decision + ' — internal demo only, never ship.';
  $('next').textContent = 'Click “Export evidence package” to save a sealed record. Do not use real/customer data.';
  $('preview-objective').textContent = intake.effObj + '  (source: ' + intake.srcCls + ')';
  $('preview-status').textContent = 'Complete — real local run (synthetic / self-owned demo only).';
  $('preview-result').textContent = 'Tests ' + testsTxt + ' · Decision ' + decision + ' (never SHIP). No sends, no payments, no deploy.';
  $('evi-state').textContent = run.commit ? 'Ready to export a sealed local package.' : 'UNKNOWN — run did not produce a build.';
  $('dec-current').textContent = decision + ' — never SHIP. View only; no real-world action authorized here.';
  $('t-status').textContent = 'status: ' + (run.status||run.mode||'—');
  $('t-commit').textContent = 'build: ' + (run.commit_short || '—');
  const canExport = !!(run && run.commit);
  $('export-btn').disabled = !canExport; $('export-btn2').disabled = !canExport;
}

function evidenceSummary(run, intake){
  const testsTxt = run.tests ? (run.tests.result||'—') : '—';
  return [
    'Source: ' + intake.srcCls,
    'Objective: "' + intake.effObj + '"',
    'Safety classification: ' + intake.elig,
    'Tests: ' + testsTxt,
    'Decision: ' + (run.decision||'—') + ' (never SHIP)',
    'Limitations: local-only, internal, synthetic/self-owned demo. Not production, not secure, not SaaS, not customer-ready.',
    'What was NOT proven: production readiness, security/compliance, customer/market/paid validation, commercial readiness.',
    'Send the ZIP to ChatGPT only if asked.'
  ].join('  ·  ');
}

// ---- local run history (in-session only) ----
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function recordHistory(src, obj, tests, decision, status){
  history.push({ src, obj, tests, decision, exported:false, status });
  renderHistory();
}
function renderHistory(){
  const body = $('hist-body'); if(!body) return;
  if(!history.length){ body.innerHTML = '<tr><td colspan="7" style="color:var(--dim)">No runs yet this session.</td></tr>'; return; }
  body.innerHTML = history.map((h,i)=>`<tr><td>${i+1}</td><td>${esc(h.src)}</td><td>${esc(h.obj)}</td><td>${esc(h.tests)}</td><td>${esc(h.decision)}</td><td>${h.exported?'yes':'no'}</td><td>${esc(h.status)}</td></tr>`).join('');
}
// ---- local decision ledger (internal notes only; never SHIP/MERGE/DEPLOY/BILL/SEND) ----
const LEDGER_OK = new Set(['CONTINUE_DEMO','HOLD','REPAIR','STOP']);
function addLedger(status){
  if(!LEDGER_OK.has(status)) return; // hard guard: only safe local statuses
  const ul = $('dec-ledger');
  if(ul.querySelector('[style]')) ul.innerHTML = '';
  const li = document.createElement('li');
  li.textContent = status + ' · local internal note · no real-world action (never SHIP/MERGE/DEPLOY/BILL/SEND)';
  ul.appendChild(li);
}
// ---- synthetic protected-files enforcement demo (no real filesystem access) ----
const PF_BLOCK = [/(^|\/)secrets?(\/|$)/i, /\.env$/i, /(^|\/)customer(\/|$)/i, /(^|\/)prod(uction)?(\/|$)/i, /private/i, /credential|password|token|secret/i];
const PF_ALLOW = [/^demo\//i, /^notes\//i, /^tests?\//i, /task-ledger/i];
function pfCheck(){
  const name = ($('pf-input').value||'').trim();
  let result, kind;
  if(!name){ result='UNKNOWN — type a synthetic name'; kind='hold'; }
  else if(PF_BLOCK.some(r=>r.test(name))){ result='BLOCKED for safety (synthetic)'; kind='refuse'; }
  else if(PF_ALLOW.some(r=>r.test(name))){ result='ALLOWED (sample allowlist)'; kind='live'; }
  else { result='HOLD — not on the sample allowlist'; kind='hold'; }
  setPill($('pf-result'), result, kind);
}
// ---- batch runner: several governed safe checks over allowlisted demo targets ----
async function doBatch(){
  if(!healthy){ setBatchRow('<tr><td colspan="5">Local backend UNAVAILABLE (UNKNOWN) — nothing run, nothing faked.</td></tr>'); return; }
  $('batch-run-btn').disabled = true; $('batch-export-btn').disabled = true; batchReady = false;
  const targets = [
    { label:'self-owned demo target', target:'self-owned demo target' },
    { label:'local fixture (self-owned)', target:'local fixture' },
  ];
  const rows = [];
  if(!TOKEN) await loadToken();
  for(let i=0;i<targets.length;i++){
    const t = targets[i];
    try{
      const res = await post('/api/start', { target:t.target, objective:'Batch: prove tests pass' });
      if(res.status==='complete' && res.run){
        lastRun = res.run; lastIntake = { srcCls:t.label, effObj:'Batch: prove tests pass', elig:'READY_LOCAL_DEMO' };
        const tests = res.run.tests ? res.run.tests.result : '—';
        rows.push({ target:t.label, tests, decision:(res.run.decision||'—')+' (never SHIP)', status:'COMPLETE' });
        recordHistory(t.label, 'Batch: prove tests pass', tests, res.run.decision||'—', 'COMPLETE');
        batchReady = !!res.run.commit;
      } else {
        rows.push({ target:t.label, tests:'UNKNOWN', decision:'UNKNOWN', status:(res.status||'ERROR') });
        recordHistory(t.label, 'Batch: prove tests pass', 'UNKNOWN', 'UNKNOWN', res.status||'ERROR');
      }
    }catch{
      rows.push({ target:t.label, tests:'UNKNOWN', decision:'UNKNOWN', status:'HOLD (backend)' });
    }
  }
  setBatchRow(rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.target)}</td><td>${esc(r.tests)}</td><td>${esc(r.decision)}</td><td>${esc(r.status)}</td></tr>`).join(''));
  $('batch-run-btn').disabled = false; $('batch-export-btn').disabled = !batchReady;
}
function setBatchRow(html){ $('batch-body').innerHTML = html; }

function applyHealth(ok){
  healthy = ok;
  $('server-state').textContent = ok ? 'reachable (127.0.0.1)' : 'not reachable — UNKNOWN';
  $('chip-status').textContent = ok ? 'reachable (127.0.0.1)' : 'UNAVAILABLE (UNKNOWN)';
  if(!ok && !running){
    setAlive(false, 'Local backend unavailable (UNKNOWN). Start it from the Desktop launcher, or ask ChatGPT.');
    $('next').textContent = 'The local backend is not running. Open it from “FounderGate_Start_Here”, or stop and ask ChatGPT. Nothing is faked.';
  }
  if(!running) classify();
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
      $('evi-receipt').textContent = evidenceSummary(lastRun, lastIntake);
      $('next').textContent='Done — a sealed evidence package was saved. Only share it if you choose to (separate decision).';
      if(history.length){ history[history.length-1].exported = true; renderHistory(); }
    }
    else if(res.status==='UNKNOWN'){ $('t-export').textContent='export: UNKNOWN — no run to export yet.'; $('evi-state').textContent='UNKNOWN — run first.'; }
    else { $('t-export').textContent='export: EXPORT_FAILED — '+(res.reason||'sealing did not verify'); $('evi-state').textContent='EXPORT_FAILED (HOLD) — sealing did not verify. Nothing was faked. Stop and ask ChatGPT.'; }
  }catch{ $('t-export').textContent='export: LOCAL BACKEND UNAVAILABLE (UNKNOWN).'; $('evi-state').textContent='LOCAL BACKEND UNAVAILABLE (UNKNOWN). Nothing was faked.'; }
}

async function doRun(){
  const intake = classify();
  if(!intake.ready){
    setAlive(false, 'Not eligible to run — ' + intake.elig + '. Nothing was run and nothing was faked.');
    $('what').textContent = 'This source/objective is not eligible for a local safe run (' + intake.elig + '). Unknown/private sources and forbidden objectives are held or refused. Ask ChatGPT.';
    return;
  }
  running = true; resetRunState(); lastIntake = intake;
  setAlive(false,'Running a safe local check…'); $('t-status').textContent='status: RUNNING';
  $('preview-status').textContent='Running a safe local check…'; $('run-btn').disabled = true;
  if(!(await health())){ running=false; applyHealth(false); $('what').textContent='Local backend unavailable — nothing was run and nothing was faked.'; return; }
  if(!TOKEN) await loadToken();
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), RUN_TIMEOUT_MS());
  try{
    const res = await post('/api/start', { target: intake.target, objective: intake.effObj }, ctrl.signal);
    clearTimeout(timer);
    if(res.status==='complete' && res.run){ lastRun=res.run; renderRun(res.run, intake); setAlive(true,'Complete — real local run (real commit + real tests).'); recordHistory(intake.srcCls, intake.effObj, res.run.tests?res.run.tests.result:'—', res.run.decision||'—', 'COMPLETE'); }
    else if(res.status==='INSUFFICIENT'){ setAlive(false,'HOLD — INSUFFICIENT (nothing guessed).'); $('what').textContent='Not enough information. UNKNOWN is safer than guessing. Stop and ask ChatGPT.'; recordHistory(intake.srcCls, intake.effObj, 'UNKNOWN', 'UNKNOWN', 'HOLD (INSUFFICIENT)'); }
    else if(res.status==='REFUSED'){ setAlive(false,'HOLD — REFUSED (target not on the local allowlist).'); $('what').textContent='The run was refused for safety. Nothing was faked. Stop and ask ChatGPT.'; recordHistory(intake.srcCls, intake.effObj, 'UNKNOWN', 'UNKNOWN', 'HOLD (REFUSED)'); }
    else if(res.status==='UNAUTHORIZED'){ setAlive(false,'HOLD — UNAUTHORIZED (session/Origin check failed).'); $('what').textContent='Session check failed. Reload and try once, or ask ChatGPT.'; recordHistory(intake.srcCls, intake.effObj, 'UNKNOWN', 'UNKNOWN', 'HOLD (UNAUTHORIZED)'); }
    else { setAlive(false,'ERROR — '+(res.reason||'run did not complete')+'.'); $('what').textContent='The run did not complete. Nothing was faked; export stays disabled. Stop and ask ChatGPT.'; recordHistory(intake.srcCls, intake.effObj, 'UNKNOWN', 'UNKNOWN', 'ERROR'); }
  }catch(e){
    clearTimeout(timer);
    if(e && e.name==='AbortError'){ setAlive(false,'HOLD — run took too long and was stopped safely (timeout).'); $('what').textContent='The run took too long and was stopped. Nothing was faked. Stop and ask ChatGPT.'; recordHistory(intake.srcCls, intake.effObj, 'UNKNOWN', 'UNKNOWN', 'HOLD (timeout)'); }
    else { setAlive(false,'LOCAL BACKEND UNAVAILABLE (UNKNOWN) — it will not fake a green result.'); $('what').textContent='Local backend unavailable. Nothing was run or faked.'; recordHistory(intake.srcCls, intake.effObj, 'UNKNOWN', 'UNKNOWN', 'UNKNOWN (backend)'); }
  }finally{
    running = false; classify();
  }
}

window.addEventListener('DOMContentLoaded', async ()=>{
  document.querySelectorAll('.nav').forEach(b => b.addEventListener('click', ()=> showPanel(b.dataset.panel)));
  resetRunState();
  ['src-sel','src-path','obj-inp'].forEach(id => { $(id).addEventListener('input', classify); $(id).addEventListener('change', classify); });
  applyHealth(await health());
  await loadToken();
  $('run-btn').addEventListener('click', doRun);
  $('export-btn').addEventListener('click', doExport);
  $('export-btn2').addEventListener('click', doExport);
  // batch runner
  $('batch-run-btn').addEventListener('click', doBatch);
  $('batch-export-btn').addEventListener('click', doExport);
  // local decision ledger (safe local statuses only)
  [['led-continue','CONTINUE_DEMO'],['led-hold','HOLD'],['led-repair','REPAIR'],['led-stop','STOP']]
    .forEach(([id,st]) => $(id).addEventListener('click', ()=> addLedger(st)));
  // synthetic protected-files enforcement demo
  $('pf-check-btn').addEventListener('click', pfCheck);
  $('pf-input').addEventListener('input', pfCheck);
  renderHistory(); pfCheck();
  setInterval(async ()=>{ if(!running) applyHealth(await health()); }, 4000);
});
