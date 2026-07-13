// SHWL §9 E/F — FounderGate integration: soak launcher + every heavy entry point gated.

import assert from "node:assert/strict";
import {
  foundergateLaunchSoak, foundergateHeavyOps, foundergateGuard, FOUNDERGATE_PROJECT,
} from "./foundergate-integration.mjs";
import { simulateActiveOwnerLease } from "./akior-adoption.mjs";
import { readLease } from "./lease-store.mjs";
import { STATUS } from "./constants.mjs";
import { harness, mkRoot, fixedIdentity, ALIVE, T0 } from "./_testkit.mjs";

const t = harness("SHWL FounderGate integration (§9 E/F)");
const BOOT = "boot_TEST_1";
const id = fixedIdentity({ boot_id: BOOT });

t.check("E — FounderGate soak launcher stamps owner_project=foundergate and activates", () => {
  const root = mkRoot("fg");
  const h = foundergateLaunchSoak({ root, run_id: "fg1", identity: id, now: T0, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  assert.equal(h.acquired, true);
  const lease = readLease(root);
  assert.equal(lease.parsed.owner_project, FOUNDERGATE_PROJECT);
  assert.equal(lease.parsed.status, STATUS.ACTIVE);
  h.release({ now: T0 + 1000 });
});

t.check("F — EVERY FounderGate heavy entry point REFUSES while another run owns the host", () => {
  const root = mkRoot("fg");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: id, now: T0 });
  const names = Object.keys(foundergateHeavyOps);
  assert.ok(names.length >= 8, "all §5 entry points present");
  for (const name of names) {
    const r = foundergateHeavyOps[name]({ root, requester: null, currentBootId: BOOT, now: T0 + 1000, override: null, isAlive: ALIVE });
    assert.equal(r.allowed, false, `${name} must REFUSE while held`);
    assert.equal(r.decision, "REFUSE");
    assert.ok(/owns this Mac/.test(r.message), `${name} gives a plain-English refusal`);
  }
});

t.check("F — heavy entry points ALLOW on a free host", () => {
  const root = mkRoot("fg");
  const r = foundergateHeavyOps.build({ root, currentBootId: BOOT, now: T0 });
  assert.equal(r.allowed, true);
});

t.check("foundergateGuard: an unknown op is treated as HEAVY and refused while held", () => {
  const root = mkRoot("fg");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: id, now: T0 });
  const r = foundergateGuard({ root, op: "totally.new.heavy.thing", currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.classification, "HEAVY");
  assert.equal(r.allowed, false);
});

t.done("SHWL-FOUNDERGATE-INTEGRATION-SELFTEST");
