// Founder demo — a deterministic, plain-English end-to-end story stitching together
// the URL-drop intake, the founder view (command-center summary + status-cards detail),
// and the evidence decision package.
//
// Plain English: a non-developer founder drops a URL (Stage 1 — URL check), sees whether
// the run is alive and its evidence is fresh (Stage 2 — Run status), and reads the evidence
// verdict + honest readiness (Stage 3 — Decision), then gets one truthful "Bottom line:"
// takeaway. Nothing here invents state — every stage reuses an existing, already-audited
// module read-only, so UNKNOWN stays UNKNOWN all the way through. This module NEVER claims
// production, commercial, or "green" readiness.
//
// Pure + deterministic: no I/O, no network, no clock, no randomness. `nowMs` is passed in.
import { buildFounderView, renderFounderView } from "../founder-view/founder-view.mjs";
import { buildIntakeView } from "../../founder_url_drop/intake/url-intake.mjs";
import { buildDecisionPackage } from "../../evidence/decision-package/decision-package.mjs";

export const UNKNOWN = "UNKNOWN";

// Plain-language label for the URL result: distinguishes an explicit BLOCKED (unsafe/
// unclear input) from a merely unsupported host, without inventing a new classification.
function urlStatusLabel(intake) {
  if (intake.accepted) return "ACCEPTED";
  if (intake.classification === "BLOCKED") return "BLOCKED";
  return "NOT ACCEPTED";
}

function renderUrlCheck(intake) {
  const status = urlStatusLabel(intake);
  return [
    "Stage 1 — URL check:",
    `  you dropped: ${intake.input}`,
    `  result: ${status} (${intake.classification})`,
    `  why: ${intake.reason}`,
    `  next step: ${intake.next_step}`,
  ].join("\n");
}

function renderRunStatus(founder_view) {
  return ["Stage 2 — Run status:", renderFounderView(founder_view)].join("\n");
}

function renderDecision(decision) {
  const limitationLines = decision.limitations.length
    ? decision.limitations.map((l) => `    - ${l}`)
    : ["    - (none recorded — treat as UNKNOWN)"];
  return [
    "Stage 3 — Decision:",
    `  verdict: ${decision.verdict}`,
    `  readiness: ${decision.readiness} (this is NOT a production, commercial, or "green" readiness claim)`,
    `  limitations:`,
    ...limitationLines,
  ].join("\n");
}

// One truthful, one-line takeaway. Says UNKNOWN wherever the underlying inputs are missing —
// never upgrades a missing value into an implied pass.
function renderBottomLine({ intake, founder_view, decision }) {
  const urlPart = `URL ${urlStatusLabel(intake).toLowerCase()}`;
  const runPart = `run is ${founder_view.headline.liveness}`;
  const verdictPart = decision.verdict === UNKNOWN ? "verdict is UNKNOWN" : `verdict is ${decision.verdict}`;
  return `Bottom line: ${urlPart}, ${runPart}, ${verdictPart}, readiness is ${decision.readiness}. Demo only — not a production or commercial certification.`;
}

function renderPlainEnglish({ intake, founder_view, decision }) {
  return [
    renderUrlCheck(intake),
    "",
    renderRunStatus(founder_view),
    "",
    renderDecision(decision),
    "",
    renderBottomLine({ intake, founder_view, decision }),
  ].join("\n");
}

// Build the full founder demo from real inputs. Missing inputs surface as UNKNOWN
// through the underlying modules — this function never fabricates a value itself.
export function buildFounderDemo({ runId, state, heartbeat, evidence, nowMs, url, decisionInputs } = {}) {
  const intake = buildIntakeView(url);
  const founder_view = buildFounderView({ runId, state, heartbeat, evidence, nowMs });
  const decision = buildDecisionPackage(decisionInputs);
  const bottom_line = renderBottomLine({ intake, founder_view, decision });
  const plain_english = renderPlainEnglish({ intake, founder_view, decision });

  return Object.freeze({
    title: "Founder Demo",
    intake,
    founder_view,
    decision,
    bottom_line,
    plain_english,
  });
}

export function renderFounderDemoText(demo) {
  return demo.plain_english;
}
