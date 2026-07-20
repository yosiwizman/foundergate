"use strict";
// Pure renderer of the founder-readable assurance case. Renders only a validated case; shows the
// held gate + honest limitations; never renders an unsupported claim as green completion.
const $ = (id) => document.getElementById(id);
function render(v) {
  $("cand").textContent = (v.candidate && v.candidate.sha) || "—";
  if (v.gate_state && /HELD/.test(v.gate_state)) { $("gate-banner").hidden = false; $("gate-text").textContent = v.gate_state + " — checker " + v.checker + ", machine-verified " + v.machine_verified; }
  const s = $("summary");
  for (const [k, val] of [["checker", v.checker], ["machine_verified", String(v.machine_verified)], ["recovery_state", v.recovery_state]]) {
    const li = document.createElement("li"); li.textContent = k + ": " + val; s.appendChild(li);
  }
  const body = $("claims-body");
  for (const c of v.claims || []) {
    const tr = document.createElement("tr");
    for (const t of [c.statement, c.supported_by, c.asserts]) { const td = document.createElement("td"); td.textContent = t; tr.appendChild(td); }
    body.appendChild(tr);
  }
  const l = $("limitations");
  for (const lim of v.unresolved_limitations || []) { const li = document.createElement("li"); li.textContent = lim; l.appendChild(li); }
}
fetch("./fixtures/assurance-case.view.json").then((r) => r.json()).then((v) => { if (v.valid) render(v); else $("sum-h").textContent = "Assurance case INVALID — not rendered"; }).catch((e) => { $("sum-h").textContent = "load failed: " + e.message; });
