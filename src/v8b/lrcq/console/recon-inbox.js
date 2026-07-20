"use strict";
// Pure renderer of a Reconciliation Inbox view. Never auto-retries; renders HELD honestly.
const $ = (id) => document.getElementById(id);
const chipKind = (c) => /RESULT_COMPLETE|SAFE_TO_RESUME/.test(c) ? "observed" : /ACTIVE_PROCESS_FOUND/.test(c) ? "running" : /HELD|EXTERNAL_EFFECT_UNKNOWN|NEEDS_RECONCILIATION/.test(c) ? "held" : "unknown";
function td(text, cls) { const el = document.createElement("td"); if (cls) el.className = cls; el.textContent = text; return el; }
function render(v) {
  $("run-id").textContent = v.run_id;
  if (v.pending_count > 0) { $("founder-banner").hidden = false; $("pending-count").textContent = v.pending_count; }
  const sl = $("statements");
  for (const s of v.statements || []) { const li = document.createElement("li"); li.textContent = s; sl.appendChild(li); }
  const body = $("inbox-body");
  for (const e of v.entries || []) {
    const tr = document.createElement("tr");
    tr.appendChild(td(e.job_id));
    tr.appendChild(td(e.transaction_id, "mono"));
    tr.appendChild(td(e.dispatch_state));
    tr.appendChild(td(e.process_state));
    tr.appendChild(td(e.result_state));
    const c = td(e.reconciliation_classification); const chip = document.createElement("span"); chip.className = "chip chip-" + chipKind(e.reconciliation_classification); chip.textContent = e.reconciliation_classification; c.textContent = ""; c.appendChild(chip); tr.appendChild(c);
    tr.appendChild(td(e.recommendation));
    tr.appendChild(td(e.founder_action_required ? "REQUIRED" : "no", e.founder_action_required ? "req" : ""));
    body.appendChild(tr);
  }
}
fetch("./fixtures/recon-inbox.view.json").then((r) => r.json()).then(render).catch((e) => { $("inbox-h").textContent = "Reconciliation Inbox — load failed: " + e.message; });
