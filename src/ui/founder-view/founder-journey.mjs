// Founder journey — names the 5 steps of the no-terminal path and their current,
// truthful state. Builds on top of founder-view.mjs (read-only reuse) rather than
// re-deriving lifecycle/liveness/evidence signals.
//
// Plain English: a founder using the no-terminal path moves through 5 named stages —
// Objective, URL intake, Run status, Evidence, Decision. Each stage's state is reported
// truthfully: if the underlying signal was never supplied, the state is UNKNOWN. Nothing
// here is ever invented, and nothing here ever claims production, commercial,
// customer-ready, or "green" status.
//
// Pure + deterministic: no I/O, no clock, no randomness. `nowMs` (via viewInputs) is
// passed in by the caller, same as founder-view.mjs.
import { buildFounderView } from "./founder-view.mjs";

export const UNKNOWN = "UNKNOWN";

const STEP_NAMES = ["Objective", "URL intake", "Run status", "Evidence", "Decision"];
const ALLOWED_DECISIONS = new Set(["PROCEED", "HOLD", "REJECTED"]);

function nonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function objectiveState(objective) {
  return nonEmptyString(objective) ? "SET" : UNKNOWN;
}

function urlIntakeState(url) {
  return nonEmptyString(url) ? "RECEIVED" : UNKNOWN;
}

function runStatusState(view) {
  return view.headline.lifecycle || UNKNOWN;
}

function evidenceState(view) {
  // "NONE" (no evidence items supplied at all) collapses to UNKNOWN here too —
  // from the journey's perspective, no evidence and undeterminable evidence are
  // both "not proven", and this step must never claim more than that.
  const f = view.headline.evidence_freshness;
  return f && f !== "NONE" ? f : UNKNOWN;
}

function decisionState(decision) {
  if (!nonEmptyString(decision)) return UNKNOWN;
  const d = decision.trim().toUpperCase();
  return ALLOWED_DECISIONS.has(d) ? d : UNKNOWN;
}

function buildPlainEnglish(objectiveOut, steps, view) {
  const lines = [
    `Objective: ${objectiveOut}`,
    "",
    "FOUNDER JOURNEY — the 5 steps of the no-terminal path (truthful; UNKNOWN when unproven)",
  ];
  for (const s of steps) lines.push(`Step ${s.n} of 5 — ${s.name}: ${s.state}`);
  lines.push("");
  lines.push(
    `Run detail: run=${view.run_id} | lifecycle=${view.headline.lifecycle} | liveness=${view.headline.liveness} | evidence=${view.headline.evidence_freshness}`
  );
  lines.push("");
  lines.push(
    "NOT a production, commercial, or customer readiness claim. Every step above is UNKNOWN unless proven by real input."
  );
  return lines.join("\n");
}

// Build the founder journey from truthful inputs. `objective` names the founder's goal;
// every other key is passed through (read-only) to buildFounderView, which already
// honors UNKNOWN for missing run/heartbeat/evidence signals.
export function buildFounderJourney(inputs = {}) {
  const { objective, url, decision } = inputs;
  const view = buildFounderView(inputs);
  const objectiveOut = nonEmptyString(objective) ? objective : UNKNOWN;

  const steps = Object.freeze([
    Object.freeze({ n: 1, name: STEP_NAMES[0], state: objectiveState(objective) }),
    Object.freeze({ n: 2, name: STEP_NAMES[1], state: urlIntakeState(url) }),
    Object.freeze({ n: 3, name: STEP_NAMES[2], state: runStatusState(view) }),
    Object.freeze({ n: 4, name: STEP_NAMES[3], state: evidenceState(view) }),
    Object.freeze({ n: 5, name: STEP_NAMES[4], state: decisionState(decision) }),
  ]);

  return Object.freeze({
    title: "Founder Journey",
    objective: objectiveOut,
    steps,
    view,
    plain_english: buildPlainEnglish(objectiveOut, steps, view),
  });
}

// Deterministic render: the plain-English narrative already computed at build time.
export function renderFounderJourney(j) {
  return j.plain_english;
}
