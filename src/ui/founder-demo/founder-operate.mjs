// Founder operate — a single readable entrypoint a non-developer founder can follow:
// OBJECTIVE -> URL INTAKE -> RUN STATUS -> EVIDENCE -> DECISION.
//
// Plain English: this states the founder's stated objective up front, then walks the
// five steps of the story in order (intake, run status, evidence freshness, decision,
// bottom line) as short one-line summaries, then reuses the existing founder-demo
// narrative (read-only) as the detailed body. It invents nothing new: every field comes
// from buildFounderDemo, so UNKNOWN stays UNKNOWN and this module NEVER claims
// production, commercial, customer-ready, or "green" readiness.
//
// Pure + deterministic: no I/O, no network, no clock, no randomness. `nowMs` is passed
// in (via demoInputs, same as buildFounderDemo).
import { buildFounderDemo, renderFounderDemoText } from "./founder-demo.mjs";

export const UNKNOWN = "UNKNOWN";

function safeObjective(objective) {
  return typeof objective === "string" && objective.trim().length > 0 ? objective : UNKNOWN;
}

// Five ordered step summaries — the same story a founder would narrate out loud.
function buildSteps(demo) {
  const { intake, founder_view, decision } = demo;
  const headline = founder_view.headline;
  return Object.freeze([
    Object.freeze({
      step: 1,
      name: "Intake",
      summary: `URL ${intake.accepted ? "accepted" : intake.classification === "BLOCKED" ? "BLOCKED" : "not accepted"} (${intake.classification}): ${intake.reason}`,
    }),
    Object.freeze({
      step: 2,
      name: "Run status",
      summary: `run is ${headline.liveness} (lifecycle: ${headline.lifecycle})`,
    }),
    Object.freeze({
      step: 3,
      name: "Evidence freshness",
      summary: `evidence is ${headline.evidence_freshness ?? UNKNOWN}`,
    }),
    Object.freeze({
      step: 4,
      name: "Decision",
      summary: `verdict is ${decision.verdict}, readiness is ${decision.readiness}`,
    }),
    Object.freeze({
      step: 5,
      name: "Bottom line",
      summary: demo.bottom_line,
    }),
  ]);
}

function renderPlainEnglish({ objective, demo, steps }) {
  const stepLines = steps.map((s) => `Step ${s.step} of ${steps.length} — ${s.name}: ${s.summary}`);
  return [
    `Objective: ${objective}`,
    "",
    ...stepLines,
    "",
    renderFounderDemoText(demo),
  ].join("\n");
}

// Build the full founder-operate story from real inputs. `objective` is the founder's
// stated goal (free text, honored as-is or UNKNOWN if missing); every other field is
// passed straight through to buildFounderDemo, which already honors UNKNOWN throughout.
export function buildFounderOperate({ objective, ...demoInputs } = {}) {
  const demo = buildFounderDemo(demoInputs);
  const steps = buildSteps(demo);
  const objectiveText = safeObjective(objective);
  const plain_english = renderPlainEnglish({ objective: objectiveText, demo, steps });

  return Object.freeze({
    title: "Founder Operate",
    objective: objectiveText,
    demo,
    steps,
    plain_english,
  });
}

export function renderFounderOperate(op) {
  return op.plain_english;
}
