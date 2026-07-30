// Founder demo — a deterministic, plain-English end-to-end story stitching together
// the URL-drop intake, the founder view (command-center summary + status-cards detail),
// and the evidence decision package.
//
// Plain English: a non-developer founder drops a URL (stage 1), sees whether the run
// is alive and its evidence is fresh (stage 2), and reads the evidence verdict + honest
// readiness (stage 3). Nothing here invents state — every stage reuses an existing,
// already-audited module read-only, so UNKNOWN stays UNKNOWN all the way through.
//
// Pure + deterministic: no I/O, no network, no clock, no randomness. `nowMs` is passed in.
import { buildFounderView, renderFounderView } from "../founder-view/founder-view.mjs";
import { buildIntakeView } from "../../founder_url_drop/intake/url-intake.mjs";
import { buildDecisionPackage } from "../../evidence/decision-package/decision-package.mjs";

export const UNKNOWN = "UNKNOWN";

function renderPlainEnglish({ intake, founder_view, decision }) {
  const stage1 = [
    "Stage 1 — you dropped a URL:",
    `  input: ${intake.input}`,
    `  result: ${intake.accepted ? "ACCEPTED" : "NOT ACCEPTED"} (${intake.classification}) — ${intake.reason}`,
    `  next: ${intake.next_step}`,
  ].join("\n");

  const stage2 = [
    "Stage 2 — is the run alive, and is its evidence fresh?",
    renderFounderView(founder_view),
  ].join("\n");

  const stage3 = [
    "Stage 3 — what does the evidence decide?",
    `  verdict: ${decision.verdict}`,
    `  readiness: ${decision.readiness} (certifies_green=${decision.certifies_green}, certifies_production=${decision.certifies_production})`,
  ].join("\n");

  return [stage1, "", stage2, "", stage3].join("\n");
}

// Build the full founder demo from real inputs. Missing inputs surface as UNKNOWN
// through the underlying modules — this function never fabricates a value itself.
export function buildFounderDemo({ runId, state, heartbeat, evidence, nowMs, url, decisionInputs } = {}) {
  const intake = buildIntakeView(url);
  const founder_view = buildFounderView({ runId, state, heartbeat, evidence, nowMs });
  const decision = buildDecisionPackage(decisionInputs);
  const plain_english = renderPlainEnglish({ intake, founder_view, decision });

  return Object.freeze({
    title: "Founder Demo",
    intake,
    founder_view,
    decision,
    plain_english,
  });
}

export function renderFounderDemoText(demo) {
  return demo.plain_english;
}
