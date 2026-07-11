// FounderGate V8-A1 — Truth Dashboard frontend (VA-REPAIR-3: identity-first,
// three-layer progressive disclosure).
//
// Design authority: Apple HIG (clarity/deference/depth), 5-second rule, ≤5–9
// metrics, summary→context→detail layering, F-pattern priority, semantic status
// colour, 8pt grid, 44px targets. LAYER 1 (above the fold) answers "what is this /
// what should I do" at a glance; LAYER 2 is context; LAYER 3 is collapsed detail.
// Every friendly sentence is a template over the reader's honest model (Law 54);
// the decision affordance is view-only (Law 55); pause keeps honest scope.

import { buildView } from "./view-model.mjs";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function markAnswer(node, key, label) { node.setAttribute("data-answer", key); node.setAttribute("role", "group"); node.setAttribute("aria-label", label); return node; }
function wireDisabled(node, stage) { node.classList.add("disabled"); node.setAttribute("aria-disabled", "true"); const s = el("span", "stage", stage); s.setAttribute("data-stage", ""); node.appendChild(s); node.setAttribute("data-nav-disabled", "1"); }

function render(view) {
  const h = view.home;
  $("brand").textContent = view.nav.brand;

  // Sidebar
  const nav = $("home-nav"); nav.innerHTML = "";
  for (const n of h.nav) {
    const item = n.href ? el("a", "item" + (n.active ? " active" : "")) : el("span", "item");
    if (n.href) item.href = n.href;
    item.setAttribute("data-nav", n.label.toLowerCase().replace(/\s+/g, "-"));
    item.append(el("span", "nav-ico", n.icon), el("span", "nav-lab", n.label));
    if (n.viewOnly) item.append(el("span", "tag", "view only"));
    if (n.stage) wireDisabled(item, n.stage);
    nav.appendChild(item);
  }
  $("robot-line").textContent = h.robot.line;
  const rb = $("robot-btn"); rb.textContent = h.robot.button; rb.href = h.robot.href;
  $("demo-pill").textContent = h.demo;

  // R1 — IDENTITY (name + description + summary). The name is a scannable answer.
  markAnswer($("identity"), "identity", `Project: ${h.identity.name}`);
  $("proj-name").textContent = h.identity.name;
  $("proj-desc").textContent = h.identity.description;
  $("proj-summary").textContent = h.identity.summary;
  $("header-honesty").textContent = h.honesty.dataChip;
  $("get-help").href = h.robot.href;

  // LAYER 1 — status chips (semantic colour) + single next action
  const chips = $("status-chips"); chips.innerHTML = "";
  for (const c of h.statusStrip) {
    const chip = el("div", "statchip");
    markAnswer(chip, c.key, `${c.name}: ${c.value}`);
    chip.append(el("span", "statchip-ico " + c.tone, c.icon));
    const body = el("div", "statchip-body");
    body.append(el("div", "statchip-name", c.name), el("div", `qchip ${c.tone}`, c.value));
    chip.appendChild(body);
    chips.appendChild(chip);
  }
  $("ci-honesty").textContent = h.honesty.checksNote;
  $("read-decision").textContent = h.waiting.buttonLabel;
  $("next-note").textContent = h.nextNote;

  // LAYER 2 — Waiting detail (F3), activity, tiles
  // J2 (Run-4): the card needing the founder carries an amber highlight/trim.
  $("waiting").classList.toggle("needs-you", !!h.waiting.hasPending);
  $("waiting-title").textContent = (h.waiting.hasPending ? "⭐ " : "") + h.waiting.title;
  $("decision-needed-tag").textContent = h.honesty.decisionLabel;
  $("decision-state").textContent = h.honesty.decisionState;
  $("waiting-lead").textContent = h.waiting.lead;
  $("gate-title").textContent = h.waiting.gateTitle || "—";
  $("gate-desc").textContent = h.waiting.gateDesc;
  $("waiting-note").textContent = h.waiting.note;

  markAnswer($("activity-title"), "recent", "What happened recently");
  const feed = $("activity-feed"); feed.innerHTML = "";
  if (h.activity.length === 0) feed.appendChild(el("li", "hint", "Nothing recorded yet."));
  for (const a of h.activity) { const li = el("li"); li.append(el("span", "feed-ico", a.icon), el("span", "feed-text", a.text)); feed.appendChild(li); }
  $("pr-detail").textContent = h.honesty.prDisplay;

  const tiles = $("tiles"); tiles.innerHTML = "";
  for (const t of h.tiles) {
    const a = el("a", "tile" + (t.viewOnly ? " viewonly" : "")); a.href = t.href;
    a.append(el("div", "tile-ico", t.icon), el("div", "tile-title", t.title), el("div", "tile-sub", t.sub));
    if (t.viewOnly) a.append(el("span", "tag", "view only"));
    tiles.appendChild(a);
  }

  // LAYER 3 (collapsed) — safe / pause / cost, do-not-touch, evidence, health, remember
  $("safe-title").textContent = "🛡 " + h.safe.title;
  const sl = $("safe-lines"); sl.innerHTML = "";
  for (const line of h.safe.lines) { const li = el("li"); li.append(el("span", "tick", "✓"), el("span", null, line)); sl.appendChild(li); }
  $("safe-verdict").textContent = h.safe.verdict;
  $("pausecard-title").textContent = h.pauseCard.title.startsWith("⏸") ? h.pauseCard.title : "⏸ " + h.pauseCard.title;
  $("pausecard-lead").textContent = h.pauseCard.lead;
  $("pausecard-note").textContent = h.pauseCard.note;
  $("cost-title").textContent = "💲 " + h.costCard.title.replace(/^💲\s*/, "");
  $("cost-lead").textContent = h.costCard.lead;
  $("cost-big").textContent = h.costCard.big === "UNKNOWN" ? "—" : h.costCard.big;
  $("cost-per").textContent = h.costCard.per;
  $("cost-disclaimer").textContent = h.costCard.disclaimer;
  $("cost-note").textContent = h.costCard.note;

  markAnswer($("do-not-touch"), "dont-touch", "Files you must not change");
  $("dnt-title").textContent = "Please Don't Change These (Important!)";
  $("dnt-subtitle").textContent = view.doNotTouch.subtitle;
  const dl = $("do-not-touch-list"); dl.innerHTML = "";
  for (const d of view.doNotTouch.items) { const li = el("li"); li.innerHTML = `<b>${d.path}</b> — ${d.reason}`; dl.appendChild(li); }
  if (view.doNotTouch.items.length === 0) dl.appendChild(el("li", "hint", "Nothing to worry about right now."));

  const evl = $("evidence-list"); evl.innerHTML = "";
  for (const e of view.evidence) { const li = el("li"); li.textContent = e.path + " "; const b = el("span", `badge ${e.badge.kind || "info"}`, e.badge.text); li.appendChild(b); evl.appendChild(li); }
  if (view.evidence.length === 0) evl.appendChild(el("li", "hint", "No evidence yet — we can't see this yet."));

  $("doctor-title").textContent = view.doctor.title;
  $("doctor-version").textContent = `${view.doctor.version} (${view.doctor.versionPlain})`;
  $("doctor-present").textContent = view.doctor.filesPresent;
  const dc = $("doctor-checks"); dc.innerHTML = "";
  for (const c of view.doctor.checks) { const li = el("li"); li.textContent = c.name + " "; li.appendChild(el("span", `badge ${c.ok ? "ok" : "unknown"}`, c.ok ? "found" : "not found")); dc.appendChild(li); }

  $("fm-title").textContent = view.failureModes.title;
  const fl = $("failure-modes-list"); fl.innerHTML = "";
  for (const line of view.failureModes.lines) fl.appendChild(el("li", null, line));

  $("home-footer").textContent = h.footer;

  // Pause controls (both): honest, calm; reveal scope on click
  const scope = $("pause-scope"); scope.textContent = h.pauseCard.note;
  for (const id of ["pause-button", "pause-button-2"]) {
    const btn = $(id); if (!btn) continue;
    btn.textContent = "⏸ " + view.pause.button;
    btn.addEventListener("click", () => { scope.hidden = false; btn.textContent = "✓ Paused — help is on the way"; });
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
