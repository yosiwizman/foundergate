// FounderGate — Cage Evidence Ledger (append-only, local file).
//
// SCAFFOLD ONLY — final cage claims require independent Checker + Advisor
// verification; NOT self-certified; caged/held is NOT live proof.
//
// PURE NODE. Builtins only (fs, path, url, crypto). No external deps. No
// network. No provider access. This file is a spec/harness artifact: it flips
// no markers, touches no protected store, and activates nothing.
//
// What this is:
//   A tiny append-only writer + validator + tamper-evident hash chain for a
//   LOCAL cage-evidence ledger. A "cage" is an OUTER-CAGE trust boundary that
//   DENIES egress, HOLDS actions, and serves MOCK responses instead of any live
//   crossing. Each event records what the cage denied/held/mocked plus the
//   Checker/Advisor/Founder verdicts — always with a SOURCE label.
//
// HARD RULES enforced here:
//   1. No event is evidence without a SOURCE. A sourceless (or empty-ref) event
//      is REJECTED — never written. This is the proof-source law in code.
//   2. Append-only. writeEvent only appends a JSON line; it never rewrites,
//      truncates, or deletes existing lines.
//   3. Tamper-evident. Each written event carries seq + prev_chain_hash +
//      chain_hash = sha256(prev_chain_hash + canonical(event-sans-chain-fields)).
//      verifyChain re-derives the chain and reports the first break.
//   4. LOCAL FILE ONLY. The writer refuses any path under a protected store
//      directory or a filename that looks like a protected runtime store. The
//      protected patterns are generic and configurable (no product-specific
//      paths baked in).
//   5. CAGED IS NOT LIVE. The schema has no live/provider source type and no
//      verdict value that asserts a live crossing; this module never grades any
//      event as "live". A mock is UNVERIFIED by construction.
//
// The JSON Schema is the single source of truth for every enum; this module
// loads them from the schema so the two can never silently drift.

import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_PATH = resolve(HERE, "cage-evidence.schema.json");

// Default LOCAL ledger path (harness-owned, deterministic committed sample).
export const LOCAL_DEFAULT_PATH = resolve(HERE, "cage-evidence.sample.jsonl");

const SCHEMA = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));

// --- Authoritative enums, loaded from the schema (never hardcoded here) -------
export const EVENT_KINDS = Object.freeze([...SCHEMA.properties.kind.enum]);
export const SOURCE_TYPES = Object.freeze([
  ...SCHEMA.$defs.source.properties.type.enum,
]);

// Fields the writer manages; they are excluded from the canonical hash input so
// the chain hashes the caller's payload, not its own bookkeeping.
export const CHAIN_FIELDS = Object.freeze([
  "seq",
  "prev_chain_hash",
  "chain_hash",
]);

// Proof grade of a source type. VERIFIABLE = a third party can independently
// re-check the artifact. ASSERTED = an independent party's word, traceable but
// not machine-verifiable. UNVERIFIED = mock/planned; honestly labels a simulated
// or intended event. There is deliberately NO "live" grade — cage evidence can
// never grade as live.
export const PROOF_GRADE_BY_SOURCE = Object.freeze({
  cage_log: "verifiable",
  command_output: "verifiable",
  local_file: "verifiable",
  checker: "asserted",
  advisor: "asserted",
  founder: "asserted",
  mock: "unverified",
  planned: "unverified",
});

export class CageEvidenceError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "CageEvidenceError";
    this.errors = errors;
  }
}

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const ID_RE = /^[A-Za-z0-9._:-]+$/;
const HASH_RE = /^[a-f0-9]{16,128}$/;
const CHAIN_HASH_RE = /^[a-f0-9]{64}$/;

const CHECKER_VERDICTS = new Set([
  "PASS",
  "FAIL",
  "BLOCKED",
  "HELD",
  "NOT_VERIFIED",
  null,
]);
const ADVISOR_VERDICTS = new Set([
  "PASS",
  "FAIL",
  "BLOCKED",
  "HOLD",
  "NOT_VERIFIED",
  null,
]);
const FOUNDER_DECISIONS = new Set([
  "APPROVE",
  "REJECT",
  "HOLD",
  "PENDING",
  null,
]);

const TOP_KEYS = new Set([
  "id",
  "ts",
  "kind",
  "cage_id",
  "policy_hash",
  "source",
  "denied_egress",
  "held_actions",
  "mock_responses",
  "tests",
  "checker_verdict",
  "advisor_verdict",
  "founder_decision",
  "note",
  ...CHAIN_FIELDS,
]);

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkStrKeys(obj, allowed, label, errors) {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) errors.push(`unknown ${label} property: ${k}`);
  }
}

// Validate an event against the schema's constraints. Returns { valid, errors }.
// Zero-dependency, keyed off the enums loaded from the schema file so the schema
// stays authoritative.
export function validateEvent(event) {
  const errors = [];

  if (!isPlainObject(event)) {
    return { valid: false, errors: ["event must be a plain object"] };
  }

  checkStrKeys(event, TOP_KEYS, "top-level", errors);

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

  // kind
  if (typeof event.kind !== "string" || !EVENT_KINDS.includes(event.kind)) {
    errors.push(`kind is required and must be one of: ${EVENT_KINDS.join(", ")}`);
  }

  // cage_id
  if (typeof event.cage_id !== "string" || event.cage_id.length < 1) {
    errors.push("cage_id is required and must be a non-empty string");
  } else if (!ID_RE.test(event.cage_id)) {
    errors.push("cage_id must match ^[A-Za-z0-9._:-]+$");
  }

  // policy_hash
  if (typeof event.policy_hash !== "string" || !HASH_RE.test(event.policy_hash)) {
    errors.push(
      "policy_hash is required and must be a hex digest (16-128 chars, a hash never a secret)"
    );
  }

  // note (optional)
  if ("note" in event && typeof event.note !== "string") {
    errors.push("note, if present, must be a string");
  }

  // source — THE proof-source law. Required; valid type + non-empty ref.
  const src = event.source;
  if (!isPlainObject(src)) {
    errors.push("source is required — a sourceless event is not evidence");
  } else {
    checkStrKeys(src, new Set(["type", "ref", "detail"]), "source", errors);
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

  validateArrays(event, errors);
  validateVerdicts(event, errors);
  validateChainFields(event, errors);

  return { valid: errors.length === 0, errors };
}

function validateArrays(event, errors) {
  if ("denied_egress" in event) {
    if (!Array.isArray(event.denied_egress)) {
      errors.push("denied_egress, if present, must be an array");
    } else {
      event.denied_egress.forEach((d, i) => {
        if (!isPlainObject(d)) {
          errors.push(`denied_egress[${i}] must be an object`);
          return;
        }
        checkStrKeys(
          d,
          new Set(["target", "protocol", "reason"]),
          `denied_egress[${i}]`,
          errors
        );
        if (typeof d.target !== "string" || d.target.length < 1)
          errors.push(`denied_egress[${i}].target is required (non-empty)`);
        if (typeof d.reason !== "string" || d.reason.length < 1)
          errors.push(`denied_egress[${i}].reason is required (non-empty)`);
        if ("protocol" in d && (typeof d.protocol !== "string" || d.protocol.length < 1))
          errors.push(`denied_egress[${i}].protocol, if present, must be non-empty`);
      });
    }
  }

  if ("held_actions" in event) {
    if (!Array.isArray(event.held_actions)) {
      errors.push("held_actions, if present, must be an array");
    } else {
      event.held_actions.forEach((h, i) => {
        if (!isPlainObject(h)) {
          errors.push(`held_actions[${i}] must be an object`);
          return;
        }
        checkStrKeys(
          h,
          new Set(["action_class", "target_tag", "reason"]),
          `held_actions[${i}]`,
          errors
        );
        if (typeof h.action_class !== "string" || h.action_class.length < 1)
          errors.push(`held_actions[${i}].action_class is required (non-empty)`);
        if (typeof h.reason !== "string" || h.reason.length < 1)
          errors.push(`held_actions[${i}].reason is required (non-empty)`);
        if ("target_tag" in h && (typeof h.target_tag !== "string" || h.target_tag.length < 1))
          errors.push(`held_actions[${i}].target_tag, if present, must be non-empty`);
      });
    }
  }

  if ("mock_responses" in event) {
    if (!Array.isArray(event.mock_responses)) {
      errors.push("mock_responses, if present, must be an array");
    } else {
      event.mock_responses.forEach((m, i) => {
        if (!isPlainObject(m)) {
          errors.push(`mock_responses[${i}] must be an object`);
          return;
        }
        checkStrKeys(
          m,
          new Set(["for_action_class", "shape", "content_hash"]),
          `mock_responses[${i}]`,
          errors
        );
        if (typeof m.for_action_class !== "string" || m.for_action_class.length < 1)
          errors.push(`mock_responses[${i}].for_action_class is required (non-empty)`);
        if (typeof m.shape !== "string" || m.shape.length < 1)
          errors.push(`mock_responses[${i}].shape is required (non-empty)`);
        if ("content_hash" in m && !HASH_RE.test(String(m.content_hash)))
          errors.push(`mock_responses[${i}].content_hash, if present, must be a hex digest`);
      });
    }
  }

  if ("tests" in event) {
    if (!Array.isArray(event.tests)) {
      errors.push("tests, if present, must be an array");
    } else {
      event.tests.forEach((t, i) => {
        if (!isPlainObject(t)) {
          errors.push(`tests[${i}] must be an object`);
          return;
        }
        checkStrKeys(t, new Set(["name", "outcome", "detail"]), `tests[${i}]`, errors);
        if (typeof t.name !== "string" || t.name.length < 1)
          errors.push(`tests[${i}].name is required (non-empty)`);
        if (!["pass", "fail", "skip"].includes(t.outcome))
          errors.push(`tests[${i}].outcome must be one of: pass, fail, skip`);
        if ("detail" in t && typeof t.detail !== "string")
          errors.push(`tests[${i}].detail, if present, must be a string`);
      });
    }
  }
}

function validateVerdicts(event, errors) {
  if ("checker_verdict" in event && !CHECKER_VERDICTS.has(event.checker_verdict))
    errors.push(
      "checker_verdict must be one of PASS/FAIL/BLOCKED/HELD/NOT_VERIFIED/null"
    );
  if ("advisor_verdict" in event && !ADVISOR_VERDICTS.has(event.advisor_verdict))
    errors.push(
      "advisor_verdict must be one of PASS/FAIL/BLOCKED/HOLD/NOT_VERIFIED/null"
    );
  if ("founder_decision" in event && !FOUNDER_DECISIONS.has(event.founder_decision))
    errors.push(
      "founder_decision must be one of APPROVE/REJECT/HOLD/PENDING/null"
    );
}

function validateChainFields(event, errors) {
  if ("seq" in event && !(Number.isInteger(event.seq) && event.seq >= 0))
    errors.push("seq, if present, must be a non-negative integer");
  if (
    "prev_chain_hash" in event &&
    event.prev_chain_hash !== null &&
    !CHAIN_HASH_RE.test(String(event.prev_chain_hash))
  )
    errors.push("prev_chain_hash, if present, must be a 64-hex string or null");
  if ("chain_hash" in event && !CHAIN_HASH_RE.test(String(event.chain_hash)))
    errors.push("chain_hash, if present, must be a 64-hex string");
}

// The proof grade for an event, derived from its source type. Throws if the
// event is not even valid (an invalid event has no defensible grade). Never
// returns "live": cage evidence has no live source type by design.
export function proofGrade(event) {
  const { valid, errors } = validateEvent(event);
  if (!valid) {
    throw new CageEvidenceError("cannot grade an invalid event", errors);
  }
  return PROOF_GRADE_BY_SOURCE[event.source.type];
}

// Deterministic canonical JSON (sorted keys, recursive) over the payload with
// the writer-managed chain fields stripped. This is what the chain hashes.
function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
      .filter((k) => !CHAIN_FIELDS.includes(k))
      .sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function chainHashFor(event, prevChainHash) {
  const input = `${prevChainHash === null ? "" : prevChainHash}|${canonicalize(event)}`;
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// Generic, overridable guard config. A "protected store" is a private runtime
// store we must never clobber with evidence writes. Callers may extend these via
// writeEvent opts (protectedSegments / protectedNamePatterns).
export const DEFAULT_PROTECTED_SEGMENTS = Object.freeze([".private-store"]);
export const DEFAULT_PROTECTED_NAME_PATTERNS = Object.freeze([/-store\.json$/]);

// Refuse any path that would write into a PROTECTED store. LOCAL FILE ONLY.
// Protected patterns are generic and configurable via opts; nothing here is tied
// to any specific product or private-store name.
function assertWritablePath(absPath, opts = {}) {
  const segments = opts.protectedSegments || DEFAULT_PROTECTED_SEGMENTS;
  const namePatterns =
    opts.protectedNamePatterns || DEFAULT_PROTECTED_NAME_PATTERNS;

  const parts = absPath.split(sep);
  for (const seg of segments) {
    if (parts.includes(seg)) {
      throw new CageEvidenceError(
        `refusing to write under a protected store directory "${seg}" (local file only): ${absPath}`
      );
    }
  }
  const base = parts[parts.length - 1] || "";
  for (const re of namePatterns) {
    if (re.test(base)) {
      throw new CageEvidenceError(
        `refusing to write to a protected store filename: ${base}`
      );
    }
  }
}

// Append one validated, chain-stamped event to a LOCAL JSONL ledger.
// Append-only + tamper-evident. Returns the stamped event; throws on rejection.
export function writeEvent(rawEvent, opts = {}) {
  const path = resolve(opts.path || LOCAL_DEFAULT_PATH);
  assertWritablePath(path, opts);

  // The caller must not pre-set chain bookkeeping; the writer owns it.
  for (const f of CHAIN_FIELDS) {
    if (f in rawEvent) {
      throw new CageEvidenceError(
        `caller must not set writer-managed field '${f}'; the ledger stamps it`
      );
    }
  }

  const { valid, errors } = validateEvent(rawEvent);
  if (!valid) {
    throw new CageEvidenceError(`event rejected: ${errors.join("; ")}`, errors);
  }

  const existing = readLedger(path);
  const prev = existing.length ? existing[existing.length - 1] : null;
  const seq = existing.length;
  const prev_chain_hash = prev ? prev.chain_hash : null;
  const chain_hash = chainHashFor(rawEvent, prev_chain_hash);

  const stamped = { ...rawEvent, seq, prev_chain_hash, chain_hash };

  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // Append-only: a single newline-terminated JSON line. Never rewrites.
  appendFileSync(path, JSON.stringify(stamped) + "\n", "utf8");
  return stamped;
}

// Convenience: append many events in order (still one append per event).
export function writeMany(events, opts = {}) {
  const written = [];
  for (const e of events) written.push(writeEvent(e, opts));
  return written;
}

// Read a JSONL ledger back into an array of parsed events. Blank lines skipped.
export function readLedger(path = LOCAL_DEFAULT_PATH) {
  const abs = resolve(path);
  if (!existsSync(abs)) return [];
  return readFileSync(abs, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

// Re-derive the hash chain over a ledger. Returns { ok, brokenAt, reason }.
// brokenAt is the seq of the first event whose chain does not verify (or -1).
export function verifyChain(events) {
  let prev = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.seq !== i) {
      return { ok: false, brokenAt: i, reason: `seq out of order (got ${e.seq})` };
    }
    if ((e.prev_chain_hash ?? null) !== prev) {
      return { ok: false, brokenAt: i, reason: "prev_chain_hash does not link" };
    }
    const expect = chainHashFor(e, prev);
    if (e.chain_hash !== expect) {
      return { ok: false, brokenAt: i, reason: "chain_hash mismatch (tampered)" };
    }
    prev = e.chain_hash;
  }
  return { ok: true, brokenAt: -1, reason: "" };
}

// Summarize a ledger into an honest proof-grade rollup. Cage evidence is never
// live: byGrade has only verifiable/asserted/unverified buckets.
export function summarize(events) {
  const byKind = {};
  const byGrade = { verifiable: 0, asserted: 0, unverified: 0 };
  const bySource = {};
  const totals = { denied_egress: 0, held_actions: 0, mock_responses: 0 };
  for (const e of events) {
    byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    bySource[e.source.type] = (bySource[e.source.type] || 0) + 1;
    byGrade[PROOF_GRADE_BY_SOURCE[e.source.type]]++;
    totals.denied_egress += (e.denied_egress || []).length;
    totals.held_actions += (e.held_actions || []).length;
    totals.mock_responses += (e.mock_responses || []).length;
  }
  return {
    total: events.length,
    byKind,
    bySource,
    byGrade,
    totals,
    live: false,
  };
}
