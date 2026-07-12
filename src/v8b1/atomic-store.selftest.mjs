// FounderGate V8-B VB1 — atomic-store cross-process lock proof (AKIOR #8; checker LOW-1).

import assert from "node:assert/strict";
import { mkdtempSync, existsSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withFileLockSync } from "./atomic-store.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const scratch = () => mkdtempSync(join(tmpdir(), "vb1-lock-"));

console.log("== VB1 atomic-store lock ==");

check("acquires, runs fn, and RELEASES (lock file gone after)", () => {
  const lock = join(scratch(), "s.lock");
  let ran = 0;
  const r = withFileLockSync(lock, () => { assert.equal(existsSync(lock), true); ran++; return 42; });
  assert.equal(r, 42); assert.equal(ran, 1); assert.equal(existsSync(lock), false);
});

check("MUTUAL EXCLUSION: a second acquire while the lock is HELD times out (serialize writers)", () => {
  const lock = join(scratch(), "s.lock");
  withFileLockSync(lock, () => {
    assert.throws(() => withFileLockSync(lock, () => { throw new Error("must not run"); }, { timeoutMs: 60, retryMs: 10 }), /lock timeout/);
  });
  assert.equal(existsSync(lock), false); // released after the outer fn returns
});

check("a STALE lock (holder died) is reclaimed", () => {
  const lock = join(scratch(), "s.lock");
  writeFileSync(lock, "dead holder");
  utimesSync(lock, new Date(0), new Date(0)); // age it far into the past
  let ran = 0;
  withFileLockSync(lock, () => { ran++; }, { staleMs: 1000 });
  assert.equal(ran, 1);
  assert.equal(existsSync(lock), false);
});

check("the lock RELEASES even when fn throws (no deadlock)", () => {
  const lock = join(scratch(), "s.lock");
  assert.throws(() => withFileLockSync(lock, () => { throw new Error("boom"); }), /boom/);
  assert.equal(existsSync(lock), false);
});

console.log(`\nV8B1-ATOMIC-STORE: PASS (${pass} checks)`);
