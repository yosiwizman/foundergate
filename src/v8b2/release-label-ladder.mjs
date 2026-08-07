// FounderGate V8-B VB2 — RELEASE LABEL LADDER surface (read-only, NON-EXECUTING).
//
// Plain English: the V8-B completion matrix marks **"Release Label Ladder" = NOT BUILT**, with
// the missing behaviour named as a **"label + transition history surface"**. FounderGate already
// carries a declared release label (`.foundergate/release_label.json` — one of `dev`, `preview`,
// `internal`, `release`, or `UNKNOWN`), and the V8-A1 dashboard shows that label as a single
// word. What the founder still lacks is a dedicated surface that lays out the whole picture: the
// LADDER a release climbs (dev → preview → internal → release), WHERE the project currently sits
// on it, and the TRANSITION HISTORY — how it got here, rung by rung.
//
// This module is that surface — and NOTHING ELSE:
//   - It is PURE and read-only: every function takes a caller-supplied release snapshot and
//     RETURNS a plain object or a STRING. It never reads the disk to find the label itself, never
//     opens the network, never acts, promotes, demotes, tags, releases, or dispatches anything.
//   - NO side effects: no fs, no net, no child_process, no clock, no randomness. Same snapshot in
//     → byte-identical page out. A transition's timestamp is inert DATA shown verbatim — never
//     parsed and never compared against a system clock, and NEVER used to re-order history
//     (the caller's given order is preserved; Law 54 — we do not invent an ordering).
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>, <form>,
//     <button>, <input>, on* handler, or navigable link (<a href>). There is nothing here to
//     promote a label, cut a release, or move a rung — this surface only SHOWS the ladder. Moving
//     a release up the ladder is a later, separately-gated act; it is not wired here.
//
// THE LADDER — its rungs come from ONE authority: the committed release-label schema enum
// (`src/v8a1/schemas/release_label.schema.json`: `["dev","preview","internal","release","UNKNOWN"]`).
// The ordered, climbable rungs are `dev → preview → internal → release`; `UNKNOWN` is OFF the
// ladder (unplaced), never silently mapped onto a rung.
//
// THE HONESTY STANCE — the heart of a "label + history" surface (Law 54: never invent state):
//   - No release label declared → "no release label declared" said out loud, NEVER assumed `dev`
//     (assuming the bottom rung is the most seductive release lie there is).
//   - An off-ladder / unrecognised label (`UNKNOWN` or anything not in the enum) is placed on NO
//     rung and said to be off the ladder — never coerced to the nearest rung.
//   - A `mock: true` label is carried as a TRUTH-LABEL: it is a placeholder, not a real release
//     state, and the surface says so at the top (FounderGate's own committed label is mock).
//   - Transition history is taken EXACTLY as given: order preserved, timestamps shown verbatim,
//     a missing timestamp/actor said to be "not recorded" rather than fabricated. An empty
//     history is "no transition history recorded" — the surface never manufactures a
//     dev→…→current path the caller did not supply.
//   - Each transition's DIRECTION on the ladder is classified honestly: a single-rung PROMOTION,
//     a multi-rung JUMP (a rung was skipped — not climbed one at a time), a DEMOTION / step-down
//     (moved back down the ladder), a LATERAL (same rung), or OFF-LADDER (an endpoint is not a
//     rung). A jump and a demotion are surfaced facts, never hidden behind a green arrow.
//   - If the history's final destination does not equal the current declared label, that MISMATCH
//     is stated out loud, not reconciled by quietly trusting one over the other.
//   TRUTH LABELLING: the snapshot's `source` ("live" vs "fixture") is carried to the page and
//   never conflated — a founder always knows whether they read the project's live label or a
//   committed sample.

import { UNKNOWN } from "./cto-queue.mjs";

export const RELEASE_LABEL_LADDER_VERSION = "1.0.0";

// THE LADDER — the ordered, climbable rungs, taken verbatim from the release-label schema enum
// (minus the off-ladder UNKNOWN sentinel). Rung numbering below is 1-based over this array.
export const LADDER = Object.freeze(["dev", "preview", "internal", "release"]);

// A one-line, founder-readable meaning for each rung. Display copy only — it changes no behaviour
// and adds no rung the schema does not declare.
export const RUNG_MEANING = Object.freeze({
  dev: "In development — not yet shown outside the build",
  preview: "Preview — shared for a look, not a real release",
  internal: "Internal release — in front of an internal audience",
  release: "Released — the top rung",
});

// A trimmed string, or "" — never a coerced object/number pretending to be text.
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// rungOf(label) -> the 1-based rung index of a label on the ladder, or null when the label is
// off the ladder (UNKNOWN, absent, or anything not in the schema enum). null is "not on a rung",
// said out loud — it is NEVER coerced to 1 (the bottom rung) or to any nearest rung.
export function rungOf(label) {
  const l = str(label);
  const i = LADDER.indexOf(l);
  return i === -1 ? null : i + 1;
}

// Classify a from→to move on the ladder with maximum honesty. Either endpoint being off-ladder
// makes the whole move "off-ladder" (we cannot honestly measure a climb from/to a non-rung).
//   promotion : up exactly one rung
//   jump      : up more than one rung (a rung was skipped — not climbed one at a time)
//   demotion  : moved back down the ladder (a step down)
//   lateral   : same rung (no movement)
//   off-ladder: an endpoint is not a rung (UNKNOWN / absent / unrecognised)
function classifyTransition(fromRung, toRung) {
  if (fromRung === null || toRung === null) return "off-ladder";
  if (toRung === fromRung) return "lateral";
  if (toRung < fromRung) return "demotion";
  return toRung - fromRung === 1 ? "promotion" : "jump";
}

// deriveLabelView(snapshot) -> a PURE, frozen view of the CURRENT declared label. Mirrors the
// shape of `.foundergate/release_label.json` ({ schema_version, label, stage, mock, note }) and
// refuses to invent a label when none is declared.
function deriveLabelView(release) {
  const r = release && typeof release === "object" ? release : null;
  if (!r) {
    return Object.freeze({
      declared: false,
      label: UNKNOWN,
      rung: null,
      onLadder: false,
      isTop: false,
      stage: null,
      mock: null,
      note: null,
      schemaVersion: null,
    });
  }
  const label = str(r.label);
  const rung = rungOf(label);
  return Object.freeze({
    declared: label.length > 0,
    label: label || UNKNOWN,
    rung, // 1-based rung index | null (off-ladder)
    onLadder: rung !== null,
    isTop: rung === LADDER.length,
    stage: str(r.stage) || null,
    // mock is a truth-label: true (declared mock), false (declared real), or null (not stated).
    mock: typeof r.mock === "boolean" ? r.mock : null,
    note: str(r.note) || null,
    schemaVersion: str(r.schema_version) || null,
  });
}

// deriveLadderView(snapshot) -> a PURE, frozen view over a caller-supplied release snapshot:
//   { source, collectedAt, release: {label,stage,mock,note,schema_version}, history: [ {from,to,at,by,note,evidence} ] }
// It never mutates the input, never invents a label or a transition, and marks every missing
// datum out loud. A non-object / missing snapshot degrades to an honest, empty view.
export function deriveLadderView(snapshot) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const source = s.source === "live" ? "live" : s.source === "fixture" ? "fixture" : UNKNOWN;
  const current = deriveLabelView(s.release);

  const rawHistory = Array.isArray(s.history) ? s.history : [];
  // Order is PRESERVED exactly as given — timestamps are never parsed to re-sort (Law 54).
  const history = rawHistory.map((entry) => {
    const e = entry && typeof entry === "object" ? entry : {};
    const from = str(e.from);
    const to = str(e.to);
    const fromRung = rungOf(from);
    const toRung = rungOf(to);
    return Object.freeze({
      from: from || UNKNOWN,
      to: to || UNKNOWN,
      fromRung,
      toRung,
      kind: classifyTransition(fromRung, toRung), // promotion|jump|demotion|lateral|off-ladder
      at: str(e.at) || null, // inert DATA, shown verbatim; null = not recorded (never fabricated)
      by: str(e.by) || null, // null = actor not recorded (never fabricated)
      note: str(e.note) || null,
      evidence: str(e.evidence) || null,
    });
  });

  // The ladder rungs annotated relative to the CURRENT label — passed / current / ahead. When the
  // current label is off the ladder, NO rung is "current" (we do not guess where it sits).
  const rungs = LADDER.map((name, i) => {
    const idx = i + 1;
    let state;
    if (current.rung === null) state = "unplaced"; // current label is off the ladder
    else if (idx < current.rung) state = "passed";
    else if (idx === current.rung) state = "current";
    else state = "ahead";
    return Object.freeze({ name, index: idx, meaning: RUNG_MEANING[name], state });
  });

  // Honesty cross-check: does the history's final destination agree with the current label?
  const lastTo = history.length ? history[history.length - 1].to : null;
  const historyEndsAtCurrent =
    history.length > 0 && current.declared && lastTo === current.label;
  const historyMismatch =
    history.length > 0 && current.declared && lastTo !== current.label
      ? { historyEndsAt: lastTo, currentLabel: current.label }
      : null;

  // Count the honestly-classified movements (a jump or demotion is worth surfacing on its own).
  const jumpCount = history.filter((h) => h.kind === "jump").length;
  const demotionCount = history.filter((h) => h.kind === "demotion").length;
  const offLadderCount = history.filter((h) => h.kind === "off-ladder").length;

  return Object.freeze({
    version: RELEASE_LABEL_LADDER_VERSION,
    source, // "live" | "fixture" | "UNKNOWN"
    collectedAt: str(s.collectedAt) || null,
    readOnly: true,
    ladder: Object.freeze(LADDER.slice()),
    rungs: Object.freeze(rungs),
    current, // the current-label view (may be un-declared / off-ladder — said out loud)
    history: Object.freeze(history),
    historyCount: history.length,
    historyEndsAtCurrent,
    historyMismatch, // { historyEndsAt, currentLabel } | null
    jumpCount,
    demotionCount,
    offLadderCount,
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const SOURCE_LABEL = Object.freeze({
  live: "Live project label",
  fixture: "Fixture (committed sample — not live)",
  [UNKNOWN]: "Unknown source",
});

// Honest phrasing + tone for each transition kind. No kind ever reads greener than the movement
// it describes: a jump and a demotion are called what they are.
const TRANSITION_KIND = Object.freeze({
  promotion: { tone: "ok", arrow: "→", text: "promotion (up one rung)" },
  jump: { tone: "warn", arrow: "⇒", text: "jump (a rung was skipped)" },
  demotion: { tone: "warn", arrow: "↓", text: "step down (moved back down the ladder)" },
  lateral: { tone: "muted", arrow: "•", text: "no rung change" },
  "off-ladder": { tone: "muted", arrow: "?", text: "off the ladder (an endpoint is not a rung)" },
});

// A founder-readable line describing where the current label sits.
function placementLine(current) {
  if (!current.declared) return "No release label is declared — this project has not been placed on the ladder.";
  if (!current.onLadder) return `The label "${current.label}" is off the ladder — it is not one of the declared rungs.`;
  return `On rung ${current.rung} of ${LADDER.length} — ${current.label}${current.isTop ? " (the top rung)" : ""}.`;
}

// ── Plain-text rendering (terminal/log + tests that assert content without HTML) ─────────────

// renderLadderText(snapshot) -> founder-readable plain text of the whole surface. Pure.
export function renderLadderText(snapshot) {
  const v = deriveLadderView(snapshot);
  const c = v.current;
  const lines = [
    `RELEASE LABEL LADDER — read-only; shows the label and how it got here, moves nothing`,
    `Source: ${SOURCE_LABEL[v.source]}`,
  ];
  if (v.collectedAt) lines.push(`Collected at: ${v.collectedAt}`);
  lines.push("");

  // CURRENT LABEL.
  lines.push(`CURRENT LABEL`);
  if (!c.declared) {
    lines.push(`  (no release label declared — not assumed to be "dev")`);
  } else {
    lines.push(`  Label: ${c.label}${c.mock === true ? "  (MOCK — a placeholder, not a real release state)" : ""}`);
    if (c.stage) lines.push(`  Stage: ${c.stage}`);
    if (c.note) lines.push(`  Note: ${c.note}`);
  }
  lines.push(`  ${placementLine(c)}`);
  lines.push("");

  // THE LADDER.
  lines.push(`LADDER (from the release-label schema — dev → preview → internal → release)`);
  for (const rung of v.rungs) {
    const marker =
      rung.state === "current" ? "▶" :
      rung.state === "passed" ? "✓" :
      rung.state === "ahead" ? "·" : " ";
    const tail =
      rung.state === "current" ? "  <- current" :
      rung.state === "passed" ? "  (passed)" :
      rung.state === "unplaced" ? "" : "";
    lines.push(`  ${marker} ${rung.index}. ${rung.name} — ${rung.meaning}${tail}`);
  }
  lines.push("");

  // TRANSITION HISTORY.
  lines.push(`TRANSITION HISTORY`);
  if (v.history.length === 0) {
    lines.push(`  (no transition history recorded — the path onto this rung is not on record)`);
  } else {
    for (const t of v.history) {
      const k = TRANSITION_KIND[t.kind];
      lines.push(`  ${t.from} ${k.arrow} ${t.to}  [${k.text}]`);
      lines.push(`    When: ${t.at || "not recorded"}    By: ${t.by || "not recorded"}`);
      if (t.note) lines.push(`    Note: ${t.note}`);
      if (t.evidence) lines.push(`    Evidence: ${t.evidence}`);
    }
    if (v.historyMismatch) {
      lines.push("");
      lines.push(`  ! History ends at "${v.historyMismatch.historyEndsAt}" but the current label is "${v.historyMismatch.currentLabel}" — the two do not agree.`);
    }
  }
  return lines.join("\n").replace(/\n+$/, "");
}

// ── HTML rendering (pure display; no behaviour) ──────────────────────────────────────────────

function chip(text, tone) {
  return `<span class="fg-chip fg-tone-${escapeHtml(tone)}">${escapeHtml(text)}</span>`;
}

function renderCurrentHtml(v) {
  const c = v.current;
  const chips = [];
  if (c.declared && c.onLadder) chips.push(chip(`rung ${c.rung} of ${LADDER.length}`, c.isTop ? "ok" : "info"));
  if (c.declared && !c.onLadder) chips.push(chip("off the ladder", "warn"));
  if (!c.declared) chips.push(chip("not declared", "warn"));
  if (c.mock === true) chips.push(chip("mock — placeholder, not a real release", "warn"));
  const big = !c.declared ? "not declared" : c.label;
  return [
    `  <section class="fg-current" aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>Current label</h2>${chips.join("")}</div>`,
    `    <div class="fg-big-row">`,
    `      <div class="fg-big"><span class="fg-big-value">${escapeHtml(big)}</span><span class="fg-big-label">Release label</span></div>`,
    `    </div>`,
    c.stage ? `    <p class="fg-note">Stage: ${escapeHtml(c.stage)}</p>` : ``,
    c.note ? `    <p class="fg-note">Note: ${escapeHtml(c.note)}</p>` : ``,
    `    <p class="fg-note">${escapeHtml(placementLine(c))}</p>`,
    !c.declared
      ? `    <p class="fg-note">No label is declared — it is <strong>not</strong> assumed to be the bottom rung (Law 54).</p>`
      : ``,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderLadderRungsHtml(v) {
  const rows = v.rungs.map((rung) => {
    const stateChip =
      rung.state === "current" ? chip("current", "info") :
      rung.state === "passed" ? chip("passed", "ok") :
      rung.state === "unplaced" ? chip("—", "muted") : "";
    return [
      `      <li class="fg-rung fg-rung-${escapeHtml(rung.state)}">`,
      `        <span class="fg-rung-index">${escapeHtml(rung.index)}</span>`,
      `        <span class="fg-rung-name">${escapeHtml(rung.name)}</span>`,
      `        <span class="fg-rung-meaning">${escapeHtml(rung.meaning)}</span>`,
      `        ${stateChip}`,
      `      </li>`,
    ].join("\n");
  });
  return [
    `  <section class="fg-ladder" aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>The ladder</h2>${chip("dev → preview → internal → release", "muted")}</div>`,
    `    <p class="fg-note">The rungs come from the release-label schema. A release climbs from the bottom; this surface only shows the climb, it does not move anything.</p>`,
    // Highest rung first, so the ladder reads top-down like a ladder.
    `    <ol class="fg-rungs" reversed>`,
    ...rows.slice().reverse(),
    `    </ol>`,
    v.current.onLadder && v.current.rung !== null
      ? ``
      : `    <p class="fg-note">The current label is not on a rung, so no rung is marked <em>current</em>.</p>`,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderHistoryHtml(v) {
  if (v.history.length === 0) {
    return [
      `  <section class="fg-history" aria-readonly="true">`,
      `    <h2>Transition history</h2>`,
      `    <p class="fg-empty">No transition history recorded — the path onto this rung is not on record. It is not invented.</p>`,
      `  </section>`,
    ].join("\n");
  }
  const rows = v.history.map((t) => {
    const k = TRANSITION_KIND[t.kind];
    return [
      `      <li class="fg-transition">`,
      `        <div class="fg-transition-head">`,
      `          <span class="fg-t-from">${escapeHtml(t.from)}</span>`,
      `          <span class="fg-t-arrow">${escapeHtml(k.arrow)}</span>`,
      `          <span class="fg-t-to">${escapeHtml(t.to)}</span>`,
      `          ${chip(k.text, k.tone)}`,
      `        </div>`,
      `        <div class="fg-transition-meta">`,
      `          <span>When: ${escapeHtml(t.at || "not recorded")}</span>`,
      `          <span>By: ${escapeHtml(t.by || "not recorded")}</span>`,
      `        </div>`,
      t.note ? `        <p class="fg-note">Note: ${escapeHtml(t.note)}</p>` : ``,
      t.evidence ? `        <p class="fg-note">Evidence: ${escapeHtml(t.evidence)}</p>` : ``,
      `      </li>`,
    ].filter(Boolean).join("\n");
  });
  const flags = [];
  if (v.jumpCount) flags.push(chip(`${v.jumpCount} jump${v.jumpCount === 1 ? "" : "s"} (rung skipped)`, "warn"));
  if (v.demotionCount) flags.push(chip(`${v.demotionCount} step-down${v.demotionCount === 1 ? "" : "s"}`, "warn"));
  return [
    `  <section class="fg-history" aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>Transition history</h2>${flags.join("")}</div>`,
    `    <p class="fg-note">Shown in the order given, newest last. Timestamps are shown exactly as recorded; a missing time or actor is said to be <em>not recorded</em>, never filled in.</p>`,
    `    <ul class="fg-transitions">`,
    ...rows,
    `    </ul>`,
    v.historyMismatch
      ? `    <p class="fg-note fg-warn">History ends at <strong>${escapeHtml(v.historyMismatch.historyEndsAt)}</strong> but the current label is <strong>${escapeHtml(v.historyMismatch.currentLabel)}</strong> — the two do not agree.</p>`
      : ``,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

// renderLadderHtml(snapshot) -> the composed body (current + ladder + history) as an HTML
// fragment. Pure display; no <script>/form/button/input/on*/href.
export function renderLadderHtml(snapshot) {
  const v = deriveLadderView(snapshot);
  return [renderCurrentHtml(v), renderLadderRungsHtml(v), renderHistoryHtml(v)].join("\n");
}

// The self-contained style. Inlined so the rendered page is a PORTABLE evidence artifact that
// stands alone, using the shared founder palette for visual kinship with the sibling VB2
// surfaces. Style only — no behaviour. Colour law: amber is reserved for a fact that deserves a
// second look (a jump, a step down, an off-ladder or undeclared label); a routine climb stays calm.
const SURFACE_STYLE = `
    :root{
      --bg:#0d1117;--panel:#161c26;--panel2:#1b2230;--line:#2a3344;
      --text:#e6ebf2;--muted:#93a0b4;--dim:#6b7789;
      --blue:#3b82f6;--green:#22c55e;--amber:#f5b83d;--purple:#a78bfa;--red:#f26d6d;--radius:12px;
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);
      font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
    .fg-wrap{max-width:920px;margin:0 auto;padding:32px 20px 56px}
    .fg-eyebrow{color:var(--purple);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600}
    h1{font-size:27px;margin:.2em 0 .1em}
    h2{font-size:16px;margin:0}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.4em 0 0}
    .fg-note strong{color:var(--text)}
    .fg-note.fg-warn{color:var(--amber)}
    section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-head-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
    .fg-chip{font-size:11.5px;border-radius:999px;padding:1px 9px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
    .fg-tone-ok{color:var(--green);border-color:rgba(34,197,94,.4)}
    .fg-tone-bad{color:var(--red);border-color:rgba(242,109,109,.5)}
    .fg-tone-warn{color:var(--amber);border-color:rgba(245,184,61,.45)}
    .fg-tone-info{color:var(--blue);border-color:rgba(59,130,246,.4)}
    .fg-tone-muted{color:var(--muted)}
    .fg-big-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px}
    .fg-big{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:14px 20px;display:flex;flex-direction:column;gap:2px}
    .fg-big-value{font-size:30px;font-weight:700}
    .fg-big-label{color:var(--muted);font-size:12.5px}
    .fg-rungs{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
    .fg-rung{display:flex;align-items:center;gap:12px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 14px}
    .fg-rung-current{border-color:rgba(59,130,246,.55);background:#182234}
    .fg-rung-passed{opacity:.85}
    .fg-rung-ahead{opacity:.6}
    .fg-rung-unplaced{opacity:.5}
    .fg-rung-index{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim);width:1.4em;text-align:right}
    .fg-rung-name{font-weight:700;color:var(--purple);min-width:5.5em}
    .fg-rung-meaning{color:var(--muted);font-size:13px;flex:1}
    .fg-transitions{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:10px}
    .fg-transition{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
    .fg-transition-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .fg-t-from,.fg-t-to{font-weight:700;color:var(--purple)}
    .fg-t-arrow{color:var(--muted);font-size:16px}
    .fg-transition-meta{display:flex;flex-wrap:wrap;gap:16px;margin-top:6px;color:var(--dim);font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fg-empty{color:var(--muted)}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--text)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderSurfaceHtml(snapshot) -> a COMPLETE, self-contained founder-readable page. Pure: same
// snapshot in, byte-identical page out (no clock, no randomness). It carries NO <script>,
// <form>, <button>, <input>, on* handler, or navigable link (<a href>) — observably read-only.
export function renderSurfaceHtml(snapshot) {
  const v = deriveLadderView(snapshot);
  const srcTone = v.source === "live" ? "info" : v.source === "fixture" ? "muted" : "warn";
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Release Label Ladder — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Release Label Ladder</h1>`,
    `    <p class="fg-sub">The rung this project sits on (dev → preview → internal → release), and the transition history of how it got here. A label with no declared value is shown as <em>not declared</em>, never assumed to be the bottom rung; a missing timestamp or actor is shown as <em>not recorded</em>, never filled in. This surface only shows the ladder; it promotes nothing and cuts no release.</p>`,
    `    <div class="fg-head-row">${chip(SOURCE_LABEL[v.source], srcTone)}${v.collectedAt ? `<span class="fg-transition-meta">collected ${escapeHtml(v.collectedAt)}</span>` : ""}</div>`,
    renderLadderHtml(snapshot),
    `    <p class="fg-foot">Read-only view · an undeclared label is never assumed to be "dev" · a missing time/actor is never fabricated · a jump or step-down is shown honestly · moving a release up the ladder is a later, separately-gated act, not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

// renderSurfaceText(snapshot) -> plain-text dedicated surface. Pure. Convenience alias so callers
// have a symmetric {Html,Text} pair like the other VB2 surfaces.
export function renderSurfaceText(snapshot) {
  return renderLadderText(snapshot);
}
