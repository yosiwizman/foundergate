// ORC-1R Recovery Journal + Checkpoint. Durable, atomic, append-only, and
// tolerant of a truncated final line (an outage can cut a write mid-line). A
// reboot NEVER silently extends the original deadline. Completed+sealed actions
// are terminal and cannot execute twice. Reuses (does not duplicate) the
// existing supervisor deadline/lease/heartbeat primitives — this only records.
import { writeFileSync, renameSync, appendFileSync, readFileSync, existsSync } from "node:fs";

export const LIFECYCLE = ["INTENT_RECORDED", "ACTION_STARTED", "ACTION_COMPLETED", "EVIDENCE_SEALED"];
export const RECOVERY_VERDICTS = [
  "RECOVERED_AUTOMATICALLY", "RECOVERED_WITH_LIMITATIONS", "ONE_DECISION_REQUIRED",
  "RECOVERY_BLOCKED", "POSSIBLE_EXTERNAL_ACTION_CONFLICT", "RUN_DEADLINE_EXPIRED", "INSUFFICIENT_EVIDENCE",
];

export function writeCheckpoint(path, checkpoint) {
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(checkpoint, null, 2) + "\n");
  renameSync(tmp, path); // atomic
  return { ok: true };
}

const ACTION_REQUIRED = ["run_id", "action_id", "effect_class", "lifecycle", "exact_sha", "ts"];

export function appendAction(journalPath, action) {
  const missing = ACTION_REQUIRED.filter((f) => action[f] === undefined || action[f] === null);
  if (missing.length) return { appended: false, reason: "missing fields: " + missing.join(",") };
  if (!LIFECYCLE.includes(action.lifecycle)) return { appended: false, reason: "invalid lifecycle" };
  appendFileSync(journalPath, JSON.stringify(action) + "\n");
  return { appended: true };
}

// Truncation-tolerant read: a partial/corrupt final line is dropped; ALL prior
// valid records are retained (an outage must not orphan the whole journal).
export function readJournal(journalPath) {
  if (!existsSync(journalPath)) return { records: [], dropped_tail: false };
  const lines = readFileSync(journalPath, "utf8").split("\n");
  const records = []; let droppedTail = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    try { records.push(JSON.parse(line)); }
    catch { if (i === lines.length - 1 || lines.slice(i + 1).every((l) => !l.trim())) droppedTail = true; /* else skip a mid-file corrupt line */ }
  }
  return { records, dropped_tail: droppedTail };
}

// Fold the journal to the latest lifecycle per action_id; flag duplicates + the
// post-outage certainty of each incomplete action.
export function resumeState(journalPath) {
  const { records, dropped_tail } = readJournal(journalPath);
  const latest = new Map();
  const seenTerminal = new Set();
  const duplicates = [];
  for (const r of records) {
    if (seenTerminal.has(r.action_id) && r.lifecycle && r.lifecycle !== "EVIDENCE_SEALED") {
      duplicates.push(r.action_id); // an action re-appearing after being sealed = duplicate attempt
    }
    const cur = latest.get(r.action_id);
    if (!cur || LIFECYCLE.indexOf(r.lifecycle) >= LIFECYCLE.indexOf(cur.lifecycle)) latest.set(r.action_id, r);
    if (r.lifecycle === "EVIDENCE_SEALED") seenTerminal.add(r.action_id);
  }
  const actions = [...latest.values()].map((a) => ({
    ...a,
    certainty: a.lifecycle === "EVIDENCE_SEALED" ? "SEALED_TERMINAL"
      : a.lifecycle === "ACTION_COMPLETED" ? "COMPLETED_EVIDENCE_UNSEALED"
      : a.lifecycle === "ACTION_STARTED" ? "UNCERTAIN" : "NOT_STARTED",
  }));
  const incomplete = actions.filter((a) => a.lifecycle !== "EVIDENCE_SEALED");
  return { actions, incomplete, duplicates, dropped_tail };
}

// A reboot must NOT extend the original deadline. Returns the recovery verdict.
export function recoveryVerdict(checkpoint, resume, ctx = {}) {
  const now = ctx.now;
  // FAIL CLOSED: an active run whose checkpoint lacks an original_deadline cannot
  // be safely resumed — we must not silently proceed (which would effectively
  // grant an unbounded deadline). Require evidence of the original deadline.
  if (checkpoint && checkpoint.run_id && (checkpoint.original_deadline === undefined || checkpoint.original_deadline === null)) {
    return { verdict: "INSUFFICIENT_EVIDENCE", reasons: ["active run checkpoint has no original_deadline; cannot resume without it (fail closed)"] };
  }
  if (checkpoint && checkpoint.original_deadline !== undefined && checkpoint.original_deadline !== null && now !== undefined && now >= checkpoint.original_deadline) {
    return { verdict: "RUN_DEADLINE_EXPIRED", reasons: ["original deadline passed; seal interrupted run; do NOT resume; queue remaining work for a new authorized run"] };
  }
  if (resume.duplicates && resume.duplicates.length) {
    return { verdict: "RECOVERY_BLOCKED", reasons: ["duplicate action id after seal: " + resume.duplicates.join(",")] };
  }
  const uncertainExternal = resume.incomplete.filter((a) => a.certainty === "UNCERTAIN" &&
    ["EXTERNAL_IDEMPOTENT", "EXTERNAL_UNCERTAIN", "IRREVERSIBLE"].includes(a.effect_class));
  if (uncertainExternal.length) {
    return { verdict: "POSSIBLE_EXTERNAL_ACTION_CONFLICT", reasons: ["uncertain external action(s) require a founder decision: " + uncertainExternal.map((a) => a.action_id).join(",")] };
  }
  const uncertain = resume.incomplete.filter((a) => a.certainty === "UNCERTAIN");
  if (uncertain.length) return { verdict: "ONE_DECISION_REQUIRED", reasons: ["uncertain incomplete action(s) need a resume decision"] };
  if (resume.dropped_tail) return { verdict: "RECOVERED_WITH_LIMITATIONS", reasons: ["truncated journal tail dropped; prior records intact"] };
  if (resume.incomplete.length) return { verdict: "RECOVERED_WITH_LIMITATIONS", reasons: ["some actions not sealed but reconcilable"] };
  return { verdict: "RECOVERED_AUTOMATICALLY", reasons: ["all actions sealed; deadline live"] };
}
