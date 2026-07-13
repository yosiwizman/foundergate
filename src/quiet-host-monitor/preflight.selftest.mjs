// L4 — quiet-host preflight integration self-test.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af
// §4.2 (quiet-host preflight) + §5 (heavy ops MUST call the shared guard and REFUSE, not warn).
// Proves the HEAVY preflight entry point CALLS the ACCEPTED src/shwl guard and REFUSES when the
// lease isn't owned/quiet; ALLOWS on a free host or exact-owner soak activity.

import assert from "node:assert/strict";

import { quietHostPreflight, makeQuietHostPreflight } from "./preflight.mjs";
import { mkRoot, seedActiveLease, harness, T0, fixedIdentity, CAP } from "./_kit.mjs";

const t = harness("L4 quiet-host preflight (§4.2/§5)");

// ---------------------------------------------------------------------------------------------
// 1) REFUSES when the lease isn't owned — a DIFFERENT run holds an ACTIVE lease on this host.
// ---------------------------------------------------------------------------------------------
t.check("preflight REFUSES when the host is ACTIVE-held by a DIFFERENT run (not owned/quiet)", () => {
  const root = mkRoot("pf");
  const id = fixedIdentity();
  seedActiveLease(root, { run_id: "run_other_owner", identity: id, now: T0, holdLock: true });

  const res = quietHostPreflight({
    root, op: "soak", requester: null, currentBootId: id.boot_id,
    now: T0 + 1_000, isAlive: () => true,
  });
  assert.equal(res.quiet, false);
  assert.equal(res.allowed, false);
  assert.equal(res.refused, true);
  assert.equal(res.effective, "ACTIVE_HELD");
  assert.ok(res.message.length > 0, "a plain-English founder message is returned");
});

// ---------------------------------------------------------------------------------------------
// 2) REFUSES in RECOVERY_REQUIRED (owner gone) — not owned/quiet.
// ---------------------------------------------------------------------------------------------
t.check("preflight REFUSES when the host is in recovery (owner not alive)", () => {
  const root = mkRoot("pf");
  const id = fixedIdentity();
  seedActiveLease(root, { run_id: "run_dead_owner", identity: id, now: T0, holdLock: true });

  const res = quietHostPreflight({
    root, op: "soak", requester: null, currentBootId: id.boot_id,
    now: T0 + 1_000, isAlive: () => false, // owner disappeared -> RECOVERY_REQUIRED
  });
  assert.equal(res.quiet, false);
  assert.equal(res.allowed, false);
  assert.equal(res.effective, "RECOVERY_REQUIRED");
});

// ---------------------------------------------------------------------------------------------
// 3) ALLOWS on a genuinely FREE host (no lease, no lock) — quiet:true / MAY_ACQUIRE.
// ---------------------------------------------------------------------------------------------
t.check("preflight ALLOWS on a free host (MAY_ACQUIRE)", () => {
  const root = mkRoot("pf");
  const res = quietHostPreflight({ root, op: "soak", now: T0, isAlive: () => true });
  assert.equal(res.quiet, true);
  assert.equal(res.allowed, true);
  assert.equal(res.decision, "MAY_ACQUIRE");
});

// ---------------------------------------------------------------------------------------------
// 4) ALLOWS for the EXACT owner presenting a matching capability (declared soak activity).
// ---------------------------------------------------------------------------------------------
t.check("preflight ALLOWS the exact owner (matching capability) — declared soak activity", () => {
  const root = mkRoot("pf");
  const id = fixedIdentity();
  const run_id = "run_owner_self";
  seedActiveLease(root, { run_id, identity: id, now: T0, holdLock: true });

  const res = quietHostPreflight({
    root, op: "soak", requester: { run_id, capability: CAP },
    currentBootId: id.boot_id, now: T0 + 1_000, isAlive: () => true,
  });
  assert.equal(res.quiet, true);
  assert.equal(res.allowed, true);
  assert.equal(res.decision, "ALLOW");
});

// ---------------------------------------------------------------------------------------------
// 5) It is a HEAVY entry point: it actually CALLS the shared guard, passing the heavy op through.
// ---------------------------------------------------------------------------------------------
t.check("HEAVY entry point: quietHostPreflight imports+calls the shared guard with the op", () => {
  const root = mkRoot("pf");
  let seen = null;
  const spyGuard = (args) => { seen = args; return { allowed: false, decision: "REFUSE", effective: "ACTIVE_HELD", message: "held", classification: "HEAVY" }; };
  const res = quietHostPreflight({ root, op: "soak", now: T0, guard: spyGuard });
  assert.ok(seen, "the shared guard was called");
  assert.equal(seen.op, "soak");
  assert.equal(seen.root, root);
  assert.equal(res.refused, true);
});

// ---------------------------------------------------------------------------------------------
// 6) makeQuietHostPreflight yields a ZERO-ARG predicate with the launcher-compatible { quiet } shape.
// ---------------------------------------------------------------------------------------------
t.check("makeQuietHostPreflight returns a launcher-compatible zero-arg predicate", () => {
  const root = mkRoot("pf");
  const pf = makeQuietHostPreflight({ root, op: "soak", now: T0, isAlive: () => true });
  const out = pf();
  assert.equal(typeof out.quiet, "boolean");
  assert.equal(out.quiet, true, "free host -> quiet predicate passes (usable by launchSoak)");
});

t.done("L4-QUIET-HOST-PREFLIGHT-SELFTEST");
