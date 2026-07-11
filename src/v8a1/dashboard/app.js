// FounderGate V8-A1 — Truth Dashboard frontend (VA-REPAIR-2 friendly redesign).
//
// One friendly single page. Every friendly sentence is a TEMPLATE over the reader's
// honest model (Law 54) — nothing is invented, no fake timestamps. The decision
// affordance is VIEW-ONLY (Law 55): "Read the Decision", never "approve"/"move
// forward". The pause control keeps honest scope wording. Navigation LINKS to the
// other apps (Preview Bay, File Cabinet, Guide) — it never embeds them.

import { buildView } from "./view-model.mjs";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// A scannable "answer" element: distinct, role/aria-labelled, data-answer marked —
// this is what the scan-budget guard proves the stranger can read at a glance.
function markAnswer(node, key, label) {
  node.setAttribute("data-answer", key);
  node.setAttribute("role", "group");
  node.setAttribute("aria-label", label);
  return node;
}

function wireDisabled(node, stage) {
  node.classList.add("disabled");
  node.setAttribute("aria-disabled", "true");
  const s = el("span", "stage", stage);
  s.setAttribute("data-stage", "");
  node.appendChild(s);
  node.setAttribute("data-nav-disabled", "1");
}

function render(view) {
  const h = view.home;
  $("brand").textContent = view.nav.brand;

  // Sidebar nav — each item links to a real page or is disabled + stage-labelled.
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

  // Top bar
  $("hi").textContent = h.hi;
  $("subtitle").textContent = h.subtitle;
  $("get-help").href = h.robot.href;
  // Restored honest companions (A1 copy-polish translations, relocated) — model-derived.
  $("header-honesty").textContent = h.honesty.dataChip;            // Demo mode — no real customer data (MOCK_ONLY)
  $("ci-honesty").textContent = h.honesty.checksNote;             // the robot tests passed — this doesn't mean the product is finished.
  $("decision-needed-tag").textContent = h.honesty.decisionLabel; // Decision Needed
  $("decision-state").textContent = h.honesty.decisionState;      // Waiting for your decision.
  $("pr-detail").textContent = h.honesty.prDisplay;               // Developer work package #7 (PR)

  // F1 — plain project summary (a distinct scannable answer)
  const sc = $("summary-card"); sc.innerHTML = "";
  const sline = el("p", "summary-line", h.summary);
  sc.appendChild(markAnswer(sline, "what-is-it", `What is this project: ${h.summary}`));

  // Status strip — the 5 named chips, each a colour-coded scannable answer
  $("status-label").textContent = h.statusLabel;
  $("state-pretty").textContent = "· " + h.statePretty;
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

  // Waiting-for-You (F3: plain lead first; view-only button)
  $("waiting-title").textContent = (h.waiting.hasPending ? "⭐ " : "") + h.waiting.title;
  $("waiting-lead").textContent = h.waiting.lead;
  $("gate-title").textContent = h.waiting.gateTitle || "—";
  $("gate-desc").textContent = h.waiting.gateDesc;
  $("read-decision").textContent = h.waiting.buttonLabel;
  $("waiting-note").textContent = h.waiting.note;

  // Activity feed (real events, no invented times) — a scannable answer
  markAnswer($("activity-title"), "recent", "What happened recently");
  const feed = $("activity-feed"); feed.innerHTML = "";
  if (h.activity.length === 0) feed.appendChild(el("li", "hint", "Nothing recorded yet."));
  for (const a of h.activity) {
    const li = el("li");
    li.append(el("span", "feed-ico", a.icon), el("span", "feed-text", a.text));
    feed.appendChild(li);
  }

  // Quick tiles — every tile links (or is view-only); none is a dead control
  const tiles = $("tiles"); tiles.innerHTML = "";
  for (const t of h.tiles) {
    const a = el("a", "tile" + (t.viewOnly ? " viewonly" : ""));
    a.href = t.href;
    a.append(el("div", "tile-ico", t.icon), el("div", "tile-title", t.title), el("div", "tile-sub", t.sub));
    if (t.viewOnly) a.append(el("span", "tag", "view only"));
    tiles.appendChild(a);
  }

  // Don't change these (raised, distinct) — a scannable answer
  markAnswer($("do-not-touch"), "dont-touch", "Files you must not change");
  $("dnt-title").textContent = view.doNotTouch.title.includes("Important") ? view.doNotTouch.title : "Please Don't Change These (Important!)";
  $("dnt-subtitle").textContent = view.doNotTouch.subtitle;
  const dl = $("do-not-touch-list"); dl.innerHTML = "";
  for (const d of view.doNotTouch.items) { const li = el("li"); li.innerHTML = `<b>${d.path}</b> — ${d.reason}`; dl.appendChild(li); }
  if (view.doNotTouch.items.length === 0) dl.appendChild(el("li", "hint", "Nothing to worry about right now."));

  // Bottom cards
  $("safe-title").textContent = "🛡 " + h.safe.title;
  const sl = $("safe-lines"); sl.innerHTML = "";
  for (const line of h.safe.lines) { const li = el("li"); li.append(el("span", "tick", "✓"), el("span", null, line)); sl.appendChild(li); }
  $("safe-verdict").textContent = h.safe.verdict;

  $("pausecard-title").textContent = h.pauseCard.title.startsWith("⏸") ? h.pauseCard.title : "⏸ " + h.pauseCard.title;
  $("pausecard-lead").textContent = h.pauseCard.lead;
  $("pausecard-note").textContent = h.pauseCard.note;

  // F2 — big, hard-to-miss cost card (display-only)
  $("cost-title").textContent = "💲 " + h.costCard.title.replace(/^💲\s*/, "");
  $("cost-lead").textContent = h.costCard.lead;
  $("cost-big").textContent = h.costCard.big === "UNKNOWN" ? "—" : h.costCard.big;
  $("cost-per").textContent = h.costCard.per;
  $("cost-disclaimer").textContent = h.costCard.disclaimer;
  $("cost-note").textContent = h.costCard.note;

  $("home-footer").textContent = h.footer;

  // Pause controls (both buttons): honest, calm; reveal scope on click
  const scope = $("pause-scope");
  scope.textContent = h.pauseCard.note;
  for (const id of ["pause-button", "pause-button-2"]) {
    const btn = $(id);
    if (!btn) continue;
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
