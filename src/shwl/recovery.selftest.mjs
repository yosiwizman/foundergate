// SHWL §4.3 recovery — fail-closed. Unlock ONLY via mechanical dead-proof or explicit
// founder authorization; expiry/staleness alone NEVER unlock; every unlock logs an event.

import assert from "node:assert/strict";
import { mechanicalDeadProof, founderAuthorizedRecovery } from "./recovery.mjs";
import { simulateActiveOwnerLease } from "./akior-adoption.mjs";
import { readLease, readEvents } from "./lease-store.mjs";
import { lockHeld } from "./lock.mjs";
import { STATUS } from "./constants.mjs";
import { harness, mkRoot, fixedIdentity, ALIVE, DEAD, T0 } from "./_testkit.mjs";

const t = harness("SHWL recovery (§4.3)");

t.check("BOOT MISMATCH => mechanical dead-proof unlocks (recorded, never silent)", () => {
  const root = mkRoot("rec");
  simulateActiveOwnerLease(root, { identity: fixedIdentity({ boot_id: "boot_OLD" }), now: T0 });
  const r = mechanicalDeadProof(root, { currentBootId: "boot_NEW", now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.unlocked, true);
  assert.match(r.proof, /boot mismatch/);
  assert.ok(r.event_id);
  assert.equal(lockHeld(root), false, "lock cleared on unlock");
  const lease = readLease(root);
  assert.equal(lease.parsed.status, STATUS.RELEASED);
  assert.equal(lease.parsed.recovery.resolved_by, "MECHANICAL_DEAD_PROOF");
  assert.equal(readEvents(root).filter((e) => e.kind === "RECOVERY").length, 1);
});

t.check("SAME BOOT + OWNER ALIVE => mechanical dead-proof REFUSES (owner may be alive)", () => {
  const root = mkRoot("rec");
  simulateActiveOwnerLease(root, { identity: fixedIdentity({ boot_id: "boot_SAME" }), now: T0 });
  const r = mechanicalDeadProof(root, { currentBootId: "boot_SAME", now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.unlocked, false);
  assert.equal(r.reason, "OWNER_MAY_BE_ALIVE");
  assert.equal(lockHeld(root), true, "lock stays held — no auto-unlock");
});

t.check("SAME BOOT + OWNER DEAD => mechanical dead-proof unlocks", () => {
  const root = mkRoot("rec");
  simulateActiveOwnerLease(root, { identity: fixedIdentity({ boot_id: "boot_SAME" }), now: T0 });
  const r = mechanicalDeadProof(root, { currentBootId: "boot_SAME", now: T0 + 1000, isAlive: DEAD });
  assert.equal(r.unlocked, true);
  assert.match(r.proof, /no live process/);
  assert.equal(lockHeld(root), false);
});

t.check("FOUNDER recovery WITHOUT explicit authorization REFUSES (no unlock, no event)", () => {
  const root = mkRoot("rec");
  simulateActiveOwnerLease(root, { identity: fixedIdentity(), now: T0 });
  const r = founderAuthorizedRecovery(root, { authorized: false, now: T0 + 1000 });
  assert.equal(r.unlocked, false);
  assert.equal(r.reason, "NO_EXPLICIT_FOUNDER_AUTHORIZATION");
  assert.equal(lockHeld(root), true);
  assert.equal(readEvents(root).filter((e) => e.kind === "RECOVERY").length, 0);
});

t.check("FOUNDER recovery WITH explicit authorization unlocks + append-only event", () => {
  const root = mkRoot("rec");
  simulateActiveOwnerLease(root, { identity: fixedIdentity(), now: T0 });
  const r = founderAuthorizedRecovery(root, { authorized: true, now: T0 + 1000, note: "founder pressed force-recover" });
  assert.equal(r.unlocked, true);
  assert.ok(r.event_id);
  assert.equal(lockHeld(root), false);
  const ev = readEvents(root).filter((e) => e.kind === "RECOVERY");
  assert.equal(ev.length, 1);
  assert.equal(ev[0].resolved_by, "FOUNDER_OVERRIDE");
});

t.done("SHWL-RECOVERY-SELFTEST");
