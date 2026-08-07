// FounderGate V8-B VB2 — UNIFIED LANE ROUTER (read-only, NON-EXECUTING).
//
// Plain English: work reaches FounderGate through two separate queues that speak
// different dialects. The ARLC lifecycle controller (repository / branch / PR / lane
// orchestration) tracks lanes in states like READY / RUNNING / CLOSED and marks the ones
// that need a founder. The ARE run envelope (blueprint -> plan -> lanes -> runs ->
// evidence) tracks its own lanes in run states like PLAN_CHECKED / TRUE_FOUNDER_GATE /
// PASS. Until now there was no single place that answered one founder question across
// BOTH: "of everything in flight, what goes to the backend on its own, and what actually
// needs me?" This module is that unified router — and NOTHING ELSE:
//   - It is PURE and read-only: every function takes queue snapshots and RETURNS a plain
//     object or a STRING. It never acts, approves, runs, merges, or executes anything.
//   - NO side effects: no fs, no network, no child_process, no clock, no randomness. The
//     routing is DERIVED from the snapshots the caller supplies — VB2 never invents state
//     (Law 54); an unroutable-because-unknown unit fails CLOSED to the founder, never
//     silently to the backend.
//   - It REUSES the frozen law, it does not fork it: destinations are derived from the
//     frozen gate-router classification (classifyGate / GATE_TYPES) so the router routes by
//     the same taxonomy the gate-router already enforces, and the data-class boundary is
//     the frozen cto-queue rule (isDisplayableClass / REDACTED).
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>,
//     <form>, <button>, on* handler, or navigable link. Naming WHERE a lane routes is not
//     the same as sending it there — the act edge (approve / run / merge) stays VB3.
//
// Honesty over completeness: a unit whose data class is not displayable keeps its STRUCTURE
// visible (id, source, destination — routing is not content) but its human title is redacted;
// its content is never summarised in the clear. Counts are zero-filled per bucket so an
// absent source / destination reads as 0, never omitted, never guessed.

import { classifyGate, GATE_TYPES } from "../gate-router/gate-router.mjs";
import { isDisplayableClass, REDACTED } from "./cto-queue.mjs";

export const ROUTER_VERSION = "1.0.0";

// The two upstream queues this router unifies. An unrecognised source is said out loud as
// UNKNOWN rather than coerced into one of these (Law 54).
export const SOURCES = Object.freeze(["ARLC", "ARE"]);
export const SRC_UNKNOWN = "UNKNOWN";

// Where a lane routes. This is the founder-facing destination taxonomy — the single answer
// the unified router produces regardless of which dialect a unit arrived in.
//   TERMINAL_0    routine, mechanically-qualified backend work (no founder gate)
//   FOUNDER_INBOX a true founder decision (also the fail-closed sink for UNKNOWN)
//   HUMAN_EXPERT  legal / security / IP / expert judgment
//   HOLD          correctable backend hold (checker findings, invalid/held blueprint)
//   BLOCKED       blocked; not routable forward until unblocked
//   DONE          already resolved / terminal; nothing left to route
export const DESTINATIONS = Object.freeze([
  "TERMINAL_0", "FOUNDER_INBOX", "HUMAN_EXPERT", "HOLD", "BLOCKED", "DONE",
]);

// Frozen gate-type -> destination. Every gate-router GATE_TYPE has exactly one destination;
// UNKNOWN fails CLOSED to the founder (never to the backend).
const GATE_TO_DEST = Object.freeze({
  OPERATIONAL_AUTONOMOUS: "TERMINAL_0",
  TRUE_FOUNDER_GATE: "FOUNDER_INBOX",
  HUMAN_EXPERT_GATE: "HUMAN_EXPERT",
  HOLD_CORRECTABLE: "HOLD",
  BLOCKED: "BLOCKED",
  UNKNOWN: "FOUNDER_INBOX", // fail closed
});

// Founder-readable label + one-line "why" per destination. Presentation only, no behaviour.
const DEST_LABEL = Object.freeze({
  TERMINAL_0: "Backend (Terminal-0)",
  FOUNDER_INBOX: "Founder decision",
  HUMAN_EXPERT: "Human expert",
  HOLD: "Held (correctable)",
  BLOCKED: "Blocked",
  DONE: "Done",
});
const DEST_WHY = Object.freeze({
  TERMINAL_0: "routine mechanically-qualified work — proceeds without a founder gate",
  FOUNDER_INBOX: "needs a genuine founder decision",
  HUMAN_EXPERT: "needs legal / security / IP / expert judgment",
  HOLD: "on a correctable backend hold",
  BLOCKED: "blocked — cannot route forward until unblocked",
  DONE: "already resolved — nothing left to route",
});

// Triage order: what most needs a human is shown first, backend/done last. Deterministic.
const DEST_ORDER = Object.freeze(["FOUNDER_INBOX", "HUMAN_EXPERT", "BLOCKED", "HOLD", "TERMINAL_0", "DONE"]);
const destRank = (d) => { const i = DEST_ORDER.indexOf(d); return i < 0 ? DEST_ORDER.length : i; };

// ---- Native-state reconciliation ----------------------------------------------------
// Both dialects are reconciled into the frozen gate-type taxonomy WITHOUT re-deriving it:
// where a native state already names a gate, we honour it; otherwise we defer to the
// frozen classifyGate. Nothing here invents a state that the source did not report.

// ARE run-envelope terminal states + ARLC closed states -> DONE (already resolved).
const TERMINAL_STATES = new Set([
  // ARE (src/autonomous-run/run-envelope.mjs TERMINAL)
  "PASS", "PASS_WITH_LIMITATIONS", "NOT_PASSED", "INSUFFICIENT_EVIDENCE", "CANCELLED", "SUPERSEDED",
  // ARLC lifecycle closed states
  "CLOSED", "MERGED", "DONE", "RESOLVED", "EXPIRED", "REJECTED",
]);

// Native states that ARE a gate (they carry their destination in their name).
const STATE_AS_GATE = Object.freeze({
  TRUE_FOUNDER_GATE: "TRUE_FOUNDER_GATE",
  HUMAN_EXPERT_GATE: "HUMAN_EXPERT_GATE",
  BLOCKED: "BLOCKED",
});

// Correctable backend holds (checker findings, held / invalid blueprint, explicit hold).
const HOLD_STATES = new Set([
  "CHECKER_FINDINGS", "BLUEPRINT_HELD", "BLUEPRINT_INVALID", "HOLD", "HOLD_CORRECTABLE", "PARKED",
]);

// Routine states that proceed on the backend without a founder gate (ARE run progression +
// ARLC routine lifecycle). Listed explicitly so an UNLISTED state fails closed rather than
// being assumed routine.
const OPERATIONAL_STATES = new Set([
  // ARE
  "BLUEPRINT_RECEIVED", "BLUEPRINT_ACCEPTED", "PLAN_COMPILED", "PLAN_CHECKED", "READY_TO_RUN",
  "RUNNING", "ROUTINE_CORRECTION", "RECOVERING", "EVIDENCE_SEALING", "CHECKER_REQUIRED", "ADVISOR_REQUIRED",
  // ARLC
  "READY", "QUEUED", "QUALIFYING", "RECONCILING", "DETECTED", "CLASSIFIED", "ROUTED", "RESUMED",
]);

// gateTypeFor(unit) -> a frozen GATE_TYPE. Precedence (highest first), each step honest:
//   1. an explicit, valid declared_type wins (the caller stated the gate outright);
//   2. a native state that names a gate is honoured;
//   3. a native terminal / hold state maps to its structural disposition;
//   4. a requested_authority is classified by the FROZEN gate-router law;
//   5. a lane that declares founder_gate_required routes to the founder;
//   6. a listed routine state proceeds on the backend;
//   7. anything else is UNKNOWN and fails closed to the founder.
function gateTypeFor(unit) {
  const state = typeof unit.state === "string" ? unit.state : "";
  if (GATE_TYPES.includes(unit.declared_type) && unit.declared_type !== "UNKNOWN") return unit.declared_type;
  if (TERMINAL_STATES.has(state)) return "DONE_STATE"; // sentinel handled by routeUnit
  if (Object.prototype.hasOwnProperty.call(STATE_AS_GATE, state)) return STATE_AS_GATE[state];
  if (HOLD_STATES.has(state)) return "HOLD_CORRECTABLE";
  const auth = typeof unit.requested_authority === "string" ? unit.requested_authority.trim() : "";
  if (auth !== "") return classifyGate({ requested_authority: auth });
  if (unit.founder_gate_required === true) return "TRUE_FOUNDER_GATE";
  if (OPERATIONAL_STATES.has(state)) return "OPERATIONAL_AUTONOMOUS";
  return "UNKNOWN"; // fail closed -> FOUNDER_INBOX
}

// normalizeUnit(raw, source) -> a frozen, routed, redaction-safe lane record. PURE.
// Requires an id: a routable unit that cannot be named cannot be routed (fail closed by
// throwing — the router never invents an identity). `source` is honoured if it is a known
// SOURCE, else reported as UNKNOWN (never coerced). Redaction: a non-displayable data class
// keeps STRUCTURE (id / source / state / destination) but its human title is REDACTED.
export function normalizeUnit(raw, source) {
  if (!raw || typeof raw !== "object") throw new LaneRouterError("routable unit must be an object");
  const id = raw.id ?? raw.lane_id ?? raw.run_id;
  if (typeof id !== "string" || id === "") throw new LaneRouterError("routable unit is missing an id");
  const src = SOURCES.includes(source) ? source : SRC_UNKNOWN;
  const data_class = typeof raw.data_class === "string" ? raw.data_class : "UNKNOWN";
  const displayable = isDisplayableClass(data_class);
  const gate = gateTypeFor(raw);
  const destination = gate === "DONE_STATE" ? "DONE" : GATE_TO_DEST[gate] ?? "FOUNDER_INBOX";
  const gate_type = gate === "DONE_STATE" ? "TERMINAL" : gate;
  const rawTitle = typeof raw.title === "string" ? raw.title : "";
  return Object.freeze({
    id,
    source: src,
    state: typeof raw.state === "string" ? raw.state : "UNKNOWN",
    gate_type,
    destination,
    protected: !displayable,
    // content-bearing; redacted when the class is not displayable
    title: displayable ? rawTitle : REDACTED,
  });
}

// routeQueues({ arlc, are }) -> a PURE unified, triage-ordered routed list. Read-only:
// every item from each snapshot is normalised and routed; the inputs are never mutated. The
// ordering is deterministic (destination triage rank, then source, then id) with no clock or
// randomness, so the same snapshots yield a byte-identical list. Unrecognised container
// shapes contribute no items (an absent queue is 0 items, said out loud, never guessed).
export function routeQueues(queues) {
  const q = queues && typeof queues === "object" ? queues : {};
  const units = [
    ...itemsOf(q.arlc).map((u) => normalizeUnit(u, "ARLC")),
    ...itemsOf(q.are).map((u) => normalizeUnit(u, "ARE")),
  ];
  units.sort((a, b) =>
    destRank(a.destination) - destRank(b.destination) ||
    a.source.localeCompare(b.source) ||
    a.id.localeCompare(b.id));
  return units;
}

// Accept either a bare array of units or a `{ items: [...] }` / `{ jobs: [...] }` / `{ lanes:
// [...] }` container. Anything else contributes nothing (0 items) — never invented.
function itemsOf(snapshot) {
  if (Array.isArray(snapshot)) return snapshot;
  if (snapshot && typeof snapshot === "object") {
    for (const key of ["items", "jobs", "lanes", "units"]) {
      if (Array.isArray(snapshot[key])) return snapshot[key];
    }
  }
  return [];
}

// routingDigest({ arlc, are }) -> a PURE derived summary. Honest: every source and every
// destination bucket is present and zero-filled, so an absent bucket reads as 0 (Law 54).
// `protected` counts units whose content is hidden (their routing is still counted — the
// founder always sees WHERE protected work goes, only not WHAT it is).
export function routingDigest(queues) {
  const routed = routeQueues(queues);
  const by_source = Object.fromEntries([...SOURCES, SRC_UNKNOWN].map((s) => [s, 0]));
  const by_destination = Object.fromEntries(DESTINATIONS.map((d) => [d, 0]));
  let protectedCount = 0;
  for (const u of routed) {
    by_source[u.source] += 1;
    if (Object.prototype.hasOwnProperty.call(by_destination, u.destination)) by_destination[u.destination] += 1;
    if (u.protected) protectedCount += 1;
  }
  // Founder-facing headline: how many of the total actually need a human right now.
  const needs_human = by_destination.FOUNDER_INBOX + by_destination.HUMAN_EXPERT;
  return { total: routed.length, by_source, by_destination, needs_human, protected: protectedCount };
}

export class LaneRouterError extends Error {
  constructor(message) { super(message); this.name = "LaneRouterError"; }
}

// ---- Read-only presentation (pure strings) ------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// renderDigestText({arlc,are}) -> founder-readable one-glance summary. Pure.
export function renderDigestText(queues) {
  const d = routingDigest(queues);
  const dests = DESTINATIONS.map((k) => `${DEST_LABEL[k]}: ${d.by_destination[k]}`);
  const lines = [
    `LANE ROUTING — SUMMARY (read-only; names where work routes, sends nothing)`,
    `In flight across ARLC + ARE: ${d.total}   (needs a human now: ${d.needs_human})`,
    `  By source — ARLC: ${d.by_source.ARLC}  ·  ARE: ${d.by_source.ARE}` +
      (d.by_source.UNKNOWN ? `  ·  Unknown: ${d.by_source.UNKNOWN}` : ""),
    `  By destination — ${dests.join("  ·  ")}`,
  ];
  if (d.protected > 0) lines.push(`  Protected (content hidden, still routed): ${d.protected}`);
  return lines.join("\n");
}

// renderRoutedText({arlc,are}) -> plain-text routed list (triage-ordered). Pure. Redaction
// flows through: a protected unit shows its id + destination but never its title/content.
export function renderRoutedText(queues) {
  const routed = routeQueues(queues);
  if (routed.length === 0) return "No lanes in flight. (Read-only; nothing to route.)";
  const lines = [];
  for (const u of routed) {
    lines.push(`[${DEST_LABEL[u.destination]}] ${u.title || "(untitled)"}`);
    lines.push(`    ${u.source} · ${u.id} · state ${u.state} · ${DEST_WHY[u.destination]}`);
  }
  return lines.join("\n");
}

// renderDigestHtml({arlc,are}) -> a row of stat cards. Pure display: no <script>, form,
// button, handler, or link — nothing an interaction can ride.
export function renderDigestHtml(queues) {
  const d = routingDigest(queues);
  const cards = [statCard("In flight", d.total, "fg-stat-total")];
  cards.push(statCard("Needs a human", d.needs_human, "fg-stat-founder"));
  for (const k of DESTINATIONS) {
    cards.push(statCard(DEST_LABEL[k], d.by_destination[k], `fg-stat-${escapeHtml(k.toLowerCase())}`));
  }
  if (d.protected > 0) cards.push(statCard("Protected", d.protected, "fg-stat-protected"));
  return [
    `<section class="fg-route-digest" aria-readonly="true">`,
    `  <h2>Routing summary</h2>`,
    `  <p class="fg-note">A read-only count of where in-flight work is routed across the ARLC lifecycle and ARE run queues. Nothing here approves, runs, merges, or sends anything.</p>`,
    `  <div class="fg-stat-row">`,
    ...cards,
    `  </div>`,
    `</section>`,
  ].join("\n");
}

function statCard(label, value, cls) {
  return (
    `    <div class="fg-stat ${cls}">` +
    `<span class="fg-stat-value">${escapeHtml(value)}</span>` +
    `<span class="fg-stat-label">${escapeHtml(label)}</span>` +
    `</div>`
  );
}

// renderRoutedHtml({arlc,are}) -> the routed list as read-only cards. Pure. No affordance.
export function renderRoutedHtml(queues) {
  const routed = routeQueues(queues);
  if (routed.length === 0) {
    return `<section class="fg-route-list" aria-readonly="true"><p class="fg-empty">No lanes in flight. This is a read-only surface — it only shows routing and never sends work anywhere.</p></section>`;
  }
  const rows = routed.map((u) => [
    `    <li class="fg-route-item">`,
    `      <span class="fg-dest fg-dest-${escapeHtml(u.destination.toLowerCase())}">${escapeHtml(DEST_LABEL[u.destination])}</span>`,
    `      <span class="fg-title">${escapeHtml(u.title || "(untitled)")}</span>`,
    `      <div class="fg-meta">${escapeHtml(u.source)} · <span class="fg-id">${escapeHtml(u.id)}</span> · state ${escapeHtml(u.state)}</div>`,
    `      <div class="fg-why">${escapeHtml(DEST_WHY[u.destination])}</div>`,
    `    </li>`,
  ].join("\n"));
  return [
    `<section class="fg-route-list" aria-readonly="true">`,
    `  <h2>Routed lanes</h2>`,
    `  <ul class="fg-route-ul">`,
    ...rows,
    `  </ul>`,
    `</section>`,
  ].join("\n");
}

const SURFACE_STYLE = `
    :root{
      --bg:#0d1117;--panel:#161c26;--panel2:#1b2230;--line:#2a3344;
      --text:#e6ebf2;--muted:#93a0b4;--dim:#6b7789;
      --blue:#3b82f6;--green:#22c55e;--amber:#f5b83d;--purple:#a78bfa;--red:#ef4444;--radius:12px;
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);
      font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
    .fg-wrap{max-width:920px;margin:0 auto;padding:32px 20px 56px}
    .fg-eyebrow{color:var(--purple);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600}
    h1{font-size:27px;margin:.2em 0 .1em}
    h2{font-size:16px;margin:0 0 .4em}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.1em 0 14px}
    section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-stat-row{display:flex;flex-wrap:wrap;gap:12px}
    .fg-stat{flex:1 1 120px;background:var(--panel2);border:1px solid var(--line);
      border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}
    .fg-stat-value{font-size:26px;font-weight:700}
    .fg-stat-label{color:var(--muted);font-size:12.5px}
    .fg-stat-founder .fg-stat-value,.fg-stat-founder_inbox .fg-stat-value{color:var(--amber)}
    .fg-stat-human_expert .fg-stat-value{color:var(--amber)}
    .fg-stat-blocked .fg-stat-value{color:var(--red)}
    .fg-stat-terminal_0 .fg-stat-value,.fg-stat-done .fg-stat-value{color:var(--green)}
    .fg-stat-hold .fg-stat-value,.fg-stat-protected .fg-stat-value{color:var(--purple)}
    .fg-route-ul{list-style:none;margin:0;padding:0}
    .fg-route-item{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:0 0 10px;background:var(--panel2)}
    .fg-dest{display:inline-block;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;
      border-radius:999px;padding:1px 8px;margin-right:6px;color:var(--muted);border:1px solid var(--line)}
    .fg-dest-founder_inbox,.fg-dest-human_expert{color:var(--amber);border-color:rgba(245,184,61,.4)}
    .fg-dest-blocked{color:var(--red);border-color:rgba(239,68,68,.4)}
    .fg-dest-terminal_0,.fg-dest-done{color:var(--green);border-color:rgba(34,197,94,.35)}
    .fg-dest-hold{color:var(--purple);border-color:rgba(167,139,250,.4)}
    .fg-title{font-weight:600}
    .fg-id{color:var(--dim);font-size:12px}
    .fg-meta{color:var(--muted);font-size:12.5px;margin-top:4px}
    .fg-why{color:var(--dim);font-size:12.5px;margin-top:4px}
    .fg-empty{color:var(--muted)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderSurfaceHtml({arlc,are}) -> a COMPLETE, self-contained founder-readable page. Pure:
// same snapshots in, byte-identical page out (no clock, no randomness). It composes the
// derived routing summary and the triage-ordered routed list into one dedicated surface. It
// carries NO <script>, <form>, <button>, on* handler, or navigable link — the page is
// observably read-only. Data-class redaction flows through: a protected lane's content
// never appears in the clear on this surface either.
export function renderSurfaceHtml(queues) {
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Lane Routing — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Lane Routing</h1>`,
    `    <p class="fg-sub">One view of everything in flight across the ARLC lifecycle queue and the ARE run queue, and where each lane routes — to the backend on its own, or to you. This surface only shows the routing; it approves nothing, runs nothing, merges nothing, and sends nothing.</p>`,
    indent(renderDigestHtml(queues)),
    indent(renderRoutedHtml(queues)),
    `    <p class="fg-foot">Read-only view · naming a destination is not sending there · the act edge (approve / run / merge) is not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

function indent(block) {
  return block.split("\n").map((l) => (l === "" ? l : `    ${l}`)).join("\n");
}

// renderSurfaceText({arlc,are}) -> plain-text dedicated surface (summary + routed list).
// Pure. Useful for a terminal/log rendering and for tests that assert content without HTML.
export function renderSurfaceText(queues) {
  return [renderDigestText(queues), "", renderRoutedText(queues)].join("\n");
}
