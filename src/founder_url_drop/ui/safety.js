"use strict";
const $ = (id) => document.getElementById(id);
const FIXTURE = "https://github.com/pypa/sampleproject";
const STAGES = ["validating URL","resolving exact commit","acquiring immutable snapshot","validating archive",
  "fingerprinting snapshot","creating disposable sandbox","running harness-owned compileability check",
  "exporting evidence","removing temporary snapshot","destroying disposable runtime","generating Evidence Pack","complete"];
let poll = null, currentRun = null;

const fe = (v) => (v === undefined || v === null || v === "") ? "UNKNOWN" : v;
function plain(state){
  // founder language for the technical facts, honest UNKNOWN if missing
  $("s-egress").textContent = state?.egress_example_com === "DENIED" ? "Internet access was blocked during the check." : "Internet access during the check: UNKNOWN";
  $("s-port").textContent = state?.port_binding_guard === "GUARD_PASS" ? "Internal ports were not publicly exposed." : "Internal port exposure: UNKNOWN";
  $("s-socket").textContent = state?.docker_socket === "ABSENT" ? "The check had no access to Docker controls." : "Docker control access: UNKNOWN";
}

function renderTimeline(stages){
  const tl = $("timeline"); tl.innerHTML = "";
  const byName = {}; for (const e of stages) byName[e.name] = e.status;
  for (const name of STAGES){
    const st = byName[name];
    const li = document.createElement("li");
    li.className = "stage-run" + (st === "DONE" ? " done" : st === "RUNNING" ? " running" : st === "FAILED" ? " failed" : "");
    li.innerHTML = '<span class="dot"></span><span>'+name+(st?" · "+st:"")+'</span>';
    tl.appendChild(li);
  }
  const last = stages[stages.length-1];
  $("stage").textContent = last ? ("Current stage: " + last.name + " (" + last.status + ")") : "";
}

async function tick(runId){
  let r; try { r = await (await fetch("/api/runs/"+runId)).json(); } catch { return; }
  if (r.error) return;
  renderTimeline(r.stages || []);
  $("run-repo").textContent = r.repository_url || FIXTURE;
  if (r.status === "RUNNING"){ $("run-status").textContent = "In progress… results are hidden until evidence is produced."; $("run-status").className = "pending"; return; }
  clearInterval(poll); poll = null;
  if (r.status === "FAILED"){ $("run-status").textContent = "This check FAILED — no success is shown."; $("run-status").className = "stage-run failed"; return; }
  // COMPLETION INVARIANT (FFS-1): a finished run with an unverified Evidence Pack is NOT acceptable.
  if (r.witness_state === "COMPLETE_PACK_FAILED"){
    $("run-status").textContent = r.pack_message || "The safety check finished, but its Evidence Pack was not produced. This run cannot be accepted.";
    $("run-status").className = "stage-run failed";
    $("result-grid").hidden = true; $("finish-grid").hidden = true;
    const a = $("pack-dl"); if (a) a.hidden = true;
    return;
  }
  // COMPLETE_WITH_VERIFIED_EVIDENCE_PACK — reveal result bound to this run
  $("run-status").textContent = "Complete."; $("run-status").className = "";
  const s = r.result || {};
  $("result-grid").hidden = false; $("finish-grid").hidden = false;
  $("r-repo").textContent = s.fixture_url || FIXTURE;
  $("commit").textContent = "commit " + fe(s.exact_commit);
  $("run-when").textContent = "run " + runId;
  plain(s);
  const green = s.classification === "COMPILEABILITY_OBSERVED" && s.compileall_exit === 0;
  $("result").textContent = green ? "Source parsing observed" : fe(s.classification);
  $("badge-compile").style.opacity = green ? "1" : "0.4";
  // cleanup only when teardown complete
  $("c-teardown").textContent = r.teardown_complete ? ("Temporary sandbox removed (session gone: " + fe(s.teardown_get_status) + ")") : "Temporary sandbox removal: pending";
  $("c-vm").textContent = s.vm_destroyed ? "Disposable machine destroyed." : "Disposable machine destruction: UNKNOWN";
  // evidence pack only when complete + teardown + pack VERIFIED
  if (r.evidence_pack_ready && r.evidence_pack_verified && r.teardown_complete){ $("pack-status").textContent = "AVAILABLE."; const a = $("pack-dl"); a.hidden = false; a.href = "/api/runs/"+runId+"/evidence-pack"; }
  else { $("pack-status").textContent = "Evidence Pack: UNKNOWN (produced only after runtime + cleanup complete)"; }
  try { $("evidence-json").textContent = JSON.stringify(r.result, null, 2); } catch {}
}

async function runCheck(){
  $("refusal").hidden = true;
  const url = ($("url").value || "").trim();
  let c; try { c = await (await fetch("/api/check", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ url }) })).json(); } catch { return; }
  if (c.kind === "REFUSED"){ $("refusal").textContent = "Refused: " + c.reason; $("refusal").hidden = false; return; }
  if (c.kind === "HELD"){ $("refusal").textContent = c.reason; $("refusal").hidden = false; return; }
  if (c.kind !== "STARTED"){ $("refusal").textContent = "Could not start."; $("refusal").hidden = false; return; }
  // a real run was created — show run panel bound to run_id; hide neutral; keep results hidden until complete
  currentRun = c.run_id;
  $("neutral-card").hidden = true; $("run-card").hidden = false; $("result-grid").hidden = true; $("finish-grid").hidden = true;
  $("run-id").textContent = c.run_id; $("run-repo").textContent = FIXTURE; $("run-status").textContent = "Starting…";
  if (poll) clearInterval(poll);
  poll = setInterval(() => tick(c.run_id), 1500);
  tick(c.run_id);
}

$("fixture-btn").addEventListener("click", () => { $("url").value = FIXTURE; $("url").focus(); });
$("run").addEventListener("click", runCheck);
$("url").addEventListener("keydown", (e) => { if (e.key === "Enter") runCheck(); });
$("pause").addEventListener("click", async () => { if (currentRun) { try { await fetch("/api/runs/"+currentRun+"/pause-request", {method:"POST"}); } catch {} } $("help-modal").hidden = false; $("help-close").focus(); });
$("help-close").addEventListener("click", () => { $("help-modal").hidden = true; $("pause").focus(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("help-modal").hidden = true; });
// Open an EXISTING run (recovery/replay view) when ?run=<id> is present — no new check is started.
(function openExistingRun(){
  const m = /[?&]run=([a-z0-9-]+)/.exec(location.search);
  if (!m) return; // NEUTRAL on load — no results fetched, nothing green
  const id = m[1]; currentRun = id;
  $("neutral-card").hidden = true; $("run-card").hidden = false;
  $("result-grid").hidden = true; $("finish-grid").hidden = true;
  $("run-id").textContent = id; $("run-status").textContent = "Loading existing run…";
  tick(id);
})();
