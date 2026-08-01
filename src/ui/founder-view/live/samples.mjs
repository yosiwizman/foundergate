// Deterministic multi-sample states for the local live founder-facing flow (test/demo).
// Every state is composed from the REAL modules; nothing is fabricated. Missing/stale/
// failed/insufficient states render honest UNKNOWN/STALE/INSUFFICIENT — never READY/SHIP.
import { buildFounderView, renderFounderViewText } from "../founder-view.mjs";
import { buildShipReport, renderShipReportText } from "../ship-report.mjs";
import { buildDecisionPackage } from "../../../evidence/decision-package/decision-package.mjs";

const NOW = 1784428600000;
const FRESH = { ts: NOW - 30000 };            // 30s old -> LIVE
const STALE = { ts: NOW - 6 * 3600 * 1000 };  // 6h old  -> STALE

export const SAMPLE_STATES = ["review", "missing", "stale", "failed", "insufficient", "hostile"];

// each entry -> { fv: founderViewInput, sr: shipReportInput }
function inputs(name) {
  switch (name) {
    case "review": return {
      fv: { runId: "run-review-001", state: { state: "RUNNING" }, heartbeat: FRESH, nowMs: NOW,
            decision: { verdict: "READY_FOR_REVIEW", limitations: ["not production-ready"] } },
      sr: { decisionPackage: buildDecisionPackage({ verdict: "READY_FOR_REVIEW", limitations: ["not production-ready"], run_id: "run-review-001" }),
            checkerVerdict: "CLEAN", gateAdvisorVerdict: "READY_FOR_REVIEW_WITH_LIMITS", nowMs: NOW } };
    case "missing": return { fv: { nowMs: NOW }, sr: { nowMs: NOW } };
    case "stale": return {
      fv: { runId: "run-stale-002", state: { state: "RUNNING" }, heartbeat: STALE, nowMs: NOW,
            decision: { verdict: "READY_FOR_REVIEW" } },
      sr: { decisionPackage: buildDecisionPackage({ verdict: "READY_FOR_REVIEW", run_id: "run-stale-002" }),
            gateAdvisorVerdict: "READY_FOR_REVIEW_WITH_LIMITS", nowMs: NOW } }; // no checker -> insufficient
    case "failed": return {
      fv: { runId: "run-failed-003", state: { state: "RUNNING" }, heartbeat: FRESH, nowMs: NOW,
            decision: { verdict: "HOLD_CORRECTABLE", limitations: ["checker found issues"] } },
      sr: { decisionPackage: buildDecisionPackage({ verdict: "HOLD_CORRECTABLE", run_id: "run-failed-003" }),
            checkerVerdict: "FINDINGS", gateAdvisorVerdict: "CORRECTION_REQUIRED", nowMs: NOW } };
    case "insufficient": return {
      fv: { runId: "run-insuff-004", state: { state: "RUNNING" }, heartbeat: FRESH, nowMs: NOW,
            decision: { verdict: "INSUFFICIENT_EVIDENCE" } },
      sr: { decisionPackage: buildDecisionPackage({ verdict: "INSUFFICIENT_EVIDENCE", run_id: "run-insuff-004" }), nowMs: NOW } };
    case "hostile": return {
      fv: { runId: "run-<script>alert(1)</script>\nMARK-READY", state: { state: "RUNNING" }, heartbeat: FRESH, nowMs: NOW,
            url: "javascript:alert(1) <img src=x onerror=alert(1)>",
            decision: { verdict: "READY_FOR_REVIEW", limitations: ["<script>evil</script> not production-ready"] } },
      sr: { decisionPackage: buildDecisionPackage({ verdict: "READY_FOR_REVIEW", limitations: ["<script>x</script>"], run_id: "hostile" }),
            checkerVerdict: "FINDINGS", gateAdvisorVerdict: "CORRECTION_REQUIRED", nowMs: NOW } };
    default: return null;
  }
}

export function renderSample(name) {
  const io = inputs(name);
  if (!io) return null;
  const fvText = renderFounderViewText(buildFounderView(io.fv));
  const report = buildShipReport(io.sr);
  const srText = renderShipReportText(report);
  return { name, decision: report.decision, text: `STATE: ${name}\n\n${fvText}\n\n${srText}` };
}
