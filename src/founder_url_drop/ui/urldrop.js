"use strict";
const $ = (id) => document.getElementById(id);
const FIXTURE = "https://github.com/pypa/sampleproject";
const qp = new URLSearchParams(location.search);
const scenario = qp.get("scenario"); // unknown|stale|failure for witness proofs

function setText(id, t){ const el=$(id); if(el) el.textContent = t; }

function render(state){
  setText("commit", state.exact_commit || "UNKNOWN");
  setText("fp-archive", "archive: " + (state.archive_sha256 || "UNKNOWN"));
  setText("fp-manifest", "manifest: " + (state.manifest_sha256 || "UNKNOWN"));
  setText("fp-files", "files: " + (state.manifest_file_count ?? "UNKNOWN"));
  setText("b-egress", "egress: " + (state.egress || "UNKNOWN"));
  setText("b-port", "port binding: " + (state.port_binding || "UNKNOWN"));
  setText("b-socket", "docker socket: " + (state.docker_socket || "UNKNOWN"));
  const r = state.result || "UNKNOWN";
  setText("result", r === "COMPILEABILITY_OBSERVED" ? "Source parsing observed" : r);
  // never show green unless the specific compileability fact holds AND run is fresh
  const green = r === "COMPILEABILITY_OBSERVED" && state.freshness === "FRESH" && state.compileall_exit === 0;
  $("badge-compile").style.opacity = green ? "1" : "0.4";
  setText("freshness", "freshness: " + (state.freshness || "UNKNOWN") + (state.scenario ? "  ·  " + state.scenario : ""));
  setText("deletion", "Temporary sandbox removed: " + (state.deletion || "UNKNOWN"));
  setText("vm", "Disposable machine destroyed: " + (state.vm_destruction || "UNKNOWN"));
}

async function loadState(){
  try{
    const s = await (await fetch("/api/state" + (scenario ? "?scenario="+scenario : ""))).json();
    render(s);
  }catch{ render({}); }
  try{
    const e = await (await fetch("/api/evidence")).json();
    $("evidence-json").textContent = JSON.stringify(e, null, 2);
  }catch{ $("evidence-json").textContent = "UNKNOWN"; }
}

async function runCheck(){
  $("refusal").hidden = true;
  const url = ($("url").value || "").trim();
  const c = await (await fetch("/api/check?url=" + encodeURIComponent(url) + (scenario ? "&scenario="+scenario : ""))).json();
  if (c.kind === "REFUSED"){ $("refusal").textContent = "Refused: " + c.reason; $("refusal").hidden = false; return; }
  if (c.kind === "HELD"){ $("refusal").textContent = c.reason; $("refusal").hidden = false; return; }
  // FIXTURE — animate the real stages, then reveal real evidence
  $("progress-card").hidden = false;
  const tl = $("timeline"); tl.innerHTML = "";
  const stages = c.state.stages || [];
  for (let i=0;i<stages.length;i++){
    const li = document.createElement("li");
    li.innerHTML = '<span class="dot"></span><span>'+stages[i]+'</span>';
    tl.appendChild(li);
  }
  const items = [...tl.children];
  for (let i=0;i<items.length;i++){
    await new Promise(r=>setTimeout(r, 140));
    items[i].classList.add("done");
    $("stage").textContent = "Current stage: " + stages[i];
  }
  $("stage").textContent = "Done — showing recorded evidence for the fixed evaluation fixture.";
  render(c.state);
}

$("fixture-btn").addEventListener("click", ()=>{ $("url").value = FIXTURE; $("url").focus(); });
$("run").addEventListener("click", runCheck);
$("url").addEventListener("keydown", (e)=>{ if(e.key==="Enter") runCheck(); });
$("pause").addEventListener("click", ()=>{ $("help-modal").hidden=false; $("help-close").focus(); });
$("help-close").addEventListener("click", ()=>{ $("help-modal").hidden=true; $("pause").focus(); });
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") $("help-modal").hidden=true; });
loadState();
