// FGRI-1 Gate Router — the mechanical layer between autonomous backend workers
// and founder authority. Core product invariant (executable):
//   A BACKEND WORKER MAY NEVER ASK AN INTERACTIVE TERMINAL QUESTION DURING AN
//   AUTONOMOUS RUN. On uncertainty/missing authority it must: resolve from disk
//   authority, apply the documented safe default, OR park only the affected lane
//   + create a structured Founder Decision Inbox request + continue other lanes.
// Terminal output is operational evidence, not the founder decision interface.
import { createHash } from "node:crypto";

export const GATE_TYPES = ["TRUE_FOUNDER_GATE", "HUMAN_EXPERT_GATE", "OPERATIONAL_AUTONOMOUS", "HOLD_CORRECTABLE", "BLOCKED", "UNKNOWN"];
export const GATE_STATES = ["DETECTED", "CLASSIFIED", "ROUTED", "NOTIFIED", "PARKED", "AWAITING_DECISION", "RESOLVED", "EXPIRED", "REJECTED", "SUPERSEDED", "RESUMED", "CLOSED"];

// Options that are NEVER presented to the founder and are auto-refused by policy.
export const AUTO_REFUSED_OPTIONS = ["FULL_AUTONOMY", "DANGEROUSLY_SKIP_PERMISSIONS", "SKIP_PERMISSIONS", "DANGEROUS_MODE", "DIRECT_PUSH_TO_MAIN", "AUTOMATIC_PERMISSION_ESCALATION"];

export function digest(obj) {
  const sortV = (v) => Array.isArray(v) ? v.map(sortV) : (v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => { o[k] = sortV(v[k]); return o; }, {}) : v);
  return "sha256:" + createHash("sha256").update(JSON.stringify(sortV(obj))).digest("hex");
}

// ---- Phase 4: interactive-question detection in worker output ----
const QUESTION_SIGNALS = [
  /AskUserQuestion/i, /\bplease (select|choose|pick|confirm)\b/i, /\btype your (answer|choice|notes)\b/i,
  /\bpress (enter|any key)\b/i, /\b(option|choice) \d+\b.*\?/i, /\bwaiting for (input|keyboard|your)\b/i,
  /\bwhich (option|would you|do you want)\b/i, /\benter your\b/i,
  // confirm forms: [y/n], (y/N), (yes/no), y/n prompts
  /[([]\s*y\s*\/\s*n\s*[)\]]/i, /[([]\s*yes\s*\/\s*no\s*[)\]]/i, /\benter y\b/i, /\breply\s+\d/i, /\btype\s+\d\s+(for|to)\b/i,
  // yes/no & confirmation questions
  /\bshould i (proceed|continue|deploy|merge|push)\b/i, /\bdo you want (me )?to\b/i, /\bwould you like (me )?to\b/i,
  /\bproceed with .*\?/i, /\bconfirm .*\?/i, /\bselect an option\b/i, /\bawait(ing)? (your )?(confirmation|input|decision|approval)\b/i,
  /\bi('| wi)ll wait for (your )?(input|confirmation|decision)\b/i, /\?\s*\(y\/?n?\)?\s*$/im,
];
// A final answer that contains an UNRESOLVED authority request also counts.
const AUTHORITY_SIGNALS = [/\bneed(s)? (your )?(permission|authorization|approval)\b/i, /\bmissing authority\b/i, /\brequires broader permission\b/i, /\bhow should i proceed\b/i, /\bpermission (denied|required)\b/i];

export function detectInteractiveQuestion(workerOutput) {
  const text = typeof workerOutput === "string" ? workerOutput : JSON.stringify(workerOutput || "");
  const q = QUESTION_SIGNALS.find((r) => r.test(text));
  const a = AUTHORITY_SIGNALS.find((r) => r.test(text));
  const readsStdin = /process\.stdin|readline|read from stdin/i.test(text);
  const kind = q ? "interactive_question" : readsStdin ? "stdin_read" : a ? "unresolved_authority" : null;
  return { intercepted: !!kind, kind };
}

// ---- Classification (fail closed) ----
export function classifyGate(request) {
  if (!request || typeof request !== "object") return "UNKNOWN"; // fail closed
  const t = request.declared_type;
  if (GATE_TYPES.includes(t) && t !== "UNKNOWN") return t;
  // Derive from requested authority; unknown -> fail closed to a founder gate.
  const auth = String(request.requested_authority || "").trim().toLowerCase();
  if (/provider|production|customer|private|payment|public.release|akior|m1|live.action|token|external/.test(auth)) return "TRUE_FOUNDER_GATE";
  if (/legal|security.boundary|ip|expert/.test(auth)) return "HUMAN_EXPERT_GATE";
  // Empty/whitespace/unknown -> fail closed to a founder gate.
  if (auth === "" || auth === "unknown") return "TRUE_FOUNDER_GATE";
  return "OPERATIONAL_AUTONOMOUS";
}

// The single mechanical handler a worker output passes through.
export function handleWorkerOutput(workerOutput, ctx = {}) {
  const det = detectInteractiveQuestion(workerOutput);
  if (!det.intercepted) return { action: "continue", lane: ctx.lane, gate: null };
  // Intercept: build a gate request, park ONLY this lane, route to inbox, continue others.
  const req = buildGateRequest({
    lane: ctx.lane, action: ctx.action, why: `worker emitted ${det.kind}`,
    requested_authority: ctx.requested_authority || "unknown", exact_sha: ctx.exact_sha,
    directive_digest: ctx.directive_digest, options: ctx.options, evidence: [ctx.worker_output_path],
  }, ctx.now, ctx.nonce);
  return {
    action: "park_and_route", lane: ctx.lane, gate: req,
    markers: ["INTERACTIVE_QUESTION_INTERCEPTED", "LANE_PARKED", "DECISION_ROUTED", "UNRELATED_WORK_CONTINUED"],
    unrelated_work_continues: true, granted_authority: false, // NEVER silently grant
  };
}

export function buildGateRequest(f, now, nonce) {
  const gate_type = classifyGate({ requested_authority: f.requested_authority });
  const req = {
    gate_id: f.gate_id || `gate-${now}-${(nonce || "n").slice(0, 8)}`,
    gate_type, title: f.title || "Authorization required",
    plain_language_summary: f.why || "A lane needs a decision.",
    affected_lane: f.lane, affected_action: f.action, why_authority_is_missing: f.why,
    evidence: f.evidence || [], exact_sha: f.exact_sha, directive_digest: f.directive_digest,
    risk: f.risk || "unknown", options: f.options || ["ACTIVATE_SAFELY", "KEEP_PAUSED", "REVIEW_DETAILS"],
    recommended_option: f.recommended_option || "REVIEW_DETAILS",
    safe_default: "PARK_AFFECTED_LANE_AND_CONTINUE_OTHERS", unrelated_work_may_continue: true,
    created_at: now, expires_at: now + (f.ttl || 86400), anti_replay_nonce: nonce,
    current_state: "AWAITING_DECISION", next_safe_action: "await founder decision; continue other lanes",
  };
  return req;
}

// ---- Decision verification (anti-replay / expiry / one-time / integrity) ----
export function verifyDecision(request, resolution, ctx = {}) {
  const problems = [];
  if (!resolution) return { valid: false, problems: ["missing decision"] };
  if (resolution.request_digest !== digest(request)) problems.push("altered request (digest mismatch)");
  if (resolution.gate_id !== request.gate_id) problems.push("wrong gate id");
  // Fail closed on SHA binding: the resolution MUST carry an exact_sha and it
  // must equal the request's pinned SHA (and ctx SHA when supplied). A missing
  // exact_sha is a rejection, not a skip.
  if (!resolution.exact_sha) problems.push("missing exact_sha binding");
  else {
    if (request.exact_sha && resolution.exact_sha !== request.exact_sha) problems.push("wrong SHA (does not match request)");
    if (ctx.exact_sha && resolution.exact_sha !== ctx.exact_sha) problems.push("wrong SHA (does not match active state)");
  }
  if (ctx.expected_action && resolution.action !== ctx.expected_action) problems.push("wrong action");
  if (ctx.now !== undefined && request.expires_at !== undefined && ctx.now > request.expires_at) problems.push("expired decision");
  if (resolution.anti_replay_nonce !== request.anti_replay_nonce) problems.push("replayed decision (nonce mismatch)");
  // One-time-use is the DEFAULT; only an explicit one_time_use:false disables it.
  if (resolution.one_time_use !== false && ctx.already_consumed) problems.push("duplicate consumption");
  if (resolution.decision_source === "generated" || resolution.deciding_authority === "builder") problems.push("generated/builder decision rejected");
  if (AUTO_REFUSED_OPTIONS.includes(resolution.selected_option)) problems.push(`unsafe option auto-refused: ${resolution.selected_option}`);
  return { valid: problems.length === 0, problems };
}

// ---- Cost classification (modeled vs actual) ----
export function classifyCost(modeledUsd, envelope) {
  const warn = envelope.MODELED_COST_WARNING_USD ?? 15;
  const gate = envelope.MODELED_COST_FOUNDER_GATE_USD ?? 25;
  if (modeledUsd >= gate) return { level: "GATE", action: "park_llm_heavy_and_route_gate", note: "modeled only; NOT actual billing" };
  if (modeledUsd >= warn) return { level: "WARNING", action: "log_and_continue", note: "modeled only; NOT actual billing" };
  return { level: "OK", action: "continue", note: "modeled only; NOT actual billing" };
}

// Any actual NEW billable spend requires a separate founder gate.
export function actualSpendRequiresGate(newBillableSpend) {
  return newBillableSpend === true;
}

// ---- Notification dedupe (one per gate version) ----
export function shouldNotify(gateId, requestDigest, version, sentSet) {
  const key = `${gateId}|${requestDigest}|${version}`;
  if (sentSet.has(key)) return { notify: false, key };
  return { notify: true, key };
}

// ---- Founder-facing option sanitization ----
export function founderOptionsFor(gate) {
  // Never expose raw permission flags / unsafe options as founder choices.
  const base = ["ACTIVATE SAFELY", "KEEP PAUSED", "REVIEW DETAILS"];
  return base.filter((o) => !AUTO_REFUSED_OPTIONS.some((r) => o.toUpperCase().includes(r.replace(/_/g, " "))));
}

export function safeDefault() { return "PARK_AFFECTED_LANE_AND_CONTINUE_OTHERS"; }
