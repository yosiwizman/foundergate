// End-to-end local operator loop (Wave 3 hardening + intake/classification/governed run/evidence).
// Deck-style Founder operating environment wired to the REAL local run-server
// (/api/session, /api/start, /api/export). Loopback only. No provider, no external network, no fake state.
// Honest failure behavior: server-off → UNKNOWN, run/export failure → HOLD/ERROR, timeout → HOLD,
// every run resets to UNKNOWN first (no stale green). Unsafe source/objective is HELD/REFUSED, never run.
//
// Idea Builder request→artifact binding (false-green correction 20260803): a typed idea binds to a
// supported deterministic template (via src/idea_builder/template-registry.mjs, the SAME module the node
// evidence generator uses) and loads THAT template's bound manifest; unsupported/held ideas show no
// DONE/PASS and no preview. No static Wave 9 JSON, no hardcoded preview.
import { classifyRequest, requestHash } from '../../../src/idea_builder/template-registry.mjs';
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
  renderHistory(); saveHistory();
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
  ul.appendChild(li); saveLedger();
}
// ---- synthetic protected-files enforcement demo (no real filesystem access) ----
const PF_BLOCK = [/(^|\/)secrets?(\/|$)/i, /\.env$/i, /(^|\/)customer(\/|$)/i, /(^|\/)prod(uction)?(\/|$)/i, /private/i, /credential|password|token|secret/i];
const PF_ALLOW = [/^demo\//i, /^notes\//i, /^tests?\//i, /task-ledger/i];
function pfCheck(){
  const name = ($('pf-input').value||'').trim();
  if(!name){ setPill($('pf-result'),'UNKNOWN — type a synthetic name','hold'); return; }
  const pol = pfActivePolicy(); const c = pfClassifyWith(name, pol);
  setPill($('pf-result'), c + ' · policy: ' + pol.name, /BLOCKED/.test(c)?'refuse':(/ALLOWED/.test(c)?'live':'hold'));
}
// ---- batch runner: REAL per-fixture execution over a safe fixture set (adapters) ----
const FIXTURE_SET = [
  { key:'node-pass',    type:'Node',   adapter:'node-test' },
  { key:'node-fail',    type:'Node',   adapter:'node-test' },
  { key:'node-no-test', type:'Node',   adapter:'no-test' },
  { key:'python-pass',  type:'Python', adapter:'python' },
  { key:'static-web',   type:'Static', adapter:'static' },
  { key:'broken',       type:'Node',   adapter:'node-test' },
  { key:'go-style',     type:'Go',     adapter:'toolchain' },
  { key:'rust-style',   type:'Rust',   adapter:'toolchain' },
  { key:'java-style',   type:'Java',   adapter:'java' },
  { key:'monorepo',     type:'Monorepo',adapter:'monorepo' },
  { key:'deps-present', type:'Node',   adapter:'node-deps' },
  { key:'deps-missing', type:'Node',   adapter:'node-deps' },
  { key:'py-deps-missing', type:'Python', adapter:'py-deps' },
  { key:'install-requested', type:'Node', adapter:'(refused)' },
  { key:'unsupported',  type:'unsupported', adapter:'(none)' },
  { key:'customer_private_repo', type:'unsafe-name', adapter:'(refused)' },
  { key:'unknown-xyz',  type:'unknown', adapter:'(refused)' },
];
// ---- synthetic scenarios (no real account / data / network) ----
const SCENARIO_SET = ['calendar-app-pass','calendar-app-fail','task-app-pass','task-app-fail','crud-api-pass','crud-api-fail','static-site-pass','static-site-broken','no-test-scenario','dependency-missing-scenario','unsafe-customer-calendar-scenario','unsafe-production-api-scenario'];
function renderScenarioPreview(p){
  const el = $('scn-preview'); if(!el) return;
  if(!p || p.kind==='NONE'){ el.textContent = 'No preview for this scenario (synthetic).'; return; }
  let body = '<div class="pill">'+esc(p.kind)+'</div><div class="honesty" style="margin:6px 0">'+esc(p.note||'')+'</div>';
  if(p.events) body += '<table class="tbl"><thead><tr><th>Synthetic event</th><th>Day</th><th>Time</th></tr></thead><tbody>'+p.events.map(e=>`<tr><td>${esc(e.title)}</td><td>${esc(e.day)}</td><td>${esc(e.time)}</td></tr>`).join('')+'</tbody></table>';
  else if(p.items) body += '<ul class="ledger">'+p.items.map(i=>`<li>${esc(i)}</li>`).join('')+'</ul>';
  else if(p.rows) body += '<table class="tbl"><thead><tr><th>id</th><th>name</th></tr></thead><tbody>'+p.rows.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.name)}</td></tr>`).join('')+'</tbody></table>';
  el.innerHTML = body;
}
async function doScenario(){
  if(!healthy){ setPill($('scn-result'),'UNKNOWN — backend unavailable','hold'); return; }
  if(!TOKEN) await loadToken();
  const key = $('scn-sel').value;
  setPill($('scn-result'),'Running…','hold');
  try{
    const r = await post('/api/run-scenario', { key, objective:'scenario: '+key });
    const kind = /PASS/.test(r.status)?'live':(/REFUSED|FAIL|BROKEN/.test(r.status)?'refuse':'hold');
    setPill($('scn-result'), r.status + ' · ' + (r.scenario_type||'') , kind);
    renderScenarioPreview(r.preview);
    $('preview-status').textContent = 'Scenario: ' + key + ' → ' + r.status + ' (synthetic, never SHIP).';
    $('preview-result').textContent = r.explanation || '';
    recordHistory('scenario: '+key, 'scenario: '+key, r.status, r.decision||'UNKNOWN', r.status);
  }catch{ setPill($('scn-result'),'UNKNOWN — backend unavailable','hold'); }
}

async function doBatch(){
  if(!healthy){ setBatchRow('<tr><td colspan="6">Local backend UNAVAILABLE (UNKNOWN) — nothing run, nothing faked.</td></tr>'); return; }
  $('batch-run-btn').disabled = true; $('scn-run-btn').disabled = true; $('batch-export-btn').disabled = true; batchReady = false;
  if(!TOKEN) await loadToken();
  try{ await post('/api/batch-reset', {}); }catch{}
  const rows = [];
  // scenario matrix first (synthetic scenarios)
  for(let i=0;i<SCENARIO_SET.length;i++){
    const key = SCENARIO_SET[i]; let r;
    try{ r = await post('/api/run-scenario', { key, objective:'scenario: '+key }); }catch{ r={status:'UNKNOWN',explanation:'backend'}; }
    rows.push({ key:'scenario:'+key, type:(r.scenario_type||'scenario'), adapter:'scenario', status:r.status, next:r.next_action||'—' });
    recordHistory('scenario: '+key, 'scenario: '+key, r.status, r.decision||'UNKNOWN', r.status);
    setBatchRow(rows.map((x,j)=>`<tr><td>${j+1}</td><td>${esc(x.key)}</td><td>${esc(x.type)}</td><td>${esc(x.adapter)}</td><td>${esc(x.status)}</td><td>${esc(x.next)}</td></tr>`).join(''));
  }
  for(let i=0;i<FIXTURE_SET.length;i++){
    const f = FIXTURE_SET[i];
    let r;
    try{ r = await post('/api/run-fixture', { key:f.key, objective:'Batch: prove tests pass' }); }
    catch{ r = { status:'UNKNOWN', explanation:'backend unavailable', next_action:'ask ChatGPT' }; }
    rows.push({ ...f, status:r.status, next:r.next_action||'—' });
    recordHistory('fixture: '+f.key, 'Batch: prove tests pass', r.status, r.decision||'UNKNOWN', r.status);
    setBatchRow(rows.map((x,j)=>`<tr><td>${j+1}</td><td>${esc(x.key)}</td><td>${esc(x.type)}</td><td>${esc(x.adapter)}</td><td>${esc(x.status)}</td><td>${esc(x.next)}</td></tr>`).join(''));
  }
  const pass = rows.filter(x=>x.status==='PASS').length, refused = rows.filter(x=>/REFUSED/.test(x.status)).length;
  setPill($('batch-aggregate'), `${pass}/${rows.length} PASS · ${refused} refused · never SHIP`, pass>0?'live':'hold');
  batchReady = rows.length>0;
  $('batch-run-btn').disabled = false; $('scn-run-btn').disabled = false; $('batch-export-btn').disabled = !batchReady;
}
function setBatchRow(html){ $('batch-body').innerHTML = html; }
async function doBatchExport(){
  $('evi-state').textContent='Exporting aggregated batch…';
  try{
    const res = await post('/api/batch-export', {});
    if(res.status==='complete' && res.unzip_ok){
      $('chip-evidence').textContent='SEALED_EXPORT_LOCAL (batch)';
      $('evi-state').textContent='SEALED_EXPORT_LOCAL — aggregated batch evidence sealed ('+res.entries+' runs). '+(res.aggregate||'');
      $('evi-receipt').textContent='Aggregated batch package saved locally and integrity-verified. '+(res.aggregate||'')+' Send the ZIP to ChatGPT only if asked.';
    } else if(res.status==='UNKNOWN'){ $('evi-state').textContent='UNKNOWN — run a batch first.'; }
    else { $('evi-state').textContent='EXPORT_FAILED (HOLD) — '+(res.reason||'aggregate did not verify')+'. Nothing was faked.'; }
  }catch{ $('evi-state').textContent='LOCAL BACKEND UNAVAILABLE (UNKNOWN).'; }
}

// ---- evidence viewer / replay ----
async function doViewer(){
  $('viewer-body').textContent='Loading…';
  try{
    const res = await fetch('/api/last-evidence'); const d = await res.json();
    if(d.status==='complete' && d.evidence){
      const e = d.evidence; lastEvidenceObj = e;
      const rows = e.kind==='aggregate-batch'
        ? [['Kind','aggregate batch'],['Aggregate', e.aggregate_conclusion],['Passed', (e.pass+'/'+e.total)],['Refused', String(e.refused)],['Decision ceiling','INTERNAL_DEMO_ONLY (never SHIP)'],['Limitations', e.limitations],['What was NOT proven', e.not_proven],['ZIP verified', e.zip_verified?'yes':'no']]
        : [['Kind','single run'],['Decision ceiling','INTERNAL_DEMO_ONLY (never SHIP)'],['ZIP verified', e.zip_verified?'yes':'no']];
      $('viewer-body').innerHTML = '<table class="tbl"><tbody>'+rows.map(([k,v])=>`<tr><td style="width:38%">${esc(k)}</td><td>${esc(String(v))}</td></tr>`).join('')+'</tbody></table>';
    } else { $('viewer-body').textContent = 'UNKNOWN — no sealed evidence yet. Run a batch and export first.'; }
  }catch{ $('viewer-body').textContent='LOCAL BACKEND UNAVAILABLE (UNKNOWN).'; }
}

// ---- Doctor / readiness (read-only /api/doctor) ----
async function doDoctor(){
  $('doctor-body').innerHTML = '<tr><td colspan="2">Checking…</td></tr>';
  try{
    const r = await fetch('/api/doctor'); const d = await r.json();
    const rows = Object.entries(d.checks||{}).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
    $('doctor-body').innerHTML = rows;
    setPill($('doctor-summary'), d.summary||'—', d.summary==='READY_LOCAL'?'live':'hold');
  }catch{ $('doctor-body').innerHTML='<tr><td colspan="2">LOCAL BACKEND UNAVAILABLE (UNKNOWN).</td></tr>'; setPill($('doctor-summary'),'UNKNOWN','hold'); }
}

// ---- Idea Builder (local synthetic): request → template binding → bound build status + preview ----
// Reset the status table + preview link to a neutral state so no stale green survives a re-classify.
function ideaResetStatus(msg){
  $('idea-body').innerHTML = `<tr><td colspan="2" style="color:var(--dim)">${esc(msg||'Click “Load build status”.')}</td></tr>`;
  const pl = $('idea-preview-link'); if(pl){ pl.setAttribute('href','#'); pl.setAttribute('aria-disabled','true'); pl.classList.add('disabled'); pl.dataset.bound=''; pl.textContent='▶ Open generated app preview'; }
}
function ideaPillKind(kind){ return kind==='SUPPORTED'?'live':(kind==='HELD_REQUIRES_FOUNDER_GATE'?'hold':'refuse'); }
function ideaPillText(c){
  if(c.kind==='SUPPORTED') return `Supported local template selected: ${c.template_id} · req ${c.request_hash}`;
  if(c.kind==='HELD_REQUIRES_FOUNDER_GATE') return `HELD_REQUIRES_FOUNDER_GATE · ${c.reason} · req ${c.request_hash}`;
  return `UNSUPPORTED_LOCAL_TEMPLATE · ${c.reason} · req ${c.request_hash}`;
}
function doIdeaClassify(){
  const c = classifyRequest($('idea-input').value);
  setPill($('idea-class'), ideaPillText(c), ideaPillKind(c.kind));
  // classification changed → clear any previously loaded status/preview (never keep stale DONE/PASS)
  ideaResetStatus(c.kind==='SUPPORTED' ? 'Click “Load build status” to load the bound build for this template.' :
    'Not a supported local template — “Load build status” will show ' + c.kind + ' (no DONE/PASS).');
}
async function doIdeaLoad(){
  const c = classifyRequest($('idea-input').value);           // bind to the CURRENT typed request
  setPill($('idea-class'), ideaPillText(c), ideaPillKind(c.kind));
  const reqRow = `<tr><td>Request</td><td><span class="pill">req ${esc(c.request_hash)} → ${esc(c.template_id||c.kind)}</span></td></tr>`;
  if(c.kind!=='SUPPORTED'){
    // honest refusal — NO DONE/PASS, NO preview
    const label = c.kind==='HELD_REQUIRES_FOUNDER_GATE' ? 'HELD_REQUIRES_FOUNDER_GATE' : 'UNSUPPORTED_LOCAL_TEMPLATE';
    $('idea-body').innerHTML = reqRow +
      `<tr><td>Local app generated</td><td><span class="pill refuse">${label} — not built</span></td></tr>` +
      `<tr><td>Tests</td><td><span class="pill hold">NONE — no artifact to test</span></td></tr>` +
      `<tr><td>Local preview</td><td><span class="pill hold">NONE — nothing to preview</span></td></tr>` +
      `<tr><td>Reason</td><td>${esc(c.reason)}</td></tr>`;
    ideaResetStatus.__keep = true; // (preview already reset below)
    const pl = $('idea-preview-link'); if(pl){ pl.setAttribute('href','#'); pl.setAttribute('aria-disabled','true'); pl.classList.add('disabled'); pl.dataset.bound=''; pl.textContent='▶ Preview (none — not built)'; }
    return;
  }
  // SUPPORTED → load the template's BOUND manifest (real tests already ran to make it)
  $('idea-body').innerHTML = reqRow + '<tr><td colspan="2">Loading bound build…</td></tr>';
  try{
    const r = await fetch(`assets/binding/${c.template_id}_manifest.json`, {cache:'no-store'});
    if(!r.ok) throw new Error('manifest '+r.status);
    const d = await r.json();
    // preview link is DERIVED from the manifest — never hardcoded
    const previewUrl = d.preview_url;
    const rows = (d.steps||[]).map(s=>{ const k=/PASS|DONE|AVAILABLE/.test(s.status)?'live':(/HOLD|HELD|UNSUPPORTED|NONE/.test(s.status)?'hold':'live');
      return `<tr><td>${esc(s.step)}</td><td><span class="pill ${k}">${esc(s.status)}</span></td></tr>`; }).join('');
    $('idea-body').innerHTML = reqRow + rows +
      `<tr><td>Preview binds to</td><td><span class="pill live">${esc(previewUrl)}</span></td></tr>`;
    const pl = $('idea-preview-link');
    if(pl){ pl.setAttribute('href', previewUrl); pl.removeAttribute('aria-disabled'); pl.classList.remove('disabled'); pl.dataset.bound=c.template_id; pl.textContent=`▶ Open generated app preview (${c.template_id})`; }
  }catch(e){
    // manifest missing/unreadable → UNKNOWN, never green
    $('idea-body').innerHTML = reqRow + `<tr><td>Build status</td><td><span class="pill hold">UNKNOWN — bound manifest missing (no green)</span></td></tr>`;
    const pl = $('idea-preview-link'); if(pl){ pl.setAttribute('href','#'); pl.setAttribute('aria-disabled','true'); pl.classList.add('disabled'); pl.dataset.bound=''; }
  }
}

// ---- Local App Factory Proof (loads factory_index.json; previews bound per-app manifests) ----
async function doFactory(){
  $('factory-body').innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
  try{
    const r = await fetch('assets/factory/factory_index.json', {cache:'no-store'});
    if(!r.ok) throw new Error('factory_index '+r.status);
    const d = await r.json();
    $('factory-body').innerHTML = (d.apps||[]).map(a=>{
      const k = /PASS/.test(a.test_result)?'live':'hold';
      const done = a.final_status==='BUILT_AND_PASSED';
      const prev = done
        ? `<a class="btn" data-testid="factory-preview-${esc(a.template_id)}" href="${esc(a.preview_url)}" target="_blank" rel="noopener">▶ Open</a>`
        : `<span class="pill hold">no preview</span>`;
      return `<tr data-app="${esc(a.template_id)}"><td>${esc(a.title)}</td><td><span class="pill">req ${esc(a.request_hash)}</span></td>`+
             `<td class="muted" style="font-size:11px">${esc(a.generated_app_path)}</td>`+
             `<td><span class="pill ${k}">${esc(a.test_result)}</span></td>`+
             `<td><span class="pill ${done?'live':'hold'}">${esc(a.final_status)}</span></td><td>${prev}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="muted">No apps in factory index.</td></tr>';
    if(d.unsupported_example) setPill($('factory-unsupported'), d.unsupported_example.request_text+' → '+d.unsupported_example.expected, 'refuse');
  }catch(e){ $('factory-body').innerHTML='<tr><td colspan="6">UNKNOWN — could not load factory index (no green).</td></tr>'; }
}

// ---- Real Repo Proof (public self-owned; loads founder-safe results JSON) ----
async function doRealRepo(){
  $('realrepo-body').innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
  try{
    const r = await fetch('assets/real_repo_proof.json'); const d = await r.json();
    $('realrepo-body').innerHTML = (d.repos||[]).map(x=>{
      const kind = /PASS/.test(x.result)?'live':(/FAIL|REFUSED|BROKEN/.test(x.result)?'refuse':'hold');
      return `<tr><td>${esc(x.repo)}</td><td>${esc(x.type)}</td><td><span class="pill ${kind}">${esc(x.result)}</span></td><td style="color:var(--dim)">${esc(x.build)}</td><td style="color:var(--muted)">${esc(x.detail)}</td></tr>`;
    }).join('');
  }catch{ $('realrepo-body').innerHTML='<tr><td colspan="5">UNKNOWN — could not load results.</td></tr>'; }
}

// ---- Live-Gate Simulator (display-only / planning; nothing acts) ----
const LIVE_GATES = [
  ['Real self-owned repo run','a vetted self-owned repo + explicit scope','I AUTHORIZE one real self-owned repo run: <repo>'],
  ['Real protected-file enforcement','a design + safe test plan','I AUTHORIZE real protected-file enforcement design'],
  ['Real calendar/account/data integration','a consented account + scope + data policy','I AUTHORIZE real calendar/account integration design'],
  ['Provider-at-scale','a budget ceiling + cost proof','I AUTHORIZE provider-at-scale planning with a $ ceiling'],
  ['Deployment architecture','a target + rollback plan','I AUTHORIZE deployment architecture planning'],
  ['Billing/payment','a compliant setup plan','I AUTHORIZE billing/payment planning'],
  ['Security/compliance review','a scope + reviewer','I AUTHORIZE a security/compliance review'],
  ['PR #200 disposition','a review of PR #200','I AUTHORIZE a PR #200 disposition: keep-parked | rebase | review'],
  ['Merge / final beta','an explicit evidence review','I AUTHORIZE merge/final beta after evidence review'],
  ['Public/customer beta','real users + consent + support plan','I AUTHORIZE a public/customer beta'],
];
function renderLiveGates(){
  const b = $('livegate-body'); if(!b) return;
  b.innerHTML = LIVE_GATES.map(([g,ev,ph])=>`<tr><td>${esc(g)}</td><td><span class="pill refuse">REQUIRED · NOT AUTHORIZED</span></td><td>${esc(ev)}</td><td style="color:var(--dim)">${esc(ph)}</td></tr>`).join('');
}

// ---- one-click local rehearsal (chains real local steps; fakes nothing) ----
async function doRehearsal(){
  const set=(t,k)=>setPill($('rehearsal-status'), t, k||'hold');
  if(!healthy){ set('UNKNOWN — backend unavailable','refuse'); return; }
  $('rehearsal-btn').disabled = true;
  try{
    set('1/5 running synthetic calendar…');
    $('scn-sel').value = 'calendar-app-pass'; await doScenario();
    set('2/5 running scenario+fixture matrix…');
    await doBatch();
    set('3/5 exporting aggregate evidence…');
    await doBatchExport();
    set('4/5 replaying evidence…');
    await doViewer();
    set('5/5 recording history/ledger…');
    addLedger('CONTINUE_DEMO');
    const ok = /SEALED_EXPORT_LOCAL/.test($('evi-state').textContent);
    set(ok ? 'COMPLETE — local rehearsal done (never SHIP)' : 'HOLD — export did not verify', ok?'live':'refuse');
  }catch{ set('HOLD — rehearsal interrupted (nothing faked)','refuse'); }
  finally{ $('rehearsal-btn').disabled = false; }
}

// ---- persistent local history + ledger (browser localStorage, clearable) ----
function saveHistory(){ try{ localStorage.setItem('fg_history', JSON.stringify(history.slice(-100))); }catch{} }
function loadHistory(){ try{ const a=JSON.parse(localStorage.getItem('fg_history')||'[]'); if(Array.isArray(a)){ history.length=0; a.forEach(h=>history.push(h)); } }catch{} }
function clearHistory(){ history.length=0; try{ localStorage.removeItem('fg_history'); }catch{}; renderHistory(); }
function saveLedger(){ try{ const items=[...$('dec-ledger').querySelectorAll('li')].filter(li=>!li.getAttribute('style')).map(li=>li.textContent); localStorage.setItem('fg_ledger', JSON.stringify(items)); }catch{} }
function loadLedger(){ try{ const a=JSON.parse(localStorage.getItem('fg_ledger')||'[]'); if(Array.isArray(a)&&a.length){ const ul=$('dec-ledger'); ul.innerHTML=''; a.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.appendChild(li); }); } }catch{} }
function clearLedger(){ try{ localStorage.removeItem('fg_ledger'); }catch{}; $('dec-ledger').innerHTML='<li style="color:var(--dim)">No local notes yet. These are internal notes only — never SHIP/MERGE/DEPLOY/BILL/SEND, and they trigger no real-world action.</li>'; }

// ---- protected-files: batch-classify a synthetic manifest (client-side only) ----
const PF_MANIFEST = ['demo/notes/todo.txt','tests/unit/app.test.mjs','secrets/prod.env','customer/private_data.csv','production/config.yaml','src/index.mjs','random/unknown.bin'];
function pfClassifyName(name){
  if(PF_BLOCK.some(r=>r.test(name))) return ['BLOCKED for safety (synthetic)','refuse'];
  if(PF_ALLOW.some(r=>r.test(name))) return ['ALLOWED (sample)','live'];
  return ['HOLD — not on allowlist','hold'];
}
// named synthetic policies (client-side only)
const PF_POLICIES = {
  'demo-safe':       [/(^|\/)secrets?(\/|$)/i,/\.env$/i,/(^|\/)customer(\/|$)/i,/(^|\/)prod(uction)?(\/|$)/i,/private/i,/credential|password|token|secret/i],
  'block-secrets':   [/\.env$/i,/secret|credential|password|token|key/i],
  'block-customer':  [/(^|\/)customer(\/|$)|client/i],
  'block-production':[/(^|\/)prod(uction)?(\/|$)/i],
  'block-private':   [/private/i],
};
function pfActivePolicy(){ const sel=$('pf-policy'); const p=sel?sel.value:'demo-safe'; return { name:p, block: PF_POLICIES[p]||PF_POLICIES['demo-safe'] }; }
function pfClassifyWith(name, pol){
  if(pol.block.some(r=>r.test(name))) return 'BLOCKED for safety (synthetic)';
  if(PF_ALLOW.some(r=>r.test(name))) return 'ALLOWED (sample)';
  return 'HOLD — not on allowlist';
}
function pfBatch(){
  const tbl=$('pf-batch-tbl'); tbl.style.display=''; const pol=pfActivePolicy();
  $('pf-batch-body').innerHTML = PF_MANIFEST.map(n=>`<tr><td>${esc(n)}</td><td>${esc(pfClassifyWith(n,pol))}</td></tr>`).join('');
}
function pfExport(){
  const pol=pfActivePolicy();
  const report={ kind:'LOCAL_SYNTHETIC_ENFORCEMENT_DEMO', policy:pol.name, note:'Not production enforcement. No real files scanned.', results: PF_MANIFEST.map(n=>({name:n, classification: pfClassifyWith(n,pol)})) };
  downloadJson('foundergate_protected_files_report.json', report);
}

// ---- generic local JSON download ----
function downloadJson(name, obj){
  try{ const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); }catch{}
}
const UNSAFE_CONTENT = /customer|private|prod(uction)?|secret|credential|password|token/i;

// ---- history export / import (schema-checked, rejects unsafe/malformed) ----
function exportHistory(){ downloadJson('foundergate_history.json', { kind:'foundergate-local-history', local_only:true, runs: history.slice(-100) }); }
function importHistory(file){
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const d=JSON.parse(rd.result);
      const runs = Array.isArray(d) ? d : (d && d.runs);
      if(!Array.isArray(runs)) return setPill($('hist-import-result'),'REJECTED — malformed (not a history file)','refuse');
      for(const r of runs){ if(typeof r!=='object'||r===null||!('src' in r)||!('status' in r)) return setPill($('hist-import-result'),'REJECTED — schema invalid','refuse');
        if(UNSAFE_CONTENT.test(JSON.stringify(r))) return setPill($('hist-import-result'),'REJECTED — customer/private/production-looking content','refuse'); }
      history.length=0; runs.slice(-100).forEach(r=>history.push(r)); renderHistory(); saveHistory();
      setPill($('hist-import-result'),'IMPORTED '+runs.length+' (local only)','live');
    }catch{ setPill($('hist-import-result'),'REJECTED — not valid JSON','refuse'); }
  };
  rd.readAsText(file);
}

// ---- ledger export / import (rejects forbidden statuses) ----
const LEDGER_FORBIDDEN = /SHIP|MERGE|DEPLOY|BILL|SEND|CUSTOMER_READY/;
function ledgerItems(){ return [...$('dec-ledger').querySelectorAll('li')].filter(li=>!li.getAttribute('style')).map(li=>li.textContent); }
function exportLedger(){ downloadJson('foundergate_ledger.json', { kind:'foundergate-local-ledger', local_only:true, notes: ledgerItems() }); }
function importLedger(file){
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const d=JSON.parse(rd.result); const notes = Array.isArray(d)?d:(d&&d.notes);
      if(!Array.isArray(notes)) return setPill($('led-import-result'),'REJECTED — malformed','refuse');
      for(const n of notes){ if(typeof n!=='string') return setPill($('led-import-result'),'REJECTED — schema invalid','refuse');
        const head=n.split(' ')[0]; if(LEDGER_FORBIDDEN.test(head)||!LEDGER_OK.has(head)) return setPill($('led-import-result'),'REJECTED — forbidden/invalid status','refuse'); }
      const ul=$('dec-ledger'); ul.innerHTML=''; notes.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.appendChild(li); }); saveLedger();
      setPill($('led-import-result'),'IMPORTED '+notes.length+' (notes only)','live');
    }catch{ setPill($('led-import-result'),'REJECTED — not valid JSON','refuse'); }
  };
  rd.readAsText(file);
}

// ---- evidence viewer compare (two local summaries) ----
let lastEvidenceObj=null, capA=null, capB=null;
function captureEvidence(slot){ if(!lastEvidenceObj){ $('viewer-compare').textContent='Load latest sealed evidence first, then capture.'; return; } if(slot==='A') capA=lastEvidenceObj; else capB=lastEvidenceObj; $('viewer-compare').textContent='Captured '+slot+'. '+(capA&&capB?'Ready to compare.':'Capture the other slot to compare.'); }
function compareAB(){
  if(!capA||!capB){ $('viewer-compare').textContent='Capture both A and B first (Load latest, Capture as A; run/export again, Load latest, Capture as B).'; return; }
  const keys=['kind','aggregate_conclusion','pass','total','refused','decision_ceiling','limitations','not_proven','zip_verified'];
  const rows=keys.map(k=>{ const a=capA[k], bv=capB[k]; const same=String(a)===String(bv); return `<tr><td>${esc(k)}</td><td>${esc(String(a??'—'))}</td><td>${esc(String(bv??'—'))}</td><td>${same?'same':'DIFF'}</td></tr>`; });
  $('viewer-compare').innerHTML='<table class="tbl"><thead><tr><th>field</th><th>A</th><th>B</th><th></th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
}

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
  // batch runner (scenarios + per-fixture) + aggregated export
  $('batch-run-btn').addEventListener('click', doBatch);
  $('batch-export-btn').addEventListener('click', doBatchExport);
  // synthetic scenario runner
  $('scn-run-btn').addEventListener('click', doScenario);
  $('scn-sel').addEventListener('change', ()=> setPill($('scn-result'),'—',''));
  // Wave 9: Idea Builder panel
  $('idea-classify-btn').addEventListener('click', doIdeaClassify);
  $('idea-load-btn').addEventListener('click', doIdeaLoad);
  $('idea-input').addEventListener('input', doIdeaClassify);
  // Wave 8: Real Repo Proof panel
  $('realrepo-btn').addEventListener('click', doRealRepo);
  // Local App Factory Proof panel
  $('factory-load-btn')?.addEventListener('click', doFactory);
  // Wave 7: Doctor, Live-Gate Simulator, local rehearsal
  $('doctor-btn').addEventListener('click', doDoctor);
  $('rehearsal-btn').addEventListener('click', doRehearsal);
  renderLiveGates();
  // evidence viewer / replay + compare
  $('viewer-load-btn').addEventListener('click', doViewer);
  $('viewer-capA-btn').addEventListener('click', ()=> captureEvidence('A'));
  $('viewer-capB-btn').addEventListener('click', ()=> captureEvidence('B'));
  $('viewer-compare-btn').addEventListener('click', compareAB);
  // local decision ledger (safe local statuses only) + persistence + export/import
  [['led-continue','CONTINUE_DEMO'],['led-hold','HOLD'],['led-repair','REPAIR'],['led-stop','STOP']]
    .forEach(([id,st]) => $(id).addEventListener('click', ()=> addLedger(st)));
  $('led-clear-btn').addEventListener('click', clearLedger);
  $('led-export-btn').addEventListener('click', exportLedger);
  $('led-import-btn').addEventListener('click', ()=> $('led-import-file').click());
  $('led-import-file').addEventListener('change', e=>{ if(e.target.files[0]) importLedger(e.target.files[0]); });
  // run history persistence + export/import
  $('hist-clear-btn').addEventListener('click', clearHistory);
  $('hist-export-btn').addEventListener('click', exportHistory);
  $('hist-import-btn').addEventListener('click', ()=> $('hist-import-file').click());
  $('hist-import-file').addEventListener('change', e=>{ if(e.target.files[0]) importHistory(e.target.files[0]); });
  // synthetic protected-files enforcement demo + policies + export
  $('pf-check-btn').addEventListener('click', pfCheck);
  $('pf-batch-btn').addEventListener('click', pfBatch);
  $('pf-export-btn').addEventListener('click', pfExport);
  $('pf-policy').addEventListener('change', ()=>{ pfCheck(); pfBatch(); });
  $('pf-input').addEventListener('input', pfCheck);
  loadHistory(); loadLedger(); renderHistory(); pfCheck();
  setInterval(async ()=>{ if(!running) applyHealth(await health()); }, 4000);
});
