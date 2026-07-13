// SHWL §4.1 lock-dir — the atomic exclusivity primitive: exactly one winner; orphan handling.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { acquireLock, lockHeld, removeLock, lockDirPath } from "./lock.mjs";
import { harness, mkRoot } from "./_testkit.mjs";

const t = harness("SHWL lock-dir (§4.1)");

t.check("mkdir-atomic: exactly ONE concurrent acquire wins", () => {
  const root = mkRoot("lock");
  const first = acquireLock(root);
  const second = acquireLock(root);
  const third = acquireLock(root);
  assert.equal(first, true, "first acquire wins");
  assert.equal(second, false, "second gets EEXIST -> loses");
  assert.equal(third, false, "third loses too");
  assert.equal(lockHeld(root), true);
  assert.ok(existsSync(lockDirPath(root)));
});

t.check("the lock-dir (not lease.json) is the acquisition act; removeLock frees it", () => {
  const root = mkRoot("lock");
  assert.equal(lockHeld(root), false, "fresh root is not held");
  acquireLock(root);
  assert.equal(lockHeld(root), true);
  assert.equal(removeLock(root), true);
  assert.equal(lockHeld(root), false);
  // after free, a new acquire wins again
  assert.equal(acquireLock(root), true);
});

t.check("removing an absent lock is a no-op (idempotent)", () => {
  const root = mkRoot("lock");
  assert.equal(removeLock(root), false);
});

t.done("SHWL-LOCK-SELFTEST");
