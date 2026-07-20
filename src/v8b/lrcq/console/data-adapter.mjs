// FounderGate LRCQ Live Run Console — read-only data adapter (Phase 6 data lane).
// Reads disk-backed controller snapshots, validates schema, and produces the console
// view via the single projection authority. Fails closed: wrong run-id, stale-as-current,
// or missing evidence are surfaced honestly (UNKNOWN), never mutated or silently repaired.
import { readFileSync, existsSync } from "node:fs";
import { projectConsole } from "../projection.mjs";

export function loadSnapshot(path) {
  if (!existsSync(path)) return { ok: false, error: "snapshot missing: " + path };
  let s;
  try { s = JSON.parse(readFileSync(path, "utf8")); } catch (e) { return { ok: false, error: "unparseable snapshot: " + e.message }; }
  if (!s || typeof s !== "object") return { ok: false, error: "snapshot not an object" };
  if (!s.run_id) return { ok: false, error: "snapshot has no run_id (fail-closed)" };
  return { ok: true, snapshot: s };
}

// Produce the view. expectedRunId (optional) rejects a snapshot from a different run.
export function toView(snapshot, nowMs, expectedRunId) {
  if (expectedRunId && snapshot.run_id !== expectedRunId) {
    return { error: "run_id mismatch: expected " + expectedRunId + " got " + snapshot.run_id, run_id: "UNKNOWN" };
  }
  return projectConsole(snapshot, nowMs);
}

export function viewFromFile(path, nowMs, expectedRunId) {
  const r = loadSnapshot(path);
  if (!r.ok) return { error: r.error, run_id: "UNKNOWN", lifecycle_display: "UNKNOWN" };
  return toView(r.snapshot, nowMs, expectedRunId);
}
