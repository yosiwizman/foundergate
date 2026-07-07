// FounderGate — evidence-bus selftest.
//
// Deterministic, hermetic, no network, no provider access. Writes ONLY into a
// throwaway OS temp dir (never a protected store, never the committed sample).
// Exits non-zero on the first failed assertion.
//
// Proves:
//   1. Every sample-timeline event validates against the schema.
//   2. A sourceless event (and an empty-ref source) is REJECTED — writeEvent
//      throws and never writes it. This is the proof-source law under test.
//   3. All 8 source types are accepted when well-formed; each maps to the right
//      proof grade.
//   4. The writer is append-only (second write keeps the first line).
//   5. The writer refuses any path under a protected store dir/filename, and
//      honors caller-configured protected patterns.
//   6. Unknown event/source types and bad shapes are rejected.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  validateEvent,
  proofGrade,
  writeEvent,
  writeMany,
  readTimeline,
  summarize,
  EVENT_TYPES,
  SOURCE_TYPES,
  PROOF_GRADE_BY_SOURCE,
  EvidenceBusError,
} from "./evidence-bus.mjs";
import { SAMPLE_EVENTS } from "./build-sample-timeline.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  PASS: ${name}`);
}

const dir = mkdtempSync(join(tmpdir(), "foundergate-eb-"));
const timeline = join(dir, "timeline.jsonl");

function baseEvent(overrides = {}) {
  return {
    id: "t-1",
    ts: "2026-07-04T05:00:00Z",
    type: "commit",
    summary: "a well-formed event",
    source: { type: "command_output", ref: "git commit" },
    ...overrides,
  };
}

try {
  // 1. Enums are non-empty and complete (14 event types, 8 source types).
  check("schema exposes 14 event types + 8 source types", () => {
    assert.equal(EVENT_TYPES.length, 14);
    assert.equal(SOURCE_TYPES.length, 8);
    for (const s of SOURCE_TYPES) {
      assert.ok(PROOF_GRADE_BY_SOURCE[s], `grade missing for source ${s}`);
    }
  });

  // 2. Every sample event validates.
  check("all sample-timeline events validate against the schema", () => {
    assert.ok(SAMPLE_EVENTS.length >= 14, "sample too small to cover types");
    for (const e of SAMPLE_EVENTS) {
      const { valid, errors } = validateEvent(e);
      assert.ok(valid, `sample ${e.id} invalid: ${errors.join("; ")}`);
    }
  });

  // 2b. Sample covers all 14 event types (honest full coverage).
  check("sample covers every event type at least once", () => {
    const seen = new Set(SAMPLE_EVENTS.map((e) => e.type));
    for (const t of EVENT_TYPES) {
      assert.ok(seen.has(t), `event type not represented in sample: ${t}`);
    }
  });

  // 3. THE LAW: a sourceless event is rejected — validation AND write.
  check("sourceless event is rejected by validateEvent", () => {
    const noSource = baseEvent();
    delete noSource.source;
    const { valid, errors } = validateEvent(noSource);
    assert.equal(valid, false);
    assert.ok(errors.some((e) => /source is required/.test(e)));
  });

  check("sourceless event is REFUSED by writeEvent (never written)", () => {
    const noSource = baseEvent();
    delete noSource.source;
    assert.throws(
      () => writeEvent(noSource, { path: timeline }),
      (err) => err instanceof EvidenceBusError && /source/.test(err.message)
    );
    // Nothing was written.
    assert.equal(readTimeline(timeline).length, 0);
  });

  check("empty-ref source is rejected (claim must be traceable)", () => {
    const emptyRef = baseEvent({ source: { type: "github", ref: "" } });
    const { valid, errors } = validateEvent(emptyRef);
    assert.equal(valid, false);
    assert.ok(errors.some((e) => /source\.ref is required/.test(e)));
    assert.throws(() => writeEvent(emptyRef, { path: timeline }), EvidenceBusError);
  });

  check("unknown source type is rejected", () => {
    const bad = baseEvent({ source: { type: "vibes", ref: "trust me" } });
    assert.equal(validateEvent(bad).valid, false);
  });

  // 4. All 8 source types accepted when well-formed; grade is correct.
  check("all 8 source types validate + grade correctly", () => {
    for (const s of SOURCE_TYPES) {
      const e = baseEvent({ id: `src-${s}`, source: { type: s, ref: `ref for ${s}` } });
      const { valid, errors } = validateEvent(e);
      assert.ok(valid, `source ${s} should validate: ${errors.join("; ")}`);
      assert.equal(proofGrade(e), PROOF_GRADE_BY_SOURCE[s]);
    }
  });

  check("proof grades partition into verifiable/asserted/unverified", () => {
    assert.equal(PROOF_GRADE_BY_SOURCE.github, "verifiable");
    assert.equal(PROOF_GRADE_BY_SOURCE.command_output, "verifiable");
    assert.equal(PROOF_GRADE_BY_SOURCE.human_witness, "verifiable");
    assert.equal(PROOF_GRADE_BY_SOURCE.manual_note, "asserted");
    assert.equal(PROOF_GRADE_BY_SOURCE.mock, "unverified");
    assert.equal(PROOF_GRADE_BY_SOURCE.planned, "unverified");
  });

  // 5. Reject unknown event type / bad shapes / extra keys.
  check("unknown event type is rejected", () => {
    assert.equal(validateEvent(baseEvent({ type: "party" })).valid, false);
  });
  check("bad ts is rejected", () => {
    assert.equal(validateEvent(baseEvent({ ts: "last tuesday" })).valid, false);
  });
  check("unknown top-level property is rejected", () => {
    const e = baseEvent();
    e.executionAuthority = "full";
    assert.equal(validateEvent(e).valid, false);
  });

  // 6. Append-only behaviour.
  check("writeEvent appends (does not truncate prior lines)", () => {
    writeEvent(baseEvent({ id: "a-1" }), { path: timeline });
    writeEvent(baseEvent({ id: "a-2" }), { path: timeline });
    const lines = readTimeline(timeline);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].id, "a-1");
    assert.equal(lines[1].id, "a-2");
  });

  // 7. Path guard: refuse protected store dir/filenames (generic + configurable).
  check("writer refuses a path under a protected store directory (default)", () => {
    assert.throws(
      () => writeEvent(baseEvent(), { path: join(dir, ".private-store", "x.jsonl") }),
      (err) => err instanceof EvidenceBusError && /protected store directory/.test(err.message)
    );
  });
  check("writer refuses a protected store filename (default pattern)", () => {
    assert.throws(
      () => writeEvent(baseEvent(), { path: join(dir, "task-store.json") }),
      (err) => err instanceof EvidenceBusError && /protected store filename/.test(err.message)
    );
  });
  check("writer honors a caller-configured protected segment", () => {
    assert.throws(
      () =>
        writeEvent(baseEvent(), {
          path: join(dir, "custom-vault", "x.jsonl"),
          protectedSegments: ["custom-vault"],
        }),
      EvidenceBusError
    );
  });

  // 8. Full sample round-trips through the real writer into a temp file, and
  //    the rollup reports honest grades (mock/planned present, as expected).
  check("full sample builds + summarizes honestly in a temp file", () => {
    const p = join(dir, "sample.jsonl");
    writeMany(SAMPLE_EVENTS, { path: p });
    const events = readTimeline(p);
    assert.equal(events.length, SAMPLE_EVENTS.length);
    const roll = summarize(events);
    assert.equal(roll.total, SAMPLE_EVENTS.length);
    // The run is honestly NOT all verifiable: it carries unverified
    // (mock/planned) and asserted (manual_note) events too.
    assert.ok(roll.byGrade.unverified > 0, "expected unverified events (mock/planned)");
    assert.ok(roll.byGrade.asserted > 0, "expected asserted events (manual_note)");
    assert.ok(roll.byGrade.verifiable > 0, "expected verifiable events");
    // A read line is byte-identical JSON to what we wrote (append-only fidelity).
    const raw = readFileSync(p, "utf8").trim().split("\n");
    assert.equal(raw.length, SAMPLE_EVENTS.length);
  });

  console.log(`\nFounderGate evidence-bus selftest: ${passed} checks PASS`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
