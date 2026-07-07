// FounderGate — Evidence Bus (append-only local event timeline).
//
// PURE NODE. No external deps. No network. No provider access.
//
// What this is:
//   A tiny append-only writer + validator for a LOCAL evidence timeline. Every
//   event is validated against events/event.schema.json before it is written,
//   and the writer refuses any event without a real source.
//
// HARD RULES enforced here:
//   1. No event is evidence without a SOURCE. A sourceless (or empty-ref) event
//      is REJECTED — never written. This is the proof-source law in code.
//   2. Append-only. writeEvent only ever appends a JSON line; it never rewrites,
//      truncates, or deletes existing lines.
//   3. LOCAL FILE ONLY. The writer refuses to write into a PROTECTED store — a
//      private runtime-store directory or a file that looks like one. The
//      protected patterns are generic and configurable (see DEFAULT_PROTECTED_*);
//      no product-specific paths are baked in.
//   4. This file is a harness artifact. It is NOT application runtime; it flips
//      no markers and activates nothing.
//
// The JSON Schema is the single source of truth for the two enums (event types
// and source types); this module loads them from the schema so the two can
// never silently drift.

import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_PATH = resolve(HERE, "event.schema.json");

// Default local timeline path (harness-owned, gitignored churn-free JSONL).
export const LOCAL_DEFAULT_PATH = resolve(HERE, "sample-timeline.jsonl");

const SCHEMA = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));

// --- Authoritative enums, loaded from the schema (never hardcoded here) -------
export const EVENT_TYPES = Object.freeze([...SCHEMA.properties.type.enum]);
export const SOURCE_TYPES = Object.freeze([
  ...SCHEMA.$defs.source.properties.type.enum,
]);

// Proof grade of a source type. VERIFIABLE = a third party can independently
// re-check the artifact. ASSERTED = a human's word, traceable but not machine-
// verifiable. UNVERIFIED = mock/planned; honestly labels a not-yet-real event.
export const PROOF_GRADE_BY_SOURCE = Object.freeze({
  github: "verifiable",
  local_file: "verifiable",
  command_output: "verifiable",
  screenshot: "verifiable",
  human_witness: "verifiable",
  manual_note: "asserted",
  mock: "unverified",
  planned: "unverified",
});

// Generic, overridable guard config. A "protected store" is a private runtime
// store we must never clobber with evidence writes. Callers may extend these
// via writeEvent opts (protectedSegments / protectedNamePatterns).
export const DEFAULT_PROTECTED_SEGMENTS = Object.freeze([".private-store"]);
export const DEFAULT_PROTECTED_NAME_PATTERNS = Object.freeze([/-store\.json$/]);

export class EvidenceBusError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "EvidenceBusError";
    this.errors = errors;
  }
}

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const ID_RE = /^[A-Za-z0-9._:-]+$/;

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Validate an event against the schema's constraints. Returns { valid, errors }.
// Implemented directly (no schema-validator dependency) but keyed off the
// enums loaded from the schema file, so the schema stays authoritative.
export function validateEvent(event) {
  const errors = [];

  if (!isPlainObject(event)) {
    return { valid: false, errors: ["event must be a plain object"] };
  }

  // Reject unknown top-level keys (additionalProperties:false).
  const allowedTop = new Set([
    "id",
    "ts",
    "type",
    "actor",
    "subject",
    "summary",
    "source",
    "data",
  ]);
  for (const k of Object.keys(event)) {
    if (!allowedTop.has(k)) errors.push(`unknown property: ${k}`);
  }

  // id
  if (typeof event.id !== "string" || event.id.length < 1) {
    errors.push("id is required and must be a non-empty string");
  } else if (!ID_RE.test(event.id)) {
    errors.push("id must match ^[A-Za-z0-9._:-]+$");
  }

  // ts
  if (typeof event.ts !== "string" || !ISO_RE.test(event.ts)) {
    errors.push("ts is required and must be an ISO-8601 date-time string");
  }

  // type
  if (typeof event.type !== "string" || !EVENT_TYPES.includes(event.type)) {
    errors.push(`type is required and must be one of: ${EVENT_TYPES.join(", ")}`);
  }

  // summary
  if (typeof event.summary !== "string" || event.summary.length < 1) {
    errors.push("summary is required and must be a non-empty string");
  }

  // optional strings
  for (const k of ["actor", "subject"]) {
    if (k in event && (typeof event[k] !== "string" || event[k].length < 1)) {
      errors.push(`${k}, if present, must be a non-empty string`);
    }
  }

  // data (optional object)
  if ("data" in event && !isPlainObject(event.data)) {
    errors.push("data, if present, must be an object");
  }

  // source — THE proof-source law. Required; must have a valid type and a
  // non-empty ref. A missing/empty source is what makes an event "sourceless"
  // and is the single most important rejection this validator performs.
  const src = event.source;
  if (!isPlainObject(src)) {
    errors.push("source is required — a sourceless event is not evidence");
  } else {
    for (const k of Object.keys(src)) {
      if (!["type", "ref", "detail"].includes(k)) {
        errors.push(`unknown source property: ${k}`);
      }
    }
    if (typeof src.type !== "string" || !SOURCE_TYPES.includes(src.type)) {
      errors.push(
        `source.type is required and must be one of: ${SOURCE_TYPES.join(", ")}`
      );
    }
    if (typeof src.ref !== "string" || src.ref.length < 1) {
      errors.push(
        "source.ref is required and must be non-empty (the claim must be traceable)"
      );
    }
    if ("detail" in src && typeof src.detail !== "string") {
      errors.push("source.detail, if present, must be a string");
    }
  }

  return { valid: errors.length === 0, errors };
}

// The proof grade for an event, derived from its source type. Throws if the
// event is not even valid (an invalid event has no defensible grade).
export function proofGrade(event) {
  const { valid, errors } = validateEvent(event);
  if (!valid) {
    throw new EvidenceBusError("cannot grade an invalid event", errors);
  }
  return PROOF_GRADE_BY_SOURCE[event.source.type];
}

// Refuse any path that would write into a PROTECTED store. LOCAL FILE ONLY.
// Protected patterns are generic and configurable via opts; nothing here is
// tied to any specific product or private-store name.
function assertWritablePath(absPath, opts = {}) {
  const segments = opts.protectedSegments || DEFAULT_PROTECTED_SEGMENTS;
  const namePatterns =
    opts.protectedNamePatterns || DEFAULT_PROTECTED_NAME_PATTERNS;

  const parts = absPath.split(sep);
  for (const seg of segments) {
    if (parts.includes(seg)) {
      throw new EvidenceBusError(
        `refusing to write under a protected store directory "${seg}" (local file only): ${absPath}`
      );
    }
  }
  const base = parts[parts.length - 1] || "";
  for (const re of namePatterns) {
    if (re.test(base)) {
      throw new EvidenceBusError(
        `refusing to write to a protected store filename: ${base}`
      );
    }
  }
}

// Append one validated event to a LOCAL JSONL timeline. Append-only.
// Returns the event on success; throws EvidenceBusError on any rejection.
export function writeEvent(event, opts = {}) {
  const path = resolve(opts.path || LOCAL_DEFAULT_PATH);
  assertWritablePath(path, opts);

  const { valid, errors } = validateEvent(event);
  if (!valid) {
    throw new EvidenceBusError(
      `event rejected: ${errors.join("; ")}`,
      errors
    );
  }

  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // Append-only: a single newline-terminated JSON line. Never rewrites.
  appendFileSync(path, JSON.stringify(event) + "\n", "utf8");
  return event;
}

// Convenience: append many events in order (still one append per event).
export function writeMany(events, opts = {}) {
  const written = [];
  for (const e of events) written.push(writeEvent(e, opts));
  return written;
}

// Read a JSONL timeline back into an array of parsed events. Blank lines are
// skipped. Does not validate (read is lenient; write is strict).
export function readTimeline(path = LOCAL_DEFAULT_PATH) {
  const abs = resolve(path);
  if (!existsSync(abs)) return [];
  return readFileSync(abs, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

// Summarize a timeline into a proof-grade rollup (for reports / dashboards).
export function summarize(events) {
  const byType = {};
  const byGrade = { verifiable: 0, asserted: 0, unverified: 0 };
  const bySource = {};
  for (const e of events) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    bySource[e.source.type] = (bySource[e.source.type] || 0) + 1;
    byGrade[PROOF_GRADE_BY_SOURCE[e.source.type]]++;
  }
  return { total: events.length, byType, bySource, byGrade };
}
