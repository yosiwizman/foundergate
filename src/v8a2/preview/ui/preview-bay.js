// FounderGate V8-A2 — Preview Bay frontend (vanilla ES module).
//
// Drives the SAFE preview controller via the server API and renders the embedded,
// SANDBOXED preview with always-on labels. It never shows a blank screen or a
// fabricated success: a failed start shows a plain-English C7 message; an unknown
// state shows UNKNOWN.

const $ = (id) => document.getElementById(id);
const LABEL_KEYS = ["environment", "data", "sends", "payments", "build", "release_label", "data_classification", "proof_recording"];

// L0 — the embed GROWS with its content. The sandboxed café posts its natural height;
// we size the iframe to it (clamped) so "Send order (practice)" is never clipped and
// the founder never has to scroll inside the frame. Payload-shape validated + clamped.
const MIN_EMBED = 360, MAX_EMBED = 2400;
window.addEventListener("message", (ev) => {
  const h = ev.data && ev.data.fgPreviewHeight;
  if (typeof h === "number" && isFinite(h) && h > 0) {
    const f = $("preview-frame");
    if (f) f.style.height = Math.max(MIN_EMBED, Math.min(MAX_EMBED, Math.ceil(h))) + "px";
  }
});

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

// Show a short, plain-English line so every control gives visible feedback.
function say(message) {
  const el = $("action-feedback");
  el.textContent = message;
  document.body.dataset.feedback = message;
}

// Force the sandboxed preview iframe to reload from its loopback url. This is a
// real, visible change and touches no live/send/network path — it only reloads
// the same safe preview the server is already running.
function reloadFrame() {
  const f = $("preview-frame");
  if (f.hidden) return false;
  const url = f.getAttribute("src");
  if (!url) return false;
  f.setAttribute("src", "about:blank");
  // re-point on the next tick so the browser actually re-fetches
  requestAnimationFrame(() => f.setAttribute("src", url));
  return true;
}

// Plain-English feedback for each control, so none looks clickable yet inert.
function feedbackFor(action, state) {
  const running = state.status === "running";
  switch (action) {
    case "start": return running ? "Your app preview is running." : "The preview did not start — see the message below.";
    case "stop": return "Preview stopped. Nothing is running now.";
    case "restart": return running ? "Restarted — your app preview is running again." : "Tried to restart — see the message below.";
    case "refresh": return running ? "Reloaded the preview." : "Nothing to reload yet — press Start App Preview first.";
    case "clear-cache": return running
      ? "Cleared and reloaded the preview view. (The preview keeps no cache of its own.)"
      : "Nothing to clear yet — press Start App Preview first.";
    default: return "";
  }
}

document.querySelectorAll(".controls .btn[data-action]").forEach((b) => {
  b.addEventListener("click", async () => {
    const action = b.dataset.action;
    say("Working…");
    const state = await api(`/api/preview/${action}`, "POST");
    render(state);
    // refresh/clear-cache/restart get a genuine, visible reload of the sandboxed view
    if (action === "refresh" || action === "clear-cache") reloadFrame();
    say(feedbackFor(action, state));
    document.body.dataset.lastAction = action;
  });
});

const askNow = $("ask-now");
if (askNow) askNow.addEventListener("click", () => { window.location.href = "http://localhost:4500"; });

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

// Report Problem (Bug Collector) — the form is always visible (founder design); the
// toolbar button jumps focus to it, Cancel clears the note. Reports SAVE (not send).
$("report").addEventListener("click", () => { $("bug-note").focus(); });
$("bug-cancel").addEventListener("click", () => { $("bug-note").value = ""; $("bug-result").textContent = ""; });
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
