// FounderGate V8-A1 — Truth Dashboard frontend (vanilla ES module).
//
// Fetches the reader's honest model from /api/model and renders every V8-A1
// screen using the SAME pure view-model the Node self-test proves. It renders
// UNKNOWN / STALE verbatim and never fabricates state.

import { buildView } from "./view-model.mjs";

const $ = (id) => document.getElementById(id);

function badgeEl(b) {
  const span = document.createElement("span");
  span.className = `badge ${b.kind || "info"}`;
  span.textContent = b.text;
  return span;
}

function render(view) {
  // Header (A11) + project meta (A12)
  $("title").textContent = view.header.title;
  const conn = $("connected");
  conn.textContent = view.header.connected ? "CONNECTED" : "NOT CONNECTED";
  conn.className = "pill " + (view.header.connected ? "on" : "off");
  $("stage-banner").textContent = view.header.stageBanner;
  $("project-name").textContent = view.header.projectName;
  $("release-badge").textContent = "release: " + view.header.releaseLabel;
  $("dataclass-badge").textContent = "data: " + view.header.dataClass;

  // A12 projects list
  const pl = $("projects-list");
  pl.innerHTML = "";
  for (const p of view.projects) {
    const li = document.createElement("li");
    li.textContent = p.name + (p.attention ? "  — needs attention" : "");
    pl.appendChild(li);
  }

  // A13/Law44 the 8 questions in order
  const ql = $("questions-list");
  ql.innerHTML = "";
  for (const q of view.questions) {
    const li = document.createElement("li");
    const qs = document.createElement("div");
    qs.className = "q";
    qs.textContent = q.q;
    const as = document.createElement("div");
    as.className = "a" + (q.unknown ? " unknown" : "");
    as.textContent = q.a;
    const src = document.createElement("div");
    src.className = "source";
    src.textContent = "source: " + q.source;
    li.append(qs, as, src);
    ql.appendChild(li);
  }

  // A14 status + A16 CI/PR UNKNOWN
  $("state-badge").replaceWith(Object.assign(badgeEl({ text: view.statusCard.state, kind: view.statusCard.state === "blocked" ? "bad" : "info" }), { id: "state-badge" }));
  $("ci-badge").replaceWith(Object.assign(badgeEl(view.statusCard.ci), { id: "ci-badge" }));
  $("pr-badge").replaceWith(Object.assign(badgeEl(view.statusCard.pr), { id: "pr-badge" }));
  $("current-gate").textContent = view.statusCard.currentGate;

  // A17 needs you
  $("needs-you-text").textContent = view.needsYou.text;
  $("needs-you-source").textContent = "source: " + view.needsYou.source;

  // A18 do not touch
  const dl = $("do-not-touch-list");
  dl.innerHTML = "";
  for (const d of view.doNotTouch.items) {
    const li = document.createElement("li");
    li.innerHTML = `<b>${d.path}</b> — ${d.reason}`;
    dl.appendChild(li);
  }

  // A15 gates view-only
  const gl = $("gates-list");
  gl.innerHTML = "";
  for (const g of view.gates) {
    const li = document.createElement("li");
    li.innerHTML = `<b>${g.title}</b> — <span class="badge unknown">${g.state}</span> <span class="tag">view-only, no approve button</span>`;
    gl.appendChild(li);
  }

  // A16 evidence FRESH/STALE
  const el = $("evidence-list");
  el.innerHTML = "";
  for (const e of view.evidence) {
    const li = document.createElement("li");
    li.innerHTML = `${e.path} `;
    li.appendChild(badgeEl({ text: e.label, kind: e.label === "STALE" ? "stale" : "ok" }));
    el.appendChild(li);
  }
  if (view.evidence.length === 0) el.innerHTML = "<li class='source'>No evidence recorded (UNKNOWN).</li>";

  // A20 doctor
  $("doctor-version").textContent = view.doctor.version;
  $("doctor-present").textContent = view.doctor.filesPresent;
  const dc = $("doctor-checks");
  dc.innerHTML = "";
  for (const c of view.doctor.checks) {
    const li = document.createElement("li");
    li.innerHTML = `${c.name} `;
    li.appendChild(badgeEl({ text: c.ok ? "present" : "MISSING", kind: c.ok ? "ok" : "unknown" }));
    dc.appendChild(li);
  }

  // A23 cost display only
  $("cost-label").textContent = view.cost.label;
  $("cost-detail").textContent =
    view.cost.enforcement === "UNKNOWN"
      ? "UNKNOWN"
      : `limit: $${view.cost.monthly_limit_usd ?? "?"} / month · paid services blocked: ${view.cost.paid_services_blocked}`;

  // A21 honest-scope Panic Card
  const btn = $("panic-button");
  const scope = $("panic-scope");
  scope.textContent = view.panic.scope;
  btn.addEventListener("click", () => {
    scope.hidden = false;
    btn.textContent = "Panic pressed — see scope below";
  });

  // A22 data classification badges
  $("dc-projectclass").replaceWith(Object.assign(badgeEl({ text: view.dataBadges.projectClass, kind: "info" }), { id: "dc-projectclass" }));
  $("dc-policy").textContent = `secret values hidden: ${view.dataBadges.hideSecretValues} · unknown files blocked: ${view.dataBadges.blockUnknownFiles}`;

  // A19 permanent failure-modes reminder
  const fl = $("failure-modes-list");
  fl.innerHTML = "";
  for (const line of view.failureModes) {
    const li = document.createElement("li");
    li.textContent = line;
    fl.appendChild(li);
  }

  document.body.dataset.rendered = "true";
}

async function main() {
  try {
    const res = await fetch("/api/model");
    const model = await res.json();
    render(buildView(model));
  } catch (e) {
    document.body.innerHTML = `<pre style="padding:22px">Failed to load model: ${e && e.message}</pre>`;
  }
}

main();
