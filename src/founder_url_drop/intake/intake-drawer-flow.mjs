// Level-3 Lane B — URL intake → evidence-drawer flow (pure, deterministic, fail-closed, NEVER fetches).
//
// Plain English: ties the two URL-drop stages together truthfully. First the dropped URL is validated
// (intake, no network). ONLY if intake ACCEPTS the URL does the flow surface the evidence drawer; if the
// URL is BLOCKED or UNSUPPORTED, the drawer is withheld (fail-closed) — you never show evidence for a
// target that was not accepted. No I/O, no network, no clock.
import { buildIntakeView } from "./url-intake.mjs";
import { buildDrawer } from "../evidence_drawer/evidence-drawer.mjs";

export const UNKNOWN = "UNKNOWN";

export function buildIntakeDrawerFlow({ url, safetyResult, evidencePack } = {}) {
  const intake = buildIntakeView(url);
  const accepted = intake.accepted === true;
  // Fail-closed: the drawer is only built/shown when intake accepted the URL.
  const drawer = accepted ? buildDrawer({ safetyResult, evidencePack }) : null;
  return Object.freeze({
    title: "URL drop — intake → evidence flow",
    intake,
    accepted,
    flow_stage: accepted ? (drawer && drawer.linked ? "EVIDENCE_LINKED" : "AWAITING_EVIDENCE") : "BLOCKED_AT_INTAKE",
    drawer,                      // null when not accepted (withheld)
    evidence_withheld: !accepted,
    fetch_performed: false,      // this flow NEVER fetches
  });
}

export function renderIntakeDrawerFlowText(f) {
  const lines = [
    `${f.title}`,
    `intake: ${f.intake.classification} (accepted=${f.accepted ? "yes" : "no"})`,
    `flow_stage: ${f.flow_stage}`,
  ];
  if (f.accepted && f.drawer) {
    lines.push(`evidence: verdict=${f.drawer.verdict} sha=${f.drawer.evidence_sha256} linked=${f.drawer.linked ? "yes" : "no"}`);
  } else {
    lines.push(`evidence: WITHHELD (URL not accepted at intake — fail closed)`);
  }
  return lines.join("\n");
}
