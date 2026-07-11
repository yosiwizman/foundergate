// FounderGate V8-A1 — Truth Dashboard frontend (FD-IMPLEMENT: founder design v2).
//
// One-page, no accordions. Every value is a template over the reader's honest model
// (Law 54); the decision affordance is view-only (Law 55); pause keeps honest scope.
// The ALIVE line + STATUS chip lead with HEALTH (files-found + connected), never
// run_state — a green light can't be faked from an idle demo.

import { buildView } from "./view-model.mjs";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
// tone -> chip colour class (matches the founder mockup: green / amber / blue / neutral / red)
const TONE_CLASS = { ok: "g", caution: "a", attention: "r", info: "b", unknown: "n" };
function markAnswer(node, key, label) { node.setAttribute("data-answer", key); node.setAttribute("role", "group"); node.setAttribute("aria-label", label); return node; }

function render(view) {
  const h = view.home;

  // Identity (Law 54 — name/description from project.json)
  $("proj-name").textContent = h.identity.name;
  $("proj-sub").textContent = h.identity.description;
  $("get-help").href = h.robot.href;
  $("robot-line").textContent = h.robot.line;
  const rb = $("robot-btn"); rb.textContent = h.robot.button;
  $("demo-pill").textContent = h.demo;

  // ALIVE line — dot + bold colour is HEALTH, not run_state.
  const dot = $("alive-dot"); dot.className = "dot " + (h.alive.tone || "unknown");
  const at = $("alive-text"); at.textContent = h.alive.text; at.className = (h.alive.tone === "attention" ? "bad" : "");
  $("alive-wait").textContent = h.alive.waitLabel || "";
  $("alive-waitcont").textContent = h.alive.waitCont || "";
  $("alive-demo").textContent = h.alive.demoNote;

  // Six status chips (each a distinct, colour-coded, scannable answer — the relocated
  // scan-budget surface). role/aria-label/data-answer markers kept for the guard.
  const chips = $("chips"); chips.innerHTML = "";
  for (const c of h.statusStrip) {
    const chip = markAnswer(el("div", "chip " + (TONE_CLASS[c.tone] || "n")), c.key, `${c.name}: ${c.value}`);
    chip.append(el("div", "ic", c.icon));
    const body = el("div"); body.append(el("small", null, c.name.toUpperCase()), el("div", "v", c.value));
    chip.appendChild(body);
    chips.appendChild(chip);
  }
  $("honesty").textContent = h.honesty.checksNote;

  // Waiting card (amber trim when it needs the founder) — view-only decision + pause.
  $("waiting").classList.toggle("needs", !!h.waiting.hasPending);
  $("waiting-title").textContent = (h.waiting.hasPending ? "⭐ " : "") + h.waiting.title;
  $("decision-tag").textContent = h.honesty.decisionLabel;
  $("waiting-plain").textContent = h.waiting.lead;
  $("gate-title").textContent = h.waiting.gateTitle || "—";
  $("gate-desc").textContent = h.waiting.gateDesc;
  $("read-decision").textContent = h.waiting.buttonLabel;
  $("waiting-note").textContent = h.waiting.note;

  // What's Next — derived from gates + next_action (honest absence wording).
  const wn = $("whatsnext"); wn.innerHTML = "";
  for (const w of h.whatsNext) {
    const item = el("div", "item" + (w.you ? " youline" : ""));
    item.textContent = `${w.n} · ${w.text}`;
    wn.appendChild(item);
  }

  // What Happened Recently — real events + the dev work package (PR), no invented times.
  const recent = $("recent"); recent.innerHTML = "";
  markAnswer($("recent"), "recent", "What happened recently");
  if (h.activity.length === 0) recent.appendChild(el("div", "item", "Nothing recorded yet."));
  for (const a of h.activity) recent.appendChild(el("div", "item", `${a.icon} ${a.text}`));
  recent.appendChild(el("div", "item", h.honesty.prDisplay));

  // Quick actions (5 tiles; decision tile is view-only).
  const tiles = $("tiles"); tiles.innerHTML = "";
  for (const t of h.tiles) {
    const a = el("a", "tile"); a.href = t.href;
    a.append(el("div", "em", t.icon), el("b", null, t.title), el("span", null, t.sub));
    if (t.viewOnly) a.append(el("span", "vo", "view only"));
    tiles.appendChild(a);
  }

  $("foot").textContent = h.footer;

  // Footnotes strip — relocated Layer-3 content (always visible, no accordions).
  $("fn-good").textContent = "Good to know: " + h.footnotes.goodToKnow.join(" · ") + ".";
  $("fn-protected").textContent = h.footnotes.protected;
  $("fn-record").textContent = h.footnotes.record;

  // Pause controls (header + in-card "Pause instead") — same honest action & scope.
  const scope = $("pause-scope"); scope.textContent = h.pauseCard.note;
  for (const id of ["pause-button", "pause-instead"]) {
    const btn = $(id); if (!btn) continue;
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
