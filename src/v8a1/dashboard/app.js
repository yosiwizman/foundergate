// FounderGate V8-A1 — Truth Dashboard frontend (vanilla ES module, app shell).
//
// Fetches the reader's honest model and renders it with the SAME pure view-model
// the Node self-test proves. UNKNOWN/STALE render verbatim (Law 54), explained
// gently. Copy is warm and calm; the pause control is small and never scary.

import { buildView } from "./view-model.mjs";

const $ = (id) => document.getElementById(id);
function badgeEl(b) {
  const s = document.createElement("span");
  s.className = `badge ${b.kind || "info"}`;
  s.textContent = b.text;
  return s;
}

function render(view) {
  // Sidebar
  $("brand").textContent = view.nav.brand;
  const na = $("nav-active");
  na.innerHTML = "";
  view.nav.active.forEach((n, i) => {
    const a = document.createElement("a");
    a.className = "item" + (i === 0 ? " active" : "");
    a.textContent = n.label;
    a.setAttribute("data-nav", n.id);
    na.appendChild(a);
  });
  const nd = $("nav-disabled");
  nd.innerHTML = "";
  view.nav.disabled.forEach((n) => {
    const span = document.createElement("span");
    span.className = "item";
    span.setAttribute("data-nav-disabled", n.id);
    span.innerHTML = `<span>${n.label}</span>`;
    const stage = document.createElement("span");
    stage.className = "stage";
    stage.setAttribute("data-stage", "");
    stage.textContent = n.stage;
    span.appendChild(stage);
    nd.appendChild(span);
  });

  // Welcome header
  $("greeting").textContent = view.header.greeting;
  $("stage-banner").textContent = view.header.stageBanner;
  $("project-chip").textContent = view.project.name + (view.project.needsAttention ? " · needs a look" : "");
  $("release-chip").textContent = "release: " + view.header.releaseLabel;
  $("dataclass-chip").textContent = view.header.dataChip;
  const cc = $("connected-chip");
  cc.textContent = view.header.connected ? "connected" : "not connected";
  cc.className = "chip " + (view.header.connected ? "on" : "off");

  // Questions (D1: answer-first cards — a colour-coded status chip you can read at
  // a glance, the question as a small label, the full answer as secondary detail).
  // Each card is a distinct labelled element (role/aria-label + data-answer) so the
  // scan-budget guard can prove all 8 answers are individually scannable.
  $("questions-title").textContent = view.questions.title;
  const ql = $("questions-list");
  ql.innerHTML = "";
  for (const item of view.questions.items) {
    const li = document.createElement("li");
    li.className = "qcard";
    li.setAttribute("data-q", String(item.n));
    li.setAttribute("role", "group");
    li.setAttribute("aria-label", `${item.q} ${item.chip.label}`);

    const chip = document.createElement("div");
    chip.className = `qchip ${item.chip.tone}`;
    chip.setAttribute("data-answer", String(item.n)); // the at-a-glance answer element
    chip.textContent = item.chip.label;

    const label = document.createElement("div");
    label.className = "qlabel";
    label.innerHTML = `<span class="n">${item.n}</span>${item.q}`;

    const detail = document.createElement("div");
    detail.className = "qdetail" + (item.unknown ? " unknown" : "");
    detail.textContent = item.unknown ? `${item.a} — we can't see this yet` : item.a;

    li.append(chip, label, detail);
    ql.appendChild(li);
  }

  // Status card (tokens verbatim; plain companions added)
  $("status-title").textContent = view.statusCard.title;
  $("state-badge").replaceWith(Object.assign(badgeEl({ text: view.statusCard.state, kind: view.statusCard.state === "blocked" ? "bad" : "info" }), { id: "state-badge", className: `badge ${view.statusCard.state === "blocked" ? "bad" : "info"}` }));
  $("state-plain").textContent = view.statusCard.statePlain;
  $("ci-label").textContent = view.statusCard.ciLabel + ":";
  $("ci-badge").replaceWith(Object.assign(badgeEl(view.statusCard.ci), { id: "ci-badge", className: `badge ${view.statusCard.ci.kind}` }));
  $("ci-hint").textContent = view.statusCard.ci.hint || "";
  $("pr-display").textContent = view.statusCard.prDisplay;
  $("pr-badge").replaceWith(Object.assign(badgeEl(view.statusCard.pr), { id: "pr-badge", className: `badge ${view.statusCard.pr.kind}` }));
  $("current-gate").textContent = view.statusCard.currentGate;
  $("current-gate-plain").textContent = view.statusCard.currentGatePlain;

  // Needs-you
  $("needs-you-title").textContent = view.needsYou.title;
  $("needs-you-text").textContent = view.needsYou.unknown ? `${view.needsYou.text} — we can't see this yet` : view.needsYou.text;
  $("needs-you-source").textContent = "from: " + view.needsYou.source;

  // Do-not-touch
  $("dnt-title").textContent = view.doNotTouch.title;
  $("dnt-subtitle").textContent = view.doNotTouch.subtitle;
  const dl = $("do-not-touch-list");
  dl.innerHTML = "";
  for (const d of view.doNotTouch.items) {
    const li = document.createElement("li");
    li.innerHTML = `<b>${d.path}</b> — ${d.reason}`;
    dl.appendChild(li);
  }
  if (view.doNotTouch.items.length === 0) dl.innerHTML = "<li class='hint'>Nothing to worry about right now.</li>";

  // Decision Needed card (view-only, Law 55 — no approve buttons)
  $("decision-title").textContent = view.decision.title;
  $("decision-subtitle").textContent = view.decision.subtitle;
  $("decision-viewonly").textContent = view.decision.viewOnlyNote;
  const gl = $("gates-list");
  gl.innerHTML = "";
  for (const g of view.decision.items) {
    const li = document.createElement("li");
    li.innerHTML = `<b>${g.title}</b> `;
    li.appendChild(badgeEl({ text: g.state, kind: "unknown" }));
    const t = document.createElement("span");
    t.className = "tag";
    t.textContent = "review only";
    li.appendChild(t);
    gl.appendChild(li);
  }
  if (view.decision.items.length === 0) gl.innerHTML = "<li class='hint'>Nothing needs your decision right now.</li>";

  // Evidence
  const el = $("evidence-list");
  el.innerHTML = "";
  for (const e of view.evidence) {
    const li = document.createElement("li");
    li.textContent = e.path + " ";
    li.appendChild(badgeEl(e.badge));
    el.appendChild(li);
  }
  if (view.evidence.length === 0) el.innerHTML = "<li class='hint'>No evidence yet — we can't see this yet.</li>";

  // Health check (Doctor)
  $("doctor-title").textContent = view.doctor.title;
  $("doctor-version").textContent = `${view.doctor.version} (${view.doctor.versionPlain})`;
  $("doctor-present").textContent = view.doctor.filesPresent;
  const dc = $("doctor-checks");
  dc.innerHTML = "";
  for (const c of view.doctor.checks) {
    const li = document.createElement("li");
    li.textContent = c.name + " ";
    li.appendChild(badgeEl({ text: c.ok ? "found" : "not found", kind: c.ok ? "ok" : "unknown" }));
    dc.appendChild(li);
  }

  // Spending
  $("cost-title").textContent = view.cost.title;
  $("cost-friendly").textContent = view.cost.friendly;
  $("cost-detail").textContent =
    view.cost.enforcement === "UNKNOWN"
      ? "We can't see a budget yet."
      : `Shown limit: $${view.cost.monthly_limit_usd} / month · paid services blocked: ${view.cost.paid_services_blocked}`;

  // Data safety
  $("dc-title").textContent = view.dataBadges.title;
  $("dc-projectclass").replaceWith(Object.assign(badgeEl({ text: view.dataBadges.projectClass, kind: "info" }), { id: "dc-projectclass", className: "badge info" }));
  $("dc-note").textContent = view.dataBadges.note;

  // Pause control (calm, always visible)
  const btn = $("pause-button");
  btn.textContent = "⏸ " + view.pause.button;
  const scope = $("pause-scope");
  scope.textContent = view.pause.scope;
  btn.addEventListener("click", () => {
    scope.hidden = false;
    btn.textContent = "✓ Paused — help is on the way";
  });

  // Good things to remember (failure modes, verbatim)
  $("fm-title").textContent = view.failureModes.title;
  const fl = $("failure-modes-list");
  fl.innerHTML = "";
  for (const line of view.failureModes.lines) {
    const li = document.createElement("li");
    li.textContent = line;
    fl.appendChild(li);
  }

  document.body.dataset.rendered = "true";
}

async function main() {
  try {
    const res = await fetch("/api/model");
    render(buildView(await res.json()));
  } catch (e) {
    document.body.innerHTML = `<pre style="padding:22px">Could not load: ${e && e.message}</pre>`;
  }
}
main();
