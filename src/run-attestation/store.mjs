// L2 RUN ATTESTATION — append-only on-disk store (JSONL), zero-dep.
//
// Authority: docs/ASSEMBLY_MANUAL.md @ a2c4a10adc88d7de760cd8f4f0c0595458f5c6c6 §26 (append-only evidence).
//
// One line per entry, in the order it was appended. This module ONLY appends and reads — it never edits
// or deletes an existing line. Tampering ON DISK (a hand-edited line, a removed line, two swapped lines)
// is intentionally NOT prevented here; it is *detected* by verifyAttestation() re-walking the hash chain.
//
// These are pure record operations (evidence writing, not a harness-controlled heavy op), so per the
// SHWL build brief they need no lease guard. Nothing here shells out, touches ~/.cldh, or reads the clock.

import { appendFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export function logPath(dir) {
  return join(dir, "attestation.log");
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Append a single entry as one JSON line. Append-only by construction.
export function appendEntryLine(dir, entry) {
  ensureDir(dir);
  appendFileSync(logPath(dir), JSON.stringify(entry) + "\n", "utf8");
}

// Read every entry back, in on-disk order. A missing log is an empty chain.
export function loadEntries(dir) {
  const p = logPath(dir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8");
  const out = [];
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (s === "") continue;
    out.push(JSON.parse(s));
  }
  return out;
}
