// SHWL §5 guard — closed allow-list, REFUSES (not warns); override => permitted + §5.1.

import assert from "node:assert/strict";
import { guardHeavyOp, classifyOp, isHeavy, LIGHT_OPS } from "./guard.mjs";
import { simulateActiveOwnerLease } from "./akior-adoption.mjs";
import { readEvents } from "./lease-store.mjs";
import { isQuietHostEligible } from "./attestation.mjs";
import { harness, mkRoot, fixedIdentity, ALIVE, T0 } from "./_testkit.mjs";

const t = harness("SHWL guard (§5)");
const BOOT = "boot_TEST_1";

t.check("closed allow-list: LIGHT ops known; everything else (incl. unknown) is HEAVY", () => {
  for (const op of LIGHT_OPS) assert.equal(classifyOp(op), "LIGHT");
  assert.equal(classifyOp("build"), "HEAVY");
  assert.equal(classifyOp("some.brand.new.op"), "HEAVY", "unknown/ambiguous => HEAVY (Law-54)");
  assert.equal(isHeavy("git.status"), false);
  assert.equal(isHeavy("docker"), true);
});

t.check("LIGHT op is never gated — allowed even with an ACTIVE lease held by another run", () => {
  const root = mkRoot("guard");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const r = guardHeavyOp({ root, op: "docs.write", requester: null, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, true);
  assert.equal(r.gated, false);
});

t.check("HEAVY op on a FREE host is allowed (MAY_ACQUIRE)", () => {
  const root = mkRoot("guard");
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now: T0, isAlive: ALIVE });
  assert.equal(r.allowed, true);
});

t.check("HEAVY op while HELD by another run => REFUSE (not warn) + plain-English + event", () => {
  const root = mkRoot("guard");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE, expectedFinish: "5:00 PM" });
  assert.equal(r.allowed, false, "REFUSE, not warn");
  assert.equal(r.decision, "REFUSE");
  assert.ok(/owns this Mac/.test(r.message));
  assert.ok(r.event_id);
  assert.equal(readEvents(root).filter((e) => e.kind === "GUARD_REFUSE").length, 1);
});

t.check("HEAVY op by the EXACT owner is allowed (declared soak activity)", () => {
  const root = mkRoot("guard");
  const sim = simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const r = guardHeavyOp({ root, op: "test", requester: { run_id: sim.run_id, capability: sim.capability }, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, true);
  assert.equal(r.effective, "ACTIVE_OWNED");
});

t.check("FOUNDER OVERRIDE during ACTIVE soak: permitted + §5.1 permanent disqualification", () => {
  const root = mkRoot("guard");
  const sim = simulateActiveOwnerLease(root, { owner_project: "akior", run_id: "runQ", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  assert.equal(isQuietHostEligible(root, "runQ"), true);
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE, override: { founder: true } });
  assert.equal(r.allowed, true, "override permits heavy work");
  assert.ok(/permanently disqualifies/.test(r.message));
  assert.equal(isQuietHostEligible(root, "runQ"), false, "QUIET_HOST permanently removed");
  const ov = readEvents(root).filter((e) => e.kind === "OVERRIDE");
  assert.equal(ov.length, 1);
  // never auto-restored: a later normal owner op does not re-enable eligibility
  assert.equal(isQuietHostEligible(root, "runQ"), false);
  void sim;
});

t.done("SHWL-GUARD-SELFTEST");
