// V1 Golden Path — local Doctor. Composes the audited buildDoctorChecklist with real
// presence signals + honest identity/limitation fields. Pure over its inputs; NEVER
// fabricates a green — a missing/unknown signal stays UNKNOWN (Law 54).
import { buildDoctorChecklist, renderDoctorText } from "../../../autonomous-run/console/run-console.mjs";
export const UNKNOWN = "UNKNOWN";
const esc = (s) => (s == null ? UNKNOWN : String(s));
// signals: { node, npm, node_modules, browsers, local_server, evidence_root } booleans;
// identity: { repo, main_sha, evidence_root }
export function buildDoctor({ signals = {}, identity = {} } = {}) {
  const checklist = buildDoctorChecklist(signals);
  const limitations = [];
  for (const [k, v] of Object.entries(signals)) if (v !== true) limitations.push(`${k}: not confirmed (${v === false ? "absent" : "UNKNOWN"})`);
  return Object.freeze({
    repo: esc(identity.repo),
    main_sha: esc(identity.main_sha),
    evidence_root: esc(identity.evidence_root),
    checklist,
    all_present: Object.values(signals).length > 0 && Object.values(signals).every((v) => v === true),
    limitations: Object.freeze(limitations.length ? limitations : ["(none recorded — treat unlisted as UNKNOWN)"]),
    note: "local Doctor only — NOT a production/deployment readiness check",
  });
}
export function renderDoctorReport(d) {
  const lines = [];
  lines.push("== FOUNDERGATE DOCTOR (local) ==");
  lines.push(`repo: ${d.repo}`); lines.push(`main_sha: ${d.main_sha}`); lines.push(`evidence_root: ${d.evidence_root}`);
  lines.push(""); lines.push(renderDoctorText(d.checklist));
  lines.push(""); lines.push(`all_present: ${d.all_present}`);
  lines.push("limitations:"); for (const l of d.limitations) lines.push(`  - ${l}`);
  lines.push(d.note);
  return lines.join("\n");
}
