// DCL-1 Durable Directive Control Layer — core library.
// No autonomous directive may depend solely on conversational memory. Every
// material directive must have an exact stored body + SHA-256 that reproduces,
// a queue/dependency/recovery state, and survive context compaction.
import { createHash } from "node:crypto";

export const STATES = [
  "RECEIVED", "CAPTURED", "DIGEST_VERIFIED", "QUEUED", "WAITING_ON_DEPENDENCY",
  "READY", "RUNNING", "RUNNING_WITH_RECOVERY", "HOLD_CORRECTABLE",
  "TRUE_FOUNDER_GATE", "HUMAN_EXPERT_GATE", "BLOCKED", "EVIDENCE_SEALING",
  "COMPLETED", "COMPLETED_WITH_LIMITATIONS", "FAILED", "REJECTED",
  "INSUFFICIENT_EVIDENCE", "SUPERSEDED", "CANCELLED",
];

const TERMINAL = new Set(["COMPLETED", "COMPLETED_WITH_LIMITATIONS", "FAILED",
  "REJECTED", "INSUFFICIENT_EVIDENCE", "SUPERSEDED", "CANCELLED"]);

export const DIRECTIVE_REQUIRED = [
  "directive_id", "title", "version", "issuer", "source_session_id",
  "source_transcript_path", "received_body_path", "sha256", "byte_count",
  "line_count", "beginning_anchor", "ending_anchor", "captured_at", "risk_class",
  "machine", "dependencies", "writer_owner", "checker", "recovery_path",
  "ledger_path", "current_state", "next_safe_action", "completion_predicates",
  "stop_predicates",
];

export function sha256(s) {
  return createHash("sha256").update(typeof s === "string" ? Buffer.from(s, "utf8") : s).digest("hex");
}

// ---- Capture verification ----
// Recompute the digest of the stored body and compare with the recorded one.
// Also reject a "summary" substituted for the full body (length/anchor drift).
export function verifyCapture(storedBody, record) {
  const problems = [];
  if (storedBody === undefined || storedBody === null || storedBody === "") problems.push("missing body");
  if (!record.sha256) problems.push("missing digest");
  const actual = storedBody ? sha256(storedBody) : null;
  if (record.sha256 && actual && actual !== record.sha256) problems.push("digest mismatch");
  if (storedBody && record.byte_count !== undefined && Buffer.byteLength(storedBody, "utf8") !== record.byte_count) {
    problems.push("byte_count mismatch (possible truncation or summary substitution)");
  }
  if (storedBody && record.beginning_anchor && !storedBody.startsWith(record.beginning_anchor.slice(0, 40))) {
    problems.push("beginning anchor mismatch");
  }
  if (storedBody && record.ending_anchor && !storedBody.trimEnd().endsWith(record.ending_anchor.trimEnd().slice(-40))) {
    problems.push("ending anchor mismatch (truncated body)");
  }
  return { verified: problems.length === 0, problems };
}

export function validateDirectiveRecord(rec) {
  const missing = DIRECTIVE_REQUIRED.filter((f) => rec[f] === undefined || rec[f] === null || rec[f] === "");
  const problems = missing.map((m) => `missing ${m}`);
  if (rec.body_is_summary === true) problems.push("prompt summary substituted for full body");
  if (rec.body_modified_after_capture === true) problems.push("body modified after capture");
  if (rec.machine && rec.expected_machine && rec.machine !== rec.expected_machine) problems.push("unknown/wrong machine");
  return { valid: problems.length === 0, problems };
}

// A directive may transition to RUNNING only when durability is proven.
export function canRun(rec, ctx = {}) {
  const problems = [];
  if (!ctx.body_exists) problems.push("body missing");
  if (!ctx.digest_verifies) problems.push("digest not verified");
  if (!ctx.dependencies_satisfied) problems.push("dependencies unsatisfied");
  if (!ctx.recovery_state_exists) problems.push("no recovery state");
  if (!ctx.writer_ownership_valid) problems.push("invalid writer ownership");
  return { ok: problems.length === 0, problems };
}

export function validateTransition(t, ctx = {}) {
  const problems = [];
  if (!STATES.includes(t.prior_state)) problems.push(`unknown prior_state ${t.prior_state}`);
  if (!STATES.includes(t.next_state)) problems.push(`unknown next_state ${t.next_state}`);
  for (const f of ["reason", "actor", "timestamp", "idempotency_key", "next_safe_action"]) {
    if (t[f] === undefined || t[f] === null || t[f] === "") problems.push(`missing ${f}`);
  }
  if (!t.prompt_digest) problems.push("missing prompt digest");
  if (t.next_state === "RUNNING") {
    const r = canRun(t, ctx);
    if (!r.ok) problems.push(...r.problems.map((p) => `cannot RUN: ${p}`));
  }
  // UNKNOWN/invalid may never jump straight to a COMPLETED status.
  if ((!STATES.includes(t.prior_state)) &&
      (t.next_state === "COMPLETED" || t.next_state === "COMPLETED_WITH_LIMITATIONS")) {
    problems.push("UNKNOWN/invalid prior may not transition to COMPLETED");
  }
  return { valid: problems.length === 0, problems };
}

export function isTerminal(state) { return TERMINAL.has(state); }

// ---- Compaction safety ----
// Context compaction is NOT safe until every active directive is captured,
// digest-verified, queued, has dependencies + recovery + next safe action.
export function safeToCompact(activeDirectives) {
  const unsafe = [];
  for (const d of activeDirectives) {
    const reasons = [];
    if (!["CAPTURED", "DIGEST_VERIFIED", "QUEUED", "READY", "RUNNING", "RUNNING_WITH_RECOVERY",
      "WAITING_ON_DEPENDENCY", "HOLD_CORRECTABLE", "TRUE_FOUNDER_GATE", "HUMAN_EXPERT_GATE",
      "BLOCKED", "EVIDENCE_SEALING"].includes(d.current_state)) reasons.push("not captured/queued");
    if (!d.digest_verified) reasons.push("digest not verified");
    if (!d.queue_state_exists) reasons.push("no queue state");
    if (!d.recovery_state_exists) reasons.push("no recovery state");
    if (!d.next_safe_action) reasons.push("no next safe action");
    if (reasons.length) unsafe.push({ directive_id: d.directive_id, reasons });
  }
  return { safe: unsafe.length === 0, verdict: unsafe.length === 0 ? "SAFE" : "COMPACTION_UNSAFE", unsafe };
}

// Before reporting DONE, no READY or actionable RUNNING directive may remain.
export function safeToStop(directives) {
  const actionable = directives.filter((d) => d.current_state === "READY" ||
    (d.current_state === "RUNNING" && d.has_actionable_work === true));
  return { safe: actionable.length === 0, actionable: actionable.map((d) => d.directive_id) };
}

// ---- Queue / dependency / idempotency ----
export function resolveDependencies(directive, satisfiedIds) {
  const deps = directive.dependencies || [];
  const unmet = deps.filter((d) => !satisfiedIds.includes(d));
  return { ready: unmet.length === 0, unmet, state: unmet.length === 0 ? "READY" : "WAITING_ON_DEPENDENCY" };
}

export function enqueueIdempotent(queue, directiveId) {
  if (queue.includes(directiveId)) return { queue, appended: false, idempotent: true };
  return { queue: [...queue, directiveId], appended: true };
}

// A directive in SUPERSEDED state must name what superseded it; and a
// reconciliation must detect a directive present in the index but dropped from
// the queue (a silently-dropped directive).
export function supersessionValid(rec) {
  if (rec.current_state === "SUPERSEDED" && !rec.superseded_by) {
    return { valid: false, problem: "SUPERSEDED without superseded_by record" };
  }
  return { valid: true };
}

export function detectDroppedDirectives(indexIds, queueIds, terminalIds = []) {
  // Any active (non-terminal) directive in the index but absent from the queue
  // is silently dropped.
  const dropped = indexIds.filter((id) => !queueIds.includes(id) && !terminalIds.includes(id));
  return { dropped, ok: dropped.length === 0 };
}

// ---- Historical classification ----
export function classifyHistorical(found, wasQueuedOnDisk) {
  if (!found) return "NOT_PROVEN";
  if (wasQueuedOnDisk) return "HISTORICAL_LOCKED";
  return "HISTORICAL_RECEIVED_NOT_LOCKED";
}
