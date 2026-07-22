"use strict";
// Pure renderer of the 10 LRCQ run-state views. Honest chips; held states are labelled stale;
// no fabricated completion; never renders "merged"/"accepted".
const $ = (id) => document.getElementById(id);
function render(v) {
  $("run-id").textContent = v.run_id;
  if (v.founder_action_count > 0) { $("founder-banner").hidden = false; $("fa-count").textContent = v.founder_action_count; }
  const sl = $("statements");
  for (const s of v.statements || []) { const li = document.createElement("li"); li.textContent = s; sl.appendChild(li); }
  const list = $("state-list");
  for (const st of v.states || []) {
    const li = document.createElement("li");
    li.className = "state-item tone-" + st.tone;
    li.tabIndex = 0; // keyboard-focusable
    const h = document.createElement("h3"); h.textContent = st.title;
    const chip = document.createElement("span"); chip.className = "chip chip-" + (st.tone === "held" ? "held" : st.tone === "stopped" ? "stopped" : st.tone === "warn" ? "warn" : st.tone === "running" ? "running" : "observed"); chip.textContent = st.chip;
    h.appendChild(document.createTextNode(" ")); h.appendChild(chip);
    if (st.stale) { const s = document.createElement("span"); s.className = "stale"; s.textContent = "stale — awaiting reconciliation"; h.appendChild(document.createTextNode(" ")); h.appendChild(s); }
    if (st.founder_action) { const f = document.createElement("span"); f.className = "req"; f.setAttribute("role", "note"); f.textContent = "founder action required"; h.appendChild(document.createTextNode(" ")); h.appendChild(f); }
    const p = document.createElement("p"); p.className = "small"; p.textContent = st.detail;
    li.appendChild(h); li.appendChild(p); list.appendChild(li);
  }
}
fetch("./fixtures/run-states.view.json").then((r) => r.json()).then(render).catch((e) => { $("states-h").textContent = "Run states — load failed: " + e.message; });
