// ARE-1 Run Ledger (MOD-015 Audit Log / Proof Ledger).
// Append-only event ledger + atomic recovery state. Idempotent on
// idempotency_key; crash recovery resumes without duplicate action.
import { appendFileSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";

export const EVENT_REQUIRED = [
  "run_id", "blueprint_digest", "manifest_digest", "project", "lane",
  "exact_sha", "action_class", "authority", "executor", "result",
  "evidence", "duration", "correction_cycle", "founder_interruption", "next_safe_action",
];

export function validateEvent(e) {
  const missing = EVENT_REQUIRED.filter((f) => e[f] === undefined);
  return { valid: missing.length === 0, missing };
}

function seenKeys(ledgerPath) {
  if (!existsSync(ledgerPath)) return new Set();
  const keys = new Set();
  for (const line of readFileSync(ledgerPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { const o = JSON.parse(line); if (o.idempotency_key) keys.add(o.idempotency_key); } catch { /* skip */ }
  }
  return keys;
}

// Append an event; duplicate idempotency_key is a no-op (returns {appended:false}).
export function appendEvent(ledgerPath, event, timestamp) {
  const v = validateEvent(event);
  if (!v.valid) return { appended: false, reason: "invalid event", missing: v.missing };
  if (!event.idempotency_key) return { appended: false, reason: "missing idempotency_key" };
  const seen = seenKeys(ledgerPath);
  if (seen.has(event.idempotency_key)) return { appended: false, reason: "duplicate (idempotent)", idempotent: true };
  const rec = { ...event, ts: timestamp || event.ts || null };
  appendFileSync(ledgerPath, JSON.stringify(rec) + "\n");
  return { appended: true };
}

// Atomic recovery state write (temp + rename).
export function writeRecovery(path, state) {
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  renameSync(tmp, path);
  return { ok: true };
}

// Resume: return the last recorded next_safe_action and the set of completed keys
// so a crashed run continues without repeating a completed action.
export function resumeFrom(ledgerPath) {
  if (!existsSync(ledgerPath)) return { completed_keys: [], last_next_safe_action: null };
  const lines = readFileSync(ledgerPath, "utf8").split("\n").filter((l) => l.trim());
  const completed = [];
  let last = null;
  for (const line of lines) {
    try { const o = JSON.parse(line); if (o.idempotency_key) completed.push(o.idempotency_key); if (o.next_safe_action) last = o.next_safe_action; } catch { /* skip */ }
  }
  return { completed_keys: completed, last_next_safe_action: last };
}
