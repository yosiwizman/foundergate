// FounderGate — cage-evidence-ledger selftest.
//
// SCAFFOLD ONLY — final cage claims require independent Checker + Advisor
// verification; NOT self-certified; caged/held is NOT live proof.
//
// Deterministic, hermetic, no network, no provider access. Writes ONLY into a
// throwaway OS temp dir (never a protected store, never the committed
// sample). Exits non-zero on the first failed assertion.
//
// Proves:
//   1. Enums load from the schema (9 kinds, 8 source types; no "live" grade).
//   2. Every committed valid fixture validates; every invalid fixture is rejected.
//   3. THE LAW: a sourceless event (and an empty-ref source) is REJECTED — the
//      writer throws and never writes it.
//   4. The writer is append-only (a second write keeps the first line).
//   5. The ledger is hash-chained + tamper-evident (verifyChain catches edits).
//   6. The writer refuses caller-set chain fields, and refuses protected store
//      paths (directory segment and store-like filename).
//   7. The committed sample matches a fresh deterministic rebuild (no churn) and
//      summarizes honestly (never live).

import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateEvent,
  proofGrade,
  writeEvent,
  writeMany,
  readLedger,
  verifyChain,
  summarize,
  EVENT_KINDS,
  SOURCE_TYPES,
  PROOF_GRADE_BY_SOURCE,
  CHAIN_FIELDS,
  CageEvidenceError,
  LOCAL_DEFAULT_PATH,
} from "./cage-evidence-ledger.mjs";
import { SAMPLE_EVENTS, buildSample } from "./build-cage-evidence-sample.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const VALID_DIR = join(HERE, "fixtures", "valid");
const INVALID_DIR = join(HERE, "fixtures", "invalid");

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  PASS: ${name}`);
}

const dir = mkdtempSync(join(tmpdir(), "foundergate-cage-"));
const ledger = join(dir, "ledger.jsonl");

function baseEvent(overrides = {}) {
  return {
    id: "t-1",
    ts: "2026-07-04T05:00:00Z",
    kind: "cage_opened",
    cage_id: "outer-cage.test",
    policy_hash: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    source: { type: "cage_log", ref: "cage://test/open" },
    ...overrides,
  };
}

try {
  // 1. Enums + grades load from the schema; no "live" grade exists.
  check("schema exposes 9 kinds + 8 source types; no live grade", () => {
    assert.equal(EVENT_KINDS.length, 9);
    assert.equal(SOURCE_TYPES.length, 8);
    for (const s of SOURCE_TYPES) {
      assert.ok(PROOF_GRADE_BY_SOURCE[s], `grade missing for source ${s}`);
      assert.notEqual(PROOF_GRADE_BY_SOURCE[s], "live");
    }
    assert.ok(!SOURCE_TYPES.includes("live_provider"));
  });

  // 2. Every valid fixture validates; every invalid fixture is rejected.
  check("all valid fixtures validate + grade non-live", () => {
    const files = readdirSync(VALID_DIR).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 9, "expected the full 9-kind sample");
    for (const f of files) {
      const e = JSON.parse(readFileSync(join(VALID_DIR, f), "utf8"));
      const { valid, errors } = validateEvent(e);
      assert.ok(valid, `valid fixture ${f} rejected: ${errors.join("; ")}`);
      assert.ok(["verifiable", "asserted", "unverified"].includes(proofGrade(e)));
    }
  });

  check("valid fixtures cover every event kind", () => {
    const seen = new Set(SAMPLE_EVENTS.map((e) => e.kind));
    for (const k of EVENT_KINDS) assert.ok(seen.has(k), `kind not covered: ${k}`);
  });

  check("every invalid fixture is rejected", () => {
    const files = readdirSync(INVALID_DIR).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 6, "expected a spread of invalid fixtures");
    for (const f of files) {
      const e = JSON.parse(readFileSync(join(INVALID_DIR, f), "utf8"));
      assert.equal(validateEvent(e).valid, false, `invalid fixture ${f} slipped through`);
    }
  });

  // 3. THE LAW: sourceless + empty-ref are rejected by validate AND write.
  check("sourceless event is rejected by validateEvent", () => {
    const e = baseEvent();
    delete e.source;
    const { valid, errors } = validateEvent(e);
    assert.equal(valid, false);
    assert.ok(errors.some((x) => /source is required/.test(x)));
  });

  check("sourceless event is REFUSED by writeEvent (never written)", () => {
    const e = baseEvent();
    delete e.source;
    assert.throws(
      () => writeEvent(e, { path: ledger }),
      (err) => err instanceof CageEvidenceError && /source/.test(err.message)
    );
    assert.equal(readLedger(ledger).length, 0);
  });

  check("empty-ref source is rejected", () => {
    const e = baseEvent({ source: { type: "cage_log", ref: "" } });
    assert.equal(validateEvent(e).valid, false);
    assert.throws(() => writeEvent(e, { path: ledger }), CageEvidenceError);
  });

  // 4. Append-only.
  check("writeEvent appends (does not truncate prior lines)", () => {
    writeEvent(baseEvent({ id: "a-1" }), { path: ledger });
    writeEvent(baseEvent({ id: "a-2", ts: "2026-07-04T05:01:00Z" }), { path: ledger });
    const lines = readLedger(ledger);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].id, "a-1");
    assert.equal(lines[1].id, "a-2");
  });

  // 5. Hash chain + tamper evidence.
  check("writer stamps seq + chain fields, and the chain verifies", () => {
    const lines = readLedger(ledger);
    assert.equal(lines[0].seq, 0);
    assert.equal(lines[0].prev_chain_hash, null);
    assert.equal(lines[1].seq, 1);
    assert.equal(lines[1].prev_chain_hash, lines[0].chain_hash);
    assert.match(lines[0].chain_hash, /^[a-f0-9]{64}$/);
    const v = verifyChain(lines);
    assert.ok(v.ok, `chain should verify: ${v.reason}`);
  });

  check("tampering with a written event breaks verifyChain", () => {
    const p = join(dir, "tamper.jsonl");
    writeMany([baseEvent({ id: "c-1" }), baseEvent({ id: "c-2", ts: "2026-07-04T05:02:00Z" })], { path: p });
    const lines = readLedger(p);
    // Edit the payload of line 0 without recomputing the chain (an attacker edit).
    lines[0].note = "sneaky edit";
    writeFileSync(p, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    const v = verifyChain(readLedger(p));
    assert.equal(v.ok, false);
    assert.equal(v.brokenAt, 0);
  });

  // 6. Guardrails.
  check("writer refuses caller-set chain fields", () => {
    for (const f of CHAIN_FIELDS) {
      const e = baseEvent();
      e[f] = f === "seq" ? 0 : "0".repeat(64);
      assert.throws(
        () => writeEvent(e, { path: join(dir, "g.jsonl") }),
        (err) => err instanceof CageEvidenceError && new RegExp(f).test(err.message)
      );
    }
  });

  check("writer refuses a path under a protected store directory (default)", () => {
    assert.throws(
      () => writeEvent(baseEvent(), { path: join(dir, ".private-store", "x.jsonl") }),
      (err) => err instanceof CageEvidenceError && /protected store directory/.test(err.message)
    );
  });

  check("writer refuses a protected store filename (default + configured)", () => {
    assert.throws(
      () => writeEvent(baseEvent(), { path: join(dir, "task-store.json") }),
      (err) => err instanceof CageEvidenceError && /protected store filename/.test(err.message)
    );
    assert.throws(
      () =>
        writeEvent(baseEvent(), {
          path: join(dir, "custom-vault", "x.jsonl"),
          protectedSegments: ["custom-vault"],
        }),
      CageEvidenceError
    );
  });

  // 7. Determinism + honest, non-live rollup.
  check("committed sample equals a fresh deterministic rebuild (no churn)", () => {
    const fresh = join(dir, "fresh-sample.jsonl");
    buildSample(fresh);
    const committed = readFileSync(LOCAL_DEFAULT_PATH, "utf8");
    const rebuilt = readFileSync(fresh, "utf8");
    assert.equal(rebuilt, committed, "committed sample drifted from a fresh rebuild");
  });

  check("full sample builds + summarizes honestly (never live)", () => {
    const p = join(dir, "sample.jsonl");
    buildSample(p);
    const events = readLedger(p);
    assert.equal(events.length, SAMPLE_EVENTS.length);
    assert.ok(verifyChain(events).ok);
    const roll = summarize(events);
    assert.equal(roll.total, SAMPLE_EVENTS.length);
    assert.equal(roll.live, false);
    assert.ok(roll.byGrade.unverified > 0, "expected unverified (mock) events");
    assert.ok(roll.byGrade.verifiable > 0, "expected verifiable events");
    assert.ok(roll.totals.denied_egress > 0, "expected denied egress recorded");
    assert.ok(roll.totals.held_actions > 0, "expected held actions recorded");
  });

  console.log(`\nFounderGate cage-evidence-ledger selftest: ${passed} checks PASS`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
