// FounderGate V8-B VB2 — SPEC CARD ENGINE surface (read-only, NON-EXECUTING).
//
// Plain English: the V8-B completion matrix marks **"Spec Card Engine" = PARTIAL**. The only
// spec-card material on disk today is a SIDE EFFECT of the ARE blueprint compiler
// (`src/autonomous-run/blueprint-compiler.mjs`), which emits a thin card
// `{ spec_card_id, requirement_id, gate, acceptance, trace }` per requirement. What is missing —
// named in the matrix as the "standalone spec-card engine" — is the thing ROADMAP §18 (N16)
// actually asks for: **before any major feature, produce a SPEC CARD in plain English**, whose
// contents are (1) what the founder asked for, as understood; (2) what "done" looks like, testable;
// (3) what it will NOT do; (4) open questions — and which **the founder approves before any lane
// spawns**.
//
// This module is that engine and its surface — and NOTHING ELSE:
//   - `deriveSpecCard(blueprint, requirementId, opts)` is the ENGINE: a PURE function that reads a
//     caller-supplied blueprint object and lifts ONE requirement into a plain-English spec card. It
//     never classifies the gate itself (gate classification is ARLC's job, DELEGATED — the caller
//     passes the compiler's verdict in), never reads disk, never opens a network, never acts.
//   - The render/view functions take a caller-supplied spec-card snapshot and RETURN a plain object
//     or a STRING. Same snapshot in → byte-identical page out. No fs, no net, no child_process, no
//     clock, no randomness.
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>, <form>,
//     <button>, <input>, on* handler, or navigable link (<a href>). There is nothing here to
//     APPROVE a card, spawn a lane, or fire a scope kill-switch. Approving a spec card and spawning
//     its lane is a later, separately-gated act; it is not wired here. The scope kill-switch
//     commands (stop building this / freeze scope / defer to later / remove from roadmap / make it
//     a manual process for now) are SHOWN as reference only — this surface executes none of them.
//
// THE HONESTY STANCE — the heart of a spec-card engine (Law 54: never invent state):
//   - A spec card is APPROVED only when an approval record explicitly says so. With no record, the
//     card is "awaiting founder approval — no lane may spawn", NEVER assumed approved. Assuming
//     approval is the most seductive spec-card lie there is: it is exactly the founder gate N16
//     exists to hold.
//   - "What done looks like" is the acceptance criteria, VERBATIM. With none, the card says
//     "no testable definition of done" out loud — it never manufactures a criterion or implies the
//     feature can be proven complete.
//   - "What it will NOT do" is the declared non-goals. With none, the card says "no explicit
//     non-goals recorded" (an undefined scope boundary is a fact worth surfacing) — it never
//     invents a boundary.
//   - Open questions are shown as given; with none, "no open questions recorded", never "all clear".
//   - The gate is shown exactly as the caller (the ARLC-delegating compiler) classified it. With no
//     verdict, "gate not classified — not assumed autonomous" — the engine never downgrades an
//     unclassified requirement to the no-gate path.
//   TRUTH LABELLING: the snapshot's `source` ("live" vs "fixture") is carried to the page and never
//   conflated — a founder always knows whether they read a live card or a committed sample.

import { UNKNOWN } from "./cto-queue.mjs";

export const SPEC_CARD_ENGINE_VERSION = "1.0.0";

// The requirements-to-tests PIPELINE (ROADMAP §18): founder idea → plain-English requirement →
// acceptance criteria → proof required → gate. Display/analysis order only — presence of each stage
// is derived from the card, never assumed.
export const PIPELINE_STAGES = Object.freeze([
  Object.freeze({ key: "asked", label: 'Founder idea — "what was asked", as understood' }),
  Object.freeze({ key: "requirement", label: "Plain-English requirement (captured & identified)" }),
  Object.freeze({ key: "done", label: 'Acceptance criteria — what "done" looks like' }),
  Object.freeze({ key: "proof", label: "Proof / evidence required" }),
  Object.freeze({ key: "gate", label: "Gate — founder approval required, or not" }),
]);

// The scope kill-switch commands (ROADMAP §18). Shown as REFERENCE only — this surface fires none
// of them; issuing one is a separately-gated act elsewhere.
export const KILL_SWITCHES = Object.freeze([
  "stop building this",
  "freeze scope",
  "defer to later",
  "remove from roadmap",
  "make it a manual process for now",
]);

// Acceptance-criterion fields that make a "done" statement testable (it declares HOW it is proven).
const TESTABLE_KEYS = ["test", "proof", "evidence", "check", "measurable", "verify", "metric"];

// A trimmed string, or "" — never a coerced object/number pretending to be text.
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// normalizeList(v) -> array of trimmed non-empty strings. Accepts an array, a lone string, or
// nothing. Objects are lifted to their text-ish field so a list of {text} still reads. Never throws.
function normalizeList(v) {
  const arr = Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  const out = [];
  for (const item of arr) {
    const s =
      typeof item === "string"
        ? item.trim()
        : item && typeof item === "object"
          ? str(item.text) || str(item.question) || str(item.note) || str(item.description)
          : "";
    if (s) out.push(s);
  }
  return out;
}

// normalizeDoneCriterion(a) -> { text, testable }. A string is a bare (untested) statement; an
// object may declare HOW it is proven, which makes it testable.
function normalizeDoneCriterion(a) {
  if (typeof a === "string") return { text: a.trim(), testable: false };
  if (!a || typeof a !== "object") return null;
  const text = str(a.text) || str(a.criterion) || str(a.must) || str(a.done) || str(a.description);
  if (!text) return null;
  const testable =
    a.testable === true ||
    TESTABLE_KEYS.some((k) => a[k] != null && a[k] !== false && String(a[k]).trim() !== "");
  return { text, testable };
}

// normalizeApproval(raw) -> a frozen, honest approval view. Approved ONLY when the record explicitly
// says "approved"; anything else (absent, pending, blank, rejected) is NOT approved. Never assumed.
function normalizeApproval(raw) {
  const r = raw && typeof raw === "object" ? raw : null;
  const stateRaw = r ? str(r.state).toLowerCase() : "";
  const approved = stateRaw === "approved";
  const state = approved ? "approved" : stateRaw === "rejected" ? "rejected" : "awaiting";
  return Object.freeze({
    approved,
    state, // "approved" | "rejected" | "awaiting"
    declared: !!r && stateRaw.length > 0,
    by: r ? str(r.by) || null : null,
    at: r ? str(r.at) || null : null, // inert DATA shown verbatim; never parsed against a clock
    note: r ? str(r.note) || null : null,
  });
}

// deriveSpecCard(blueprint, requirementId, opts) -> THE ENGINE. A PURE function that lifts ONE
// requirement out of a caller-supplied blueprint into a plain-English spec card. It reads only the
// object it is given: no fs, no net. It NEVER classifies the gate itself — the caller passes the
// ARLC-delegating compiler's verdict via opts.gate (with no verdict, the gate stays unclassified,
// never assumed autonomous).
//   opts: { gate, approval, proofRequired, trace, specCardId, mock, title }
export function deriveSpecCard(blueprint, requirementId, opts = {}) {
  const bp = blueprint && typeof blueprint === "object" ? blueprint : {};
  const reqId = str(requirementId) || null;
  const reqs = Array.isArray(bp.functional_requirements) ? bp.functional_requirements : [];
  const req = reqs.find((r) => r && (typeof r === "object" ? str(r.id) : "") === reqId) || null;

  // What the founder asked for, as understood — the requirement text; the blueprint objective is
  // carried alongside as context. Neither is invented: absent → null, said out loud downstream.
  const asked = req ? (typeof req === "string" ? str(req) : str(req.text)) || null : null;

  // What "done" looks like — the acceptance criteria bound to THIS requirement, verbatim.
  const doneRaw = Array.isArray(bp.acceptance_criteria) ? bp.acceptance_criteria : [];
  const doneCriteria = doneRaw
    .filter((a) => a && typeof a === "object" && str(a.requirement_id) === reqId)
    .map(normalizeDoneCriterion)
    .filter(Boolean);

  // What it will NOT do — requirement-level non-goals first, then the blueprint's, de-duplicated.
  const nonGoals = [...new Set([...normalizeList(req && req.non_goals), ...normalizeList(bp.non_goals)])];

  // Open questions — pulled from every place a blueprint records an unknown, de-duplicated.
  const openQuestions = [
    ...new Set([
      ...normalizeList(req && req.open_questions),
      ...normalizeList(bp.known_unknowns),
      ...normalizeList(bp.founder_decisions_required),
      ...normalizeList(bp.legal_security_ip_expert_questions),
    ]),
  ];

  // Proof required — the caller's per-card list, else the blueprint's evidence expectations.
  const proofRequired = opts.proofRequired != null
    ? normalizeList(opts.proofRequired)
    : normalizeList(bp.evidence_expectations);

  // Gate: taken ONLY from the caller (compiler verdict) or a pre-classified requirement. Never
  // computed here — and never defaulted to a no-gate class.
  const gate = str(opts.gate) || (req && str(req.gate)) || null;

  const mockRaw = opts.mock != null ? opts.mock : bp.mock;

  return Object.freeze({
    specCardId: str(opts.specCardId) || (reqId ? `SC-${reqId}` : null),
    requirementId: reqId,
    title: str(opts.title) || (req && str(req.title)) || reqId || "spec card",
    objective: str(bp.objective) || null,
    asked,
    doneCriteria: Object.freeze(doneCriteria.map((d) => Object.freeze(d))),
    nonGoals: Object.freeze(nonGoals),
    openQuestions: Object.freeze(openQuestions),
    proofRequired: Object.freeze(proofRequired),
    gate,
    approval: opts.approval != null ? opts.approval : req && req.approval ? req.approval : null,
    trace: opts.trace != null ? opts.trace : (req && req.trace) || null,
    mock: typeof mockRaw === "boolean" ? mockRaw : null,
  });
}

// A one-line, founder-readable meaning for each gate class the compiler may assign. Display copy
// only — it changes no behaviour and invents no class.
const GATE_MEANING = Object.freeze({
  OPERATIONAL_AUTONOMOUS: "Routine — the work itself needs no founder gate (the spec card still does)",
  TRUE_FOUNDER_GATE: "Founder gate — the work needs the founder's explicit go-ahead",
  HUMAN_EXPERT_GATE: "Expert gate — needs a human expert (legal / security) before it runs",
});

// normalizeCard(card) -> a frozen, normalized card. Idempotent, so both an engine-produced card and
// a raw hand-supplied one flow through the same honest shape. Never mutates the input.
function normalizeCard(card) {
  const c = card && typeof card === "object" ? card : {};
  const doneCriteria = (Array.isArray(c.doneCriteria) ? c.doneCriteria : [])
    .map(normalizeDoneCriterion)
    .filter(Boolean);
  const gate = str(c.gate) || null;
  return Object.freeze({
    specCardId: str(c.specCardId) || null,
    requirementId: str(c.requirementId) || null,
    title: str(c.title) || str(c.requirementId) || "spec card",
    objective: str(c.objective) || null,
    asked: str(c.asked) || null,
    doneCriteria: Object.freeze(doneCriteria.map((d) => Object.freeze(d))),
    nonGoals: Object.freeze(normalizeList(c.nonGoals)),
    openQuestions: Object.freeze(normalizeList(c.openQuestions)),
    proofRequired: Object.freeze(normalizeList(c.proofRequired)),
    gate,
    gateMeaning: gate ? GATE_MEANING[gate] || "Gate class not recognised" : null,
    approval: normalizeApproval(c.approval),
    trace: c.trace && typeof c.trace === "object" ? c.trace : null,
    mock: typeof c.mock === "boolean" ? c.mock : null,
  });
}

// deriveSpecCardView(snapshot) -> a PURE, frozen analysis view over a caller-supplied snapshot:
//   { source, collectedAt, card: <a spec card, engine-produced or raw> }
// It never mutates the input, never invents a field, and marks every gap out loud.
export function deriveSpecCardView(snapshot) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const source = s.source === "live" ? "live" : s.source === "fixture" ? "fixture" : UNKNOWN;
  const card = normalizeCard(s.card);

  const hasDone = card.doneCriteria.length > 0;
  const hasTestableDone = card.doneCriteria.some((d) => d.testable);
  const gateClassified = card.gate !== null;
  const approved = card.approval.approved;

  // The requirements-to-tests pipeline, each stage marked present/absent from the card ALONE.
  const stagePresent = {
    asked: !!card.asked,
    requirement: !!card.requirementId,
    done: hasDone,
    proof: card.proofRequired.length > 0,
    gate: gateClassified,
  };
  const pipeline = PIPELINE_STAGES.map((st) =>
    Object.freeze({ key: st.key, label: st.label, present: !!stagePresent[st.key] })
  );
  const pipelineReadyCount = pipeline.filter((p) => p.present).length;

  // N16: the founder approves the spec card BEFORE any lane spawns. Approval — and only approval —
  // gates lane spawn. An unapproved card can never be shown as spawnable.
  const laneMaySpawn = approved;
  const laneReason = approved
    ? "spec card approved — a lane may spawn (the lane's own gate still applies)"
    : "awaiting founder approval — no lane may spawn";

  // Quality warnings — surfaced, never used to silently pass or fabricate a missing part.
  const warnings = [];
  if (!card.asked) warnings.push('what the founder asked for is not captured');
  if (!hasDone) warnings.push('no testable definition of "done" — this feature cannot be proven complete');
  else if (!hasTestableDone) warnings.push('acceptance criteria are stated but none declare a test/proof — testability not established');
  if (card.nonGoals.length === 0) warnings.push('no explicit non-goals recorded — the scope boundary is undefined');
  if (!gateClassified) warnings.push('gate not classified — not assumed autonomous');
  if (card.proofRequired.length === 0) warnings.push('no proof/evidence requirement recorded');

  return Object.freeze({
    version: SPEC_CARD_ENGINE_VERSION,
    source, // "live" | "fixture" | "UNKNOWN"
    collectedAt: str(s.collectedAt) || null,
    readOnly: true,
    card,
    hasDone,
    hasTestableDone,
    gateClassified,
    approved,
    laneMaySpawn,
    laneReason,
    pipeline: Object.freeze(pipeline),
    pipelineReadyCount,
    pipelineTotal: PIPELINE_STAGES.length,
    warnings: Object.freeze(warnings),
    warningCount: warnings.length,
    killSwitches: Object.freeze(KILL_SWITCHES.slice()),
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
  live: "Live spec card",
  fixture: "Fixture (committed sample — not live)",
  [UNKNOWN]: "Unknown source",
});

const APPROVAL_LABEL = Object.freeze({
  approved: { tone: "ok", text: "approved" },
  rejected: { tone: "bad", text: "rejected" },
  awaiting: { tone: "warn", text: "awaiting founder approval" },
});

// ── Plain-text rendering (terminal/log + tests that assert content without HTML) ─────────────

// renderSpecCardText(snapshot) -> founder-readable plain text of the whole spec card. Pure.
export function renderSpecCardText(snapshot) {
  const v = deriveSpecCardView(snapshot);
  const c = v.card;
  const ap = APPROVAL_LABEL[c.approval.state];
  const lines = [
    `SPEC CARD — read-only; a plain-English contract for a feature, approves nothing`,
    `Source: ${SOURCE_LABEL[v.source]}`,
  ];
  if (v.collectedAt) lines.push(`Collected at: ${v.collectedAt}`);
  lines.push("");

  // HEADER.
  lines.push(`${c.title}${c.mock === true ? "  (MOCK — a placeholder, not a real card)" : ""}`);
  if (c.specCardId) lines.push(`  Card: ${c.specCardId}`);
  if (c.requirementId) lines.push(`  Requirement: ${c.requirementId}`);
  lines.push(`  Approval: ${ap.text.toUpperCase()}${c.approval.by ? `  (by ${c.approval.by})` : ""}${c.approval.at ? `  at ${c.approval.at}` : ""}`);
  lines.push(`  Lane: ${v.laneReason}`);
  if (c.gate) lines.push(`  Gate: ${c.gate} — ${c.gateMeaning}`);
  else lines.push(`  Gate: not classified (NOT assumed autonomous)`);
  lines.push("");

  // 1) WHAT THE FOUNDER ASKED FOR.
  lines.push(`WHAT THE FOUNDER ASKED FOR (as understood)`);
  lines.push(`  ${c.asked || "(not captured)"}`);
  if (c.objective) lines.push(`  Project objective: ${c.objective}`);
  lines.push("");

  // 2) WHAT "DONE" LOOKS LIKE.
  lines.push(`WHAT "DONE" LOOKS LIKE (testable)`);
  if (!v.hasDone) {
    lines.push(`  (no testable definition of "done" recorded — this feature cannot be proven complete)`);
  } else {
    for (const d of c.doneCriteria) lines.push(`  - ${d.text}  [${d.testable ? "testable" : "not shown to be testable"}]`);
  }
  lines.push("");

  // 3) WHAT IT WILL NOT DO.
  lines.push(`WHAT IT WILL NOT DO (non-goals)`);
  if (c.nonGoals.length === 0) lines.push(`  (no explicit non-goals recorded — the scope boundary is undefined)`);
  else for (const g of c.nonGoals) lines.push(`  - ${g}`);
  lines.push("");

  // 4) OPEN QUESTIONS.
  lines.push(`OPEN QUESTIONS`);
  if (c.openQuestions.length === 0) lines.push(`  (no open questions recorded)`);
  else for (const q of c.openQuestions) lines.push(`  - ${q}`);
  lines.push("");

  // PIPELINE + PROOF.
  lines.push(`REQUIREMENTS-TO-TESTS PIPELINE (${v.pipelineReadyCount}/${v.pipelineTotal} stages present)`);
  for (const p of v.pipeline) lines.push(`  [${p.present ? "x" : " "}] ${p.label}`);
  lines.push(`  Proof required: ${c.proofRequired.length ? c.proofRequired.join("; ") : "(none recorded)"}`);
  lines.push("");

  // WARNINGS.
  if (v.warnings.length) {
    lines.push(`OPEN CONCERNS`);
    for (const w of v.warnings) lines.push(`  ! ${w}`);
    lines.push("");
  }

  // SCOPE KILL-SWITCHES (reference only).
  lines.push(`SCOPE KILL-SWITCHES (reference — this surface fires none of them)`);
  for (const k of v.killSwitches) lines.push(`  · ${k}`);
  return lines.join("\n").replace(/\n+$/, "");
}

// ── HTML rendering (pure display; no behaviour) ──────────────────────────────────────────────

function chip(text, tone) {
  return `<span class="fg-chip fg-tone-${escapeHtml(tone)}">${escapeHtml(text)}</span>`;
}

function renderHeaderHtml(v) {
  const c = v.card;
  const ap = APPROVAL_LABEL[c.approval.state];
  const chips = [chip(ap.text, ap.tone)];
  if (c.gate) chips.push(chip(c.gate === "OPERATIONAL_AUTONOMOUS" ? "routine gate" : "founder/expert gate", c.gate === "OPERATIONAL_AUTONOMOUS" ? "info" : "warn"));
  else chips.push(chip("gate not classified", "warn"));
  if (c.mock === true) chips.push(chip("mock — placeholder, not a real card", "warn"));
  return [
    `  <section class="fg-header" aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>${escapeHtml(c.title)}</h2>${chips.join("")}</div>`,
    c.specCardId ? `    <p class="fg-meta">Card <code>${escapeHtml(c.specCardId)}</code>${c.requirementId ? ` · requirement <code>${escapeHtml(c.requirementId)}</code>` : ""}</p>` : ``,
    `    <p class="fg-note fg-${v.approved ? "ok" : "warn"}"><strong>${escapeHtml(v.laneReason)}</strong></p>`,
    c.approval.by || c.approval.at
      ? `    <p class="fg-meta">${c.approval.by ? `by ${escapeHtml(c.approval.by)}` : ""}${c.approval.at ? ` · at ${escapeHtml(c.approval.at)}` : ""}${c.approval.note ? ` · ${escapeHtml(c.approval.note)}` : ""}</p>`
      : ``,
    c.gate
      ? `    <p class="fg-note">Gate: <strong>${escapeHtml(c.gate)}</strong> — ${escapeHtml(c.gateMeaning)}</p>`
      : `    <p class="fg-note fg-warn">Gate not classified — it is <strong>not</strong> assumed to be the no-gate (autonomous) path.</p>`,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderListSection(title, subtitle, items, emptyText, renderItem) {
  const body = items.length
    ? [`    <ul class="fg-list">`, ...items.map(renderItem), `    </ul>`]
    : [`    <p class="fg-empty">${escapeHtml(emptyText)}</p>`];
  return [
    `  <section aria-readonly="true">`,
    `    <h2>${escapeHtml(title)}</h2>`,
    subtitle ? `    <p class="fg-note">${escapeHtml(subtitle)}</p>` : ``,
    ...body,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderAskedHtml(v) {
  const c = v.card;
  return [
    `  <section aria-readonly="true">`,
    `    <h2>What the founder asked for</h2>`,
    `    <p class="fg-note">As understood. Shown verbatim; nothing is added.</p>`,
    c.asked
      ? `    <p class="fg-body">${escapeHtml(c.asked)}</p>`
      : `    <p class="fg-empty">Not captured — what the founder asked for is not on record.</p>`,
    c.objective ? `    <p class="fg-meta">Project objective: ${escapeHtml(c.objective)}</p>` : ``,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderDoneHtml(v) {
  const c = v.card;
  if (!v.hasDone) {
    return [
      `  <section aria-readonly="true">`,
      `    <h2>What "done" looks like</h2>`,
      `    <p class="fg-empty">No testable definition of "done" recorded — this feature has no way to be proven complete. It is not invented.</p>`,
      `  </section>`,
    ].join("\n");
  }
  return renderListSection(
    'What "done" looks like',
    "The acceptance criteria bound to this requirement, verbatim. A criterion that declares how it is proven is marked testable.",
    c.doneCriteria,
    "",
    (d) =>
      `      <li>${escapeHtml(d.text)} ${chip(d.testable ? "testable" : "testability not shown", d.testable ? "ok" : "warn")}</li>`
  );
}

function renderPipelineHtml(v) {
  const rows = v.pipeline.map(
    (p) =>
      `      <li class="fg-stage fg-stage-${p.present ? "on" : "off"}"><span class="fg-stage-mark">${p.present ? "✓" : "—"}</span><span>${escapeHtml(p.label)}</span></li>`
  );
  return [
    `  <section aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>Requirements-to-tests pipeline</h2>${chip(`${v.pipelineReadyCount} of ${v.pipelineTotal} present`, v.pipelineReadyCount === v.pipelineTotal ? "ok" : "warn")}</div>`,
    `    <p class="fg-note">Each stage is marked present or absent from the card alone; a missing stage is shown, never assumed done.</p>`,
    `    <ul class="fg-stages">`,
    ...rows,
    `    </ul>`,
    `    <p class="fg-meta">Proof required: ${v.card.proofRequired.length ? escapeHtml(v.card.proofRequired.join("; ")) : "(none recorded)"}</p>`,
    `  </section>`,
  ].join("\n");
}

function renderWarningsHtml(v) {
  if (!v.warnings.length) return "";
  return [
    `  <section aria-readonly="true">`,
    `    <h2>Open concerns</h2>`,
    `    <ul class="fg-list fg-warn-list">`,
    ...v.warnings.map((w) => `      <li>${escapeHtml(w)}</li>`),
    `    </ul>`,
    `  </section>`,
  ].join("\n");
}

function renderKillSwitchHtml(v) {
  return [
    `  <section aria-readonly="true">`,
    `    <h2>Scope kill-switches</h2>`,
    `    <p class="fg-note">Commands the founder MAY issue elsewhere to bound scope. Shown for reference — this surface fires none of them.</p>`,
    `    <ul class="fg-list fg-switch-list">`,
    ...v.killSwitches.map((k) => `      <li><code>${escapeHtml(k)}</code></li>`),
    `    </ul>`,
    `  </section>`,
  ].join("\n");
}

// renderSpecCardHtml(snapshot) -> the composed body as an HTML fragment. Pure display; no
// <script>/form/button/input/on*/href.
export function renderSpecCardHtml(snapshot) {
  const v = deriveSpecCardView(snapshot);
  return [
    renderHeaderHtml(v),
    renderAskedHtml(v),
    renderDoneHtml(v),
    renderListSection(
      "What it will NOT do",
      "The declared non-goals. An undefined boundary is shown as such, never filled in.",
      v.card.nonGoals,
      "No explicit non-goals recorded — the scope boundary is undefined. It is not invented.",
      (g) => `      <li>${escapeHtml(g)}</li>`
    ),
    renderListSection(
      "Open questions",
      "Shown as recorded. An empty list is said out loud, never read as “all clear”.",
      v.card.openQuestions,
      "No open questions recorded.",
      (q) => `      <li>${escapeHtml(q)}</li>`
    ),
    renderPipelineHtml(v),
    renderWarningsHtml(v),
    renderKillSwitchHtml(v),
  ].filter(Boolean).join("\n");
}

// The self-contained style. Inlined so the rendered page is a PORTABLE evidence artifact that stands
// alone, using the shared founder palette for visual kinship with the sibling VB2 surfaces. Style
// only — no behaviour. Colour law: amber is reserved for a fact that deserves a second look (an
// unapproved card, a missing "done", an unclassified gate); a settled card stays calm.
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
    h2{font-size:16px;margin:0 0 4px}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.4em 0 0}
    .fg-note strong{color:var(--text)}
    .fg-note.fg-warn,.fg-warn{color:var(--amber)}
    .fg-note.fg-ok,.fg-ok{color:var(--green)}
    .fg-meta{color:var(--dim);font-size:12px;margin:.3em 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fg-body{margin:.5em 0 0}
    section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-head-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
    .fg-chip{font-size:11.5px;border-radius:999px;padding:1px 9px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
    .fg-tone-ok{color:var(--green);border-color:rgba(34,197,94,.4)}
    .fg-tone-bad{color:var(--red);border-color:rgba(242,109,109,.5)}
    .fg-tone-warn{color:var(--amber);border-color:rgba(245,184,61,.45)}
    .fg-tone-info{color:var(--blue);border-color:rgba(59,130,246,.4)}
    .fg-tone-muted{color:var(--muted)}
    .fg-list{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
    .fg-list li{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:9px 13px}
    .fg-warn-list li{border-color:rgba(245,184,61,.35)}
    .fg-switch-list li{background:transparent;border-style:dashed}
    .fg-empty{color:var(--muted);margin:.5em 0 0}
    .fg-stages{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
    .fg-stage{display:flex;align-items:center;gap:12px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:9px 13px}
    .fg-stage-mark{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;width:1.2em;text-align:center}
    .fg-stage-on{border-color:rgba(34,197,94,.35)}
    .fg-stage-on .fg-stage-mark{color:var(--green)}
    .fg-stage-off{opacity:.7}
    .fg-stage-off .fg-stage-mark{color:var(--amber)}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--text)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderSurfaceHtml(snapshot) -> a COMPLETE, self-contained founder-readable page. Pure: same
// snapshot in, byte-identical page out (no clock, no randomness). It carries NO <script>, <form>,
// <button>, <input>, on* handler, or navigable link (<a href>) — observably read-only.
export function renderSurfaceHtml(snapshot) {
  const v = deriveSpecCardView(snapshot);
  const srcTone = v.source === "live" ? "info" : v.source === "fixture" ? "muted" : "warn";
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Spec Card — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Spec Card</h1>`,
    `    <p class="fg-sub">A plain-English contract for one feature — what the founder asked for, what "done" looks like, what it will <em>not</em> do, and the open questions — read before any lane spawns. A card with no approval record is shown as <em>awaiting founder approval</em>, never assumed approved; a missing part is said out loud, never invented. This surface only shows the card; it approves nothing and spawns no lane.</p>`,
    `    <div class="fg-head-row">${chip(SOURCE_LABEL[v.source], srcTone)}${v.collectedAt ? `<span class="fg-meta">collected ${escapeHtml(v.collectedAt)}</span>` : ""}</div>`,
    renderSpecCardHtml(snapshot),
    `    <p class="fg-foot">Read-only view · an unapproved card is never assumed approved · a missing "done"/non-goal/gate is never invented · approving a card and spawning its lane is a later, separately-gated act, not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

// renderSurfaceText(snapshot) -> plain-text dedicated surface. Pure. Convenience alias so callers
// have a symmetric {Html,Text} pair like the other VB2 surfaces.
export function renderSurfaceText(snapshot) {
  return renderSpecCardText(snapshot);
}
