// FounderGate V8-B VB2 — CTO queue data-model proof: schema validation + round-trips.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  emptyQueue, addItem, listItems, getItem, validateItem,
  SCHEMA_VERSION, STATUS, KIND, DATA_CLASS, FORBIDDEN_DATA_CLASS, UNKNOWN, QueueError,
  ALLOWED_ITEM_KEYS, MAX_LEN,
} from "./cto-queue.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };

// A well-formed item. created_at is DATA the caller supplies — never a clock read.
function goodItem(over = {}) {
  return {
    id: "q0123456789ab",
    title: "Route Guide draft: tighten onboarding copy",
    kind: "guide_draft",
    status: "queued",
    created_at: "2026-07-12T00:00:00Z",
    summary: "The Guide drafted three copy edits; founder to review before anything runs.",
    requested_by: "project-guide",
    data_class: "INTERNAL",
    ...over,
  };
}

console.log("== VB2 CTO queue — data model ==");

check("emptyQueue is schema-shaped: version + empty items", () => {
  const q = emptyQueue();
  assert.equal(q.schema_version, SCHEMA_VERSION);
  assert.deepEqual(q.items, []);
});

check("validateItem accepts a well-formed item and reports no errors", () => {
  const { valid, errors } = validateItem(goodItem());
  assert.equal(valid, true);
  assert.deepEqual(errors, []);
});

check("validateItem rejects each malformed field (id/title/kind/status/created_at/summary/requested_by)", () => {
  assert.equal(validateItem(goodItem({ id: "nope" })).valid, false);
  assert.equal(validateItem(goodItem({ title: "" })).valid, false);
  assert.equal(validateItem(goodItem({ kind: "explode" })).valid, false);
  assert.equal(validateItem(goodItem({ status: "running" })).valid, false);
  assert.equal(validateItem(goodItem({ created_at: 1720742400000 })).valid, false); // a clock read, not DATA
  assert.equal(validateItem(goodItem({ created_at: "yesterday" })).valid, false);
  assert.equal(validateItem(goodItem({ summary: "" })).valid, false);
  assert.equal(validateItem(goodItem({ requested_by: "" })).valid, false);
  assert.equal(validateItem(null).valid, false);
});

check("data-class boundary: SECRET / BLOCKED / UNKNOWN-blocked content is REFUSED", () => {
  for (const bad of FORBIDDEN_DATA_CLASS) {
    const { valid, errors } = validateItem(goodItem({ data_class: bad }));
    assert.equal(valid, false, `${bad} must be refused`);
    assert.ok(errors.some((e) => e.includes(bad)), `error must name ${bad}`);
  }
  // and only PUBLIC/INTERNAL are allowed
  for (const ok of DATA_CLASS) assert.equal(validateItem(goodItem({ data_class: ok })).valid, true);
});

check("status enum includes an honest UNKNOWN (Law 54 — never guess a status)", () => {
  assert.ok(STATUS.includes(UNKNOWN));
  assert.equal(validateItem(goodItem({ status: UNKNOWN })).valid, true);
});

check("addItem returns a NEW queue and does NOT mutate the input (pure)", () => {
  const q0 = emptyQueue();
  const before = JSON.stringify(q0);
  const q1 = addItem(q0, goodItem());
  assert.notEqual(q1, q0, "must return a new object");
  assert.equal(JSON.stringify(q0), before, "input queue must be untouched");
  assert.equal(q0.items.length, 0);
  assert.equal(q1.items.length, 1);
});

check("addItem works on a deeply-frozen input queue (proves no in-place mutation)", () => {
  const q0 = Object.freeze({ ...emptyQueue(), items: Object.freeze([]) });
  const q1 = addItem(q0, goodItem());
  assert.equal(q1.items.length, 1);
});

check("add/list/get round-trip: two items, listed in order, fetched by id", () => {
  let q = emptyQueue();
  q = addItem(q, goodItem({ id: "q000000000001", title: "First" }));
  q = addItem(q, goodItem({ id: "q000000000002", title: "Second", status: "blocked" }));
  const items = listItems(q);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => i.title), ["First", "Second"]);
  assert.equal(getItem(q, "q000000000002").status, "blocked");
  assert.equal(getItem(q, "q000000000001").title, "First");
});

check("getItem returns null for an unknown id (never invents an item — Law 54)", () => {
  const q = addItem(emptyQueue(), goodItem());
  assert.equal(getItem(q, "qffffffffffff"), null);
});

check("addItem rejects an invalid item and a duplicate id (throws QueueError)", () => {
  const q = addItem(emptyQueue(), goodItem());
  assert.throws(() => addItem(q, goodItem({ kind: "bad" })), QueueError);
  assert.throws(() => addItem(q, goodItem()), /duplicate item id/);
});

check("returned items are frozen — a caller cannot mutate the queue through them", () => {
  const q = addItem(emptyQueue(), goodItem());
  const it = listItems(q)[0];
  assert.throws(() => { it.status = "done"; }, TypeError);
  // the stored item is unchanged
  assert.equal(getItem(q, it.id).status, "queued");
});

check("LOW-2: validateItem rejects an item carrying an unknown own-key (matches additionalProperties:false)", () => {
  const withExtra = validateItem(goodItem({ __act: "execute", evil: 1 }));
  assert.equal(withExtra.valid, false);
  assert.ok(withExtra.errors.some((e) => e.includes("unknown key")), "must name the unknown key");
  // and addItem refuses it too
  assert.throws(() => addItem(emptyQueue(), goodItem({ nested: { a: 1 } })), QueueError);
  // the allowed set is exactly the eight schema keys
  assert.deepEqual(
    [...ALLOWED_ITEM_KEYS].sort(),
    ["created_at", "data_class", "id", "kind", "requested_by", "status", "summary", "title"],
  );
});

check("LOW-3: validateItem rejects over-long string fields (maxLength caps)", () => {
  assert.equal(validateItem(goodItem({ summary: "x".repeat(MAX_LEN.summary + 1) })).valid, false);
  assert.equal(validateItem(goodItem({ title: "x".repeat(MAX_LEN.title + 1) })).valid, false);
  assert.equal(validateItem(goodItem({ requested_by: "x".repeat(MAX_LEN.requested_by + 1) })).valid, false);
  // a field exactly at the cap is still valid
  assert.equal(validateItem(goodItem({ summary: "x".repeat(MAX_LEN.summary) })).valid, true);
});

check("LOW-3: schema maxLength matches the code caps (no code/schema divergence)", () => {
  const schema = JSON.parse(readFileSync(join(HERE, "schemas", "cto_queue.schema.json"), "utf8"));
  const p = schema.properties.items.items.properties;
  assert.equal(p.summary.maxLength, MAX_LEN.summary);
  assert.equal(p.title.maxLength, MAX_LEN.title);
  assert.equal(p.requested_by.maxLength, MAX_LEN.requested_by);
  assert.equal(p.id.maxLength, MAX_LEN.id);
  assert.equal(p.created_at.maxLength, MAX_LEN.created_at);
});

check("the queue conforms to its committed JSON schema", () => {
  const schema = JSON.parse(readFileSync(join(HERE, "schemas", "cto_queue.schema.json"), "utf8"));
  assert.deepEqual(schema.required.sort(), ["items", "schema_version"]);
  const itemSchema = schema.properties.items.items;
  assert.deepEqual(
    itemSchema.required.sort(),
    ["created_at", "data_class", "id", "kind", "requested_by", "status", "summary", "title"],
  );
  // enums agree between code and schema
  assert.deepEqual(itemSchema.properties.status.enum, STATUS);
  assert.deepEqual(itemSchema.properties.kind.enum, KIND);
  assert.deepEqual(itemSchema.properties.data_class.enum, DATA_CLASS);
  // a real item satisfies the schema's patterns
  const q = addItem(emptyQueue(), goodItem());
  const it = getItem(q, "q0123456789ab");
  assert.ok(new RegExp(itemSchema.properties.id.pattern).test(it.id));
  assert.ok(new RegExp(itemSchema.properties.created_at.pattern).test(it.created_at));
});

console.log(`\nV8B2-CTO-QUEUE-SELFTEST: PASS (${pass} checks)`);
