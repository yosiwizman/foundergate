// FounderGate V8-B VB2 — CTO queue: DATA MODEL only (NON-EXECUTING scaffold).
//
// Plain English: this is the pure, zero-dependency data shape + accessors for the
// founder-visible "CTO queue" — the list of work items the Project Guide's drafts are
// ROUTED into. A queued item is a founder-visible RECORD, never an auto-action. This
// module builds and reads that record and NOTHING ELSE:
//   - NO executor, NO act/approve/run/commit/dispatch path lives here.
//   - NO side effects: no fs, no network, no child_process, no clock. Time is DATA the
//     caller supplies (created_at is a string, never read from the system clock) — VB2
//     never invents state (Law 54).
//   - Every mutator is PURE: it returns a NEW queue object and never mutates its input
//     (or anything outside the returned object).
//   - Data-class boundary (build contract §"Forbidden scope"): a queue item's data class
//     may never be SECRET or a blocked class — validateItem REJECTS those so
//     SECRET/blocked content can never enter a queued item.
//
// The *act* edge for anything queued here depends on VB3 (Gate/Witness Engine wiring),
// which does not exist under this scaffold. There is deliberately no path to it here.

export const SCHEMA_VERSION = "1.0.0";
export const UNKNOWN = "UNKNOWN";

// Status is an honest enum. "queued" waits, "blocked" is gated/not-clear, "done" is
// recorded-complete, and UNKNOWN is said out loud when the evidence does not show a
// status (Law 54) — VB2 never guesses a status.
export const STATUS = Object.freeze(["queued", "blocked", "done", UNKNOWN]);

// Kind describes what the founder-visible item IS — all read-only records; none is an
// instruction to act. (run_draft/guide_draft come from V8-A4 Guide drafts being routed.)
export const KIND = Object.freeze(["run_draft", "guide_draft", "review", "note"]);

// Data class of the item's content. Only non-sensitive classes may ever be queued.
// SECRET / BLOCKED / UNKNOWN-blocked content is refused at validation — it must never
// enter a queue item (build contract forbidden-scope: data-class boundary stands).
export const DATA_CLASS = Object.freeze(["PUBLIC", "INTERNAL"]);
export const FORBIDDEN_DATA_CLASS = Object.freeze(["SECRET", "BLOCKED", "UNKNOWN"]);

const ID_RE = /^q[0-9a-f]{12}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export class QueueError extends Error {
  constructor(message) { super(message); this.name = "QueueError"; }
}

// create-empty-queue — a schema-shaped, empty queue. Pure; no clock, no io.
export function emptyQueue() {
  return { schema_version: SCHEMA_VERSION, items: [] };
}

// validate-item — pure predicate returning { valid, errors }. Never throws, never acts.
// created_at MUST be caller-supplied DATA (an ISO string) — VB2 never stamps time.
export function validateItem(item) {
  const errors = [];
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return { valid: false, errors: ["item must be a plain object"] };
  }
  if (typeof item.id !== "string" || !ID_RE.test(item.id)) {
    errors.push("id must match ^q[0-9a-f]{12}$");
  }
  if (typeof item.title !== "string" || item.title.trim() === "") {
    errors.push("title must be a non-empty string");
  }
  if (!KIND.includes(item.kind)) {
    errors.push(`kind must be one of ${KIND.join("/")}`);
  }
  if (!STATUS.includes(item.status)) {
    errors.push(`status must be one of ${STATUS.join("/")}`);
  }
  // created_at is DATA the caller supplies — an ISO-8601 Zulu string, never a clock read.
  if (typeof item.created_at !== "string" || !ISO_RE.test(item.created_at)) {
    errors.push("created_at must be a caller-supplied ISO-8601 Zulu string (not a clock read)");
  }
  if (typeof item.summary !== "string" || item.summary.trim() === "") {
    errors.push("summary must be a non-empty plain-English string");
  }
  if (typeof item.requested_by !== "string" || item.requested_by.trim() === "") {
    errors.push("requested_by must be a non-empty string");
  }
  // Data-class boundary: SECRET / BLOCKED / UNKNOWN-blocked content may NEVER be queued.
  if (FORBIDDEN_DATA_CLASS.includes(item.data_class)) {
    errors.push(`data_class ${item.data_class} is forbidden in a queue item (SECRET/blocked content must never enter the queue)`);
  } else if (!DATA_CLASS.includes(item.data_class)) {
    errors.push(`data_class must be one of ${DATA_CLASS.join("/")}`);
  }
  return { valid: errors.length === 0, errors };
}

// Build a normalised, frozen item record from validated fields. Copies only the known
// keys — no ambient content, no functions, no act handles ever ride along.
function normaliseItem(item) {
  return Object.freeze({
    id: item.id,
    title: item.title,
    kind: item.kind,
    status: item.status,
    created_at: item.created_at,
    summary: item.summary,
    requested_by: item.requested_by,
    data_class: item.data_class,
  });
}

// add-item — PURE: returns a NEW queue with the item appended. Never mutates the input
// queue (or anything else). Rejects an invalid item and a duplicate id. No side effects.
export function addItem(queue, item) {
  assertQueue(queue);
  const { valid, errors } = validateItem(item);
  if (!valid) throw new QueueError(`invalid queue item: ${errors.join("; ")}`);
  if (queue.items.some((i) => i.id === item.id)) {
    throw new QueueError(`duplicate item id: ${item.id}`);
  }
  return {
    schema_version: queue.schema_version,
    items: [...queue.items.map(normaliseItem), normaliseItem(item)],
  };
}

// list-items — read-only: a fresh array of the item records (callers can't mutate ours).
export function listItems(queue) {
  assertQueue(queue);
  return queue.items.map(normaliseItem);
}

// get-item — read-only lookup by id; returns the record or null (never invents one).
export function getItem(queue, id) {
  assertQueue(queue);
  const found = queue.items.find((i) => i.id === id);
  return found ? normaliseItem(found) : null;
}

function assertQueue(queue) {
  if (queue === null || typeof queue !== "object" || !Array.isArray(queue.items)) {
    throw new QueueError("not a queue object");
  }
}
