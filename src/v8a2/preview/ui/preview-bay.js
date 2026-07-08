// FounderGate V8-A2 — Preview Bay frontend (vanilla ES module).
//
// Drives the SAFE preview controller via the server API and renders the embedded,
// SANDBOXED preview with always-on labels. It never shows a blank screen or a
// fabricated success: a failed start shows a plain-English C7 message; an unknown
// state shows UNKNOWN.

const $ = (id) => document.getElementById(id);
const LABEL_KEYS = ["environment", "data", "sends", "payments", "build", "release_label", "data_classification", "proof_recording"];

function renderLabels(labels) {
  const bar = $("labelbar");
  bar.innerHTML = "";
  for (const k of LABEL_KEYS) {
    const v = labels && labels[k] != null ? labels[k] : "UNKNOWN";
    const el = document.createElement("span");
    el.className = "lbl" + (k === "sends" && v === "off" ? " good" : "") + (v === "live" ? " warn" : "");
    el.dataset.label = k;
    el.innerHTML = `${k.replace(/_/g, " ")}: <b>${v}</b>`;
    bar.appendChild(el);
  }
}

function render(state) {
  const chip = $("status-chip");
  const running = state.status === "running";
  chip.textContent = state.status === "running" ? "running" : state.status === "stopped" ? "stopped" : "UNKNOWN";
  chip.className = "chip " + (running ? "on" : "off");
  renderLabels(state.labels);

  const frame = $("preview-frame"), empty = $("empty"), failure = $("failure");
  failure.hidden = true; frame.hidden = true; empty.hidden = true;

  if (state.failure && state.failure.failed) {
    failure.hidden = false;
    failure.innerHTML = `<h3>The preview could not start</h3><p>${state.failure.what}</p><p class="hint">Next: ${state.failure.next_action}</p>`;
    return;
  }
  if (running && state.url) {
    frame.hidden = false;
    // sandboxed, cross-origin loopback preview — isolated from this page
    if (frame.getAttribute("src") !== state.url) frame.setAttribute("src", state.url);
  } else {
    empty.hidden = false;
  }
}

async function api(path, method = "GET") {
  const res = await fetch(path, { method });
  return await res.json();
}

async function refreshStatus() { render(await api("/api/preview/status")); }

document.querySelectorAll(".controls .btn[data-action]").forEach((b) => {
  b.addEventListener("click", async () => {
    const action = b.dataset.action;
    const state = await api(`/api/preview/${action}`, "POST");
    render(state);
    document.body.dataset.lastAction = action;
  });
});

$("fullscreen").addEventListener("click", () => {
  const f = $("preview-frame");
  if (!f.hidden && f.requestFullscreen) f.requestFullscreen().catch(() => {});
});

$("pause-button").addEventListener("click", async () => {
  const s = await api("/api/preview/status");
  const running = s.status === "running";
  $("pause-scope").textContent = running
    ? "We asked the running preview to pause and saved your evidence. It can pause the preview server."
    : "Nothing was running, so nothing needed stopping. Your evidence is safe.";
  $("pause-button").textContent = "✓ Paused — help is on the way";
});

// Report Problem (Bug Collector)
$("report").addEventListener("click", () => { $("report-form").hidden = false; });
$("bug-cancel").addEventListener("click", () => { $("report-form").hidden = true; });
$("bug-send").addEventListener("click", async () => {
  const note = $("bug-note").value;
  const res = await fetch("/api/bug/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ note, view: "preview-bay", screenshot_captured: true }),
  }).then((r) => r.json());
  $("bug-result").textContent = res.stored
    ? `Thanks — your report was saved as evidence (${res.packet.id}, class ${res.packet.data_classification}).`
    : `Could not save: ${res.error}`;
  document.body.dataset.bugStored = res.stored ? "true" : "false";
});

refreshStatus().then(() => { document.body.dataset.rendered = "true"; });
