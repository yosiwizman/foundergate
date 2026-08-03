// FounderGate Safety Check — static owner report viewer (LOCAL, zero-dep, no network beyond loading
// the local sample JSON). Renders a synthetic sample evidence packet as an owner-readable report.
const SOURCES = { safe: '../safe.sample.json', risky: '../risky.sample.json', blocked: '../blocked.sample.json' };
// embedded safe fallback (if fetch is blocked) so the page never fakes / never blanks
const FALLBACK = { packet_version:'v1', sample:true, task_intent:'(offline fallback)', agent_identity:'FounderGate local Safety Check',
  source_snapshot:{kind:'local',self_owned:true,contains_customer_or_production_data:false}, files_touched:['(read-only)'], protected_files:['(none)'],
  sensitivity_ruling:{ruling:'SAFE_LOCAL_SYNTHETIC'}, checks:['(fallback)'], risk_findings:['(fallback)'], checker_verdict:'PASS_WITH_LIMITS',
  owner_gate:{decision:'CONTINUE_LOCAL_ONLY',never_ship:true}, next_safe_action:'Continue local demo use.', limitations:['Local evidence only; not production.'], blocked_actions:['deploy','billing'] };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const li = (arr) => (arr && arr.length ? '<ul>'+arr.map(x=>`<li>${esc(typeof x==='string'?x:JSON.stringify(x))}</li>`).join('')+'</ul>' : '<div class="kv">(none)</div>');

function verdictClass(v){ if(v==='PASS_WITH_LIMITS') return 'pass'; if(v==='REFUSED') return 'refused'; return 'hold'; }
function ownerActionText(d){ return ({CONTINUE_LOCAL_ONLY:'Continue — local only. Do not deploy or use real data.',
  REPAIR_BEFORE_SHOWING:'Repair first — do not present this as verified until fixed.',
  STOP_NEEDS_FOUNDER_GATE:'Stop — a real-world action was requested and is blocked; needs a founder gate.',
  EXPERT_REVIEW:'Get an expert/developer review before proceeding.'})[d] || d; }

function render(p){
  const developerReview = (p.checker_verdict!=='PASS_WITH_LIMITS');
  $('report').innerHTML = `
  <div class="card"><h2>Verdict</h2>
    <span class="verdict ${verdictClass(p.checker_verdict)}" data-testid="verdict">${esc(p.checker_verdict)}</span>
    <div class="kv" style="margin-top:8px">Owner decision: <b data-testid="owner-decision">${esc(p.owner_gate.decision)}</b> · never SHIP</div></div>
  <div class="card"><h2>What was checked</h2>${li(p.checks)}
    <div class="kv" style="margin-top:8px">Source: ${esc(p.source_snapshot.kind)} · self-owned · no customer/production data</div>
    <div class="kv">Intent: ${esc(p.task_intent)}</div></div>
  <div class="card"><h2>Dangerous areas / risks</h2>${li(p.risk_findings)}</div>
  <div class="card"><h2>Owner action needed</h2><div class="kv" data-testid="owner-action">${esc(ownerActionText(p.owner_gate.decision))}</div>
    <div class="kv" style="margin-top:6px">Developer review needed: <b>${developerReview?'YES':'no'}</b></div></div>
  <div class="card"><h2>Evidence summary</h2>${li((p.checks||[]).concat(p.build_identity?['build: '+p.build_identity]:[]))}</div>
  <div class="card"><h2>Files touched</h2>${li(p.files_touched)}<h2 style="margin-top:12px">Protected files</h2>${li(p.protected_files)}</div>
  <div class="card"><h2>Next safe action</h2><div class="kv" data-testid="next-safe-action">${esc(p.next_safe_action)}</div></div>
  <div class="card"><h2>What is NOT proven</h2>${li(p.limitations)}
    <div style="margin-top:8px">${(p.blocked_actions||[]).map(a=>`<span class="pill">blocked: ${esc(a)}</span>`).join('')}</div></div>`;
}

async function load(name){
  let p;
  try { const r = await fetch(SOURCES[name]); p = await r.json(); } catch { p = FALLBACK; }
  render(p);
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on', x===t));
  load(t.dataset.sample);
}));
load('safe');
